/**
 * The Infinite Tower — an endless, ever-scaling climb.
 *
 * One boss per floor, each meaner than the last. Unlike the fixed dungeons
 * (which cap out and hand you a medal), the Tower never ends: it just keeps
 * scaling until it finally out-muscles you, at which point your run resets to
 * floor 1 — but your personal-best floor is yours forever, and it's what the
 * leaderboard remembers.
 *
 * Everything here is server-only. Combat is resolved through the shared,
 * seeded `Rng` (never Math.random), so every fight is a pure function of its
 * stored seed and reproducible for audits/replays — same discipline as the
 * arena and dungeons.
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { loadCharacter, toFighter } from "@/lib/data";
import { currencyLedgerOps } from "@/lib/ledger";
import {
  resolveBattle,
  applyLevelUps,
  maxHp,
  CLASSES,
  type Fighter,
  type CharClass,
  type Progression,
} from "@/lib/game";
import { makeRng, randomSeed, pick, type Rng } from "@/lib/rng";
import type { ActionResult } from "@/lib/actions";
import type { Prisma } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Scaling
// ---------------------------------------------------------------------------

/**
 * How hard floor N hits. Deliberately steeper than the dungeons: the dungeon
 * difficulty tops out at ~1.7, whereas the Tower's multiplier climbs forever
 * (+8% per floor) and compounds on top of continuous level growth. Early
 * floors are a warm-up; the tens and twenties separate the heroes from the
 * hero-shaped stains.
 */
export function towerDifficulty(floor: number): number {
  return 1 + (floor - 1) * 0.08;
}

/** The synthetic level of floor N's boss (used for stat growth + display). */
export function towerBossLevel(floor: number): number {
  return Math.max(1, floor);
}

/** Milestone floors get a crown and a little extra menace. */
function isMilestone(floor: number): boolean {
  return floor % 10 === 0;
}

const TOWER_BOSS_NAMES = [
  "the Floor Warden",
  "the Gatekeeper",
  "the Sentinel",
  "the Tollkeeper",
  "the Landing's Bully",
  "the Bannister Wraith",
  "the Step-Counter",
  "the Marble Golem",
  "the Impatient Doorman",
  "the Stairwell Terror",
];

const TOWER_BOSS_TITLES = [
  "Grumbolt",
  "Vex",
  "Ozdrahl",
  "Mistress Cinder",
  "Old Rattlebones",
  "Kregg",
  "The Velvet Menace",
  "Ser Pointyhat",
  "Nagra the Tall",
  "Bumbershoot the Cruel",
];

/**
 * Build the boss guarding floor N. Deterministic given `rng`: same seed →
 * same boss. Stats grow continuously from the class base with both level and
 * the Tower's escalating difficulty, so no two floors feel identical and the
 * curve never flattens.
 */
export function towerBoss(rng: Rng, floor: number): Fighter {
  const level = towerBossLevel(floor);
  const diff = towerDifficulty(floor);
  const bump = isMilestone(floor) ? 1.2 : 1;
  const cls = pick(rng, CLASSES);
  const stat = (base: number) =>
    Math.max(1, Math.round((base + (level - 1) * 3) * diff * bump));

  const name =
    (isMilestone(floor) ? "👑 " : "") +
    `${pick(rng, TOWER_BOSS_TITLES)}, ${pick(rng, TOWER_BOSS_NAMES)}`;

  return {
    name,
    class: cls.id,
    level,
    strength: stat(cls.base.strength),
    dexterity: stat(cls.base.dexterity),
    intelligence: stat(cls.base.intelligence),
    constitution: stat(cls.base.constitution),
    luck: stat(cls.base.luck),
  };
}

/** Spoils for clearing floor N. Pure in `floor` so the UI can preview it. */
export function towerReward(floor: number): { gold: number; xp: number } {
  const level = towerBossLevel(floor);
  // Gold and XP both scale with the floor and accelerate as you climb.
  const gold = Math.round(18 * floor * (1 + floor / 25));
  const xp = Math.round(26 * level * (1 + floor / 30));
  return { gold, xp };
}

// ---------------------------------------------------------------------------
// A cheeky difficulty read-out for the UI
// ---------------------------------------------------------------------------

export interface TowerFloorPreview {
  floor: number;
  boss: Fighter;
  bossHp: number;
  reward: { gold: number; xp: number };
  /** A flavourful "how scary is this" label. */
  menace: string;
}

const MENACE = [
  "a formality",
  "mildly threatening",
  "genuinely dangerous",
  "bring a healer",
  "here be dragons",
  "absolutely unhinged",
];

/**
 * A deterministic preview of a floor's boss for display. Uses a floor-derived
 * seed so the previewed name is stable between renders. (The real fight rolls
 * a fresh seed, exactly like the dungeons.)
 */
export function previewTowerFloor(floor: number): TowerFloorPreview {
  const boss = towerBoss(makeRng(`tower-preview-${floor}`), floor);
  const idx = Math.min(MENACE.length - 1, Math.floor((floor - 1) / 6));
  return {
    floor,
    boss,
    bossHp: maxHp(boss),
    reward: towerReward(floor),
    menace: MENACE[idx],
  };
}

// ---------------------------------------------------------------------------
// Persistence: lazy load/create of the per-hero TowerState
// ---------------------------------------------------------------------------

/**
 * Read a hero's Tower progress WITHOUT creating a row (safe to call from a
 * render). A hero who has never climbed is treated as sitting at floor 1 with
 * no personal best yet.
 */
export async function readTowerState(characterId: string) {
  const state = await prisma.towerState.findUnique({ where: { characterId } });
  return (
    state ?? {
      characterId,
      currentFloor: 1,
      highestFloor: 0,
      runStartedAt: null as Date | null,
    }
  );
}

/** Top climbers for the leaderboard: highest personal-best floor wins. */
export async function loadTowerLeaderboard(limit = 8) {
  const rows = await prisma.towerState.findMany({
    where: { highestFloor: { gt: 0 } },
    orderBy: [{ highestFloor: "desc" }, { updatedAt: "asc" }],
    take: limit,
    include: {
      character: { select: { id: true, name: true, class: true, level: true } },
    },
  });
  return rows.map((r) => ({
    characterId: r.characterId,
    highestFloor: r.highestFloor,
    name: r.character.name,
    class: r.character.class as CharClass,
    level: r.character.level,
  }));
}

// ---------------------------------------------------------------------------
// The climb (server action)
// ---------------------------------------------------------------------------

/**
 * Attempt the current floor. WIN → advance a floor, bank scaling gold + XP,
 * and update your personal best. LOSS → the run ends and you're kicked back to
 * floor 1 (your best stands). All persisted atomically in one transaction.
 */
export async function climbTower(): Promise<ActionResult> {
  "use server";

  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const state = await readTowerState(character.id);
  const floor = state.currentFloor;

  const seed = randomSeed();
  const rng = makeRng(seed);
  const boss = towerBoss(rng, floor);
  const result = resolveBattle(rng, toFighter(character, character.items), boss);
  const label = `🗼 ${boss.name} — Tower floor ${floor}`;

  const ops: Prisma.PrismaPromise<unknown>[] = [];

  // -- Defeat: the run is over. Reset to floor 1, keep the personal best. ----
  if (!result.won) {
    ops.push(
      prisma.towerState.upsert({
        where: { characterId: character.id },
        create: {
          characterId: character.id,
          currentFloor: 1,
          highestFloor: state.highestFloor,
          runStartedAt: new Date(),
        },
        update: { currentFloor: 1, runStartedAt: new Date() },
      }),
      prisma.battleLog.create({
        data: {
          characterId: character.id,
          opponentName: label,
          won: false,
          goldChange: 0,
          seed,
          rounds: JSON.stringify(result.rounds),
        },
      }),
    );
    await prisma.$transaction(ops);
    revalidatePath("/");

    const best = Math.max(state.highestFloor, floor - 1);
    return {
      ok: true,
      message:
        `${boss.name} sent you tumbling down the stairs on floor ${floor}. ` +
        `The run ends here — back to floor 1. Personal best: floor ${best}. 🪜`,
    };
  }

  // -- Victory: bank the spoils and climb higher. ---------------------------
  const reward = towerReward(floor);

  const progression: Progression = {
    class: character.class as CharClass,
    level: character.level,
    experience: character.experience + reward.xp,
    strength: character.strength,
    dexterity: character.dexterity,
    intelligence: character.intelligence,
    constitution: character.constitution,
    luck: character.luck,
  };
  const levels = applyLevelUps(progression);

  const nextFloor = floor + 1;
  const newBest = Math.max(state.highestFloor, floor);
  const beatBest = floor > state.highestFloor;

  ops.push(
    prisma.character.update({
      where: { id: character.id },
      data: {
        gold: character.gold + reward.gold,
        experience: progression.experience,
        level: progression.level,
        strength: progression.strength,
        dexterity: progression.dexterity,
        intelligence: progression.intelligence,
        constitution: progression.constitution,
        luck: progression.luck,
        battleLogs: {
          create: {
            opponentName: label,
            won: true,
            goldChange: reward.gold,
            seed,
            rounds: JSON.stringify(result.rounds),
          },
        },
      },
    }),
    prisma.towerState.upsert({
      where: { characterId: character.id },
      create: {
        characterId: character.id,
        currentFloor: nextFloor,
        highestFloor: newBest,
        runStartedAt: new Date(),
      },
      update: { currentFloor: nextFloor, highestFloor: newBest },
    }),
    ...currencyLedgerOps(
      character.id,
      { gold: character.gold, mushrooms: character.mushrooms },
      { gold: reward.gold },
      "TOWER_REWARD",
    ),
  );

  await prisma.$transaction(ops);
  revalidatePath("/");

  let message = `Floor ${floor} conquered! +${reward.gold} gold, +${reward.xp} XP`;
  if (beatBest) message += ` — new personal best! 🏆`;
  if (levels > 0) message += ` — LEVEL UP to ${progression.level}! ✨`;
  message += ` Onward to floor ${nextFloor}. 🗼`;
  return { ok: true, message };
}
