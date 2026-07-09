import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { loadCharacter, toFighter } from "@/lib/data";
import { primaryValue, maxHp } from "@/lib/game";
import { currencyLedgerOps } from "@/lib/ledger";
import { makeRng, randomSeed, pick, type Rng } from "@/lib/rng";
import type { ActionResult, BattleReplay } from "@/lib/actions";

// ---------------------------------------------------------------------------
// World Bosses — one server-wide colossus that EVERY hero chips away at
// together. There is only ever a single active boss with a huge shared HP pool;
// its bar is common ground. You never fight it alone, and your cut of the spoils
// scales with the damage you personally contributed. Asynchronous, never lonely.
//
// These are GLOBAL rows (not per hero). Rewards route through the currency
// ledger under "WORLDBOSS_REWARD". All spawn/hit randomness flows through a
// seeded Rng so an audit can reproduce any roll. Server-authoritative: the hit
// damage, the daily cap, and the shared-HP guard are all enforced here.
// ---------------------------------------------------------------------------

/** How many swings a single hero gets at the boss per UTC day. Keeps it fair. */
export const WORLDBOSS_DAILY_CAP = 10;

const BOSS_NAMES = [
  "Gorehoof, the World-Ender",
  "Xal'Gruumsh, Eater of Mondays",
  "Bureaucrax, Demon of Paperwork",
  "The Unfathomable Beige",
  "Skarlath the Sky-Cracker",
  "Vermildrax the Ever-Hungry",
  "Mother of Migraines",
  "The Colossus of Complaints",
  "Old Man Winter's Angrier Brother",
  "Throggmortha, Who Chews the Moon",
];

const BOSS_EMOJI = ["👹", "🐲", "👾", "🦑", "😈", "🗿", "🐙", "👺", "🦖", "🐉"];

interface BossDraft {
  name: string;
  emoji: string;
  level: number;
  maxHp: number;
}

/** Roll a fresh boss: name/emoji/level, and a big shared HP pool (thousands). */
function rollBoss(rng: Rng): BossDraft {
  const level = 10 + Math.floor(rng() * 41); // 10–50
  // A pool the whole server has to gang up on: several thousand HP.
  const maxHp = Math.round((1800 + level * 320) * (1 + rng() * 0.5));
  return {
    name: pick(rng, BOSS_NAMES),
    emoji: pick(rng, BOSS_EMOJI),
    level,
    maxHp,
  };
}

/** The one boss that is currently up (active and not yet at 0 HP), if any. */
export async function getActiveBoss() {
  return prisma.worldBoss.findFirst({
    where: { active: true, hp: { gt: 0 } },
    orderBy: { spawnedAt: "desc" },
  });
}

/** Conjure the next boss. Retires any lingering active rows so only one is up. */
async function spawnBoss() {
  await prisma.worldBoss.updateMany({
    where: { active: true },
    data: { active: false, defeatedAt: new Date() },
  });
  const draft = rollBoss(makeRng(randomSeed()));
  return prisma.worldBoss.create({
    data: { ...draft, hp: draft.maxHp, active: true },
  });
}

/** The current boss, spawning a fresh one if none is standing. Only one at a time. */
export async function getOrSpawnBoss() {
  return (await getActiveBoss()) ?? (await spawnBoss());
}

/** The UTC midnight that opens today — the lower bound for "today's" hits. */
function todayMidnightUtc(): Date {
  return new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
}

/** How many times this hero has already swung at this boss today (UTC). */
export async function countBossHitsToday(
  characterId: string,
  worldBossId: string,
): Promise<number> {
  return prisma.worldBossHit.count({
    where: { characterId, worldBossId, createdAt: { gte: todayMidnightUtc() } },
  });
}

export interface BossContributor {
  characterId: string;
  name: string;
  class: string;
  damage: number;
  hits: number;
}

export interface BossContributions {
  total: number;
  top: BossContributor[];
  /** This hero's own standing on the current boss. */
  you: { damage: number; hits: number; rank: number | null };
}

/**
 * Leaderboard for the active boss: every hero's summed damage, ranked, with
 * hero names joined in — plus where the viewing hero personally sits.
 */
export async function loadBossContributions(
  worldBossId: string,
  characterId: string,
  limit = 8,
): Promise<BossContributions> {
  const grouped = await prisma.worldBossHit.groupBy({
    by: ["characterId"],
    where: { worldBossId },
    _sum: { damage: true },
    _count: { _all: true },
    orderBy: { _sum: { damage: "desc" } },
  });

  const heroes = await prisma.character.findMany({
    where: { id: { in: grouped.map((g) => g.characterId) } },
    select: { id: true, name: true, class: true },
  });
  const byId = new Map(heroes.map((h) => [h.id, h]));

  const ranked: BossContributor[] = grouped.map((g) => ({
    characterId: g.characterId,
    name: byId.get(g.characterId)?.name ?? "A departed hero",
    class: byId.get(g.characterId)?.class ?? "WARRIOR",
    damage: g._sum.damage ?? 0,
    hits: g._count._all,
  }));

  const total = ranked.reduce((s, r) => s + r.damage, 0);
  const meIdx = ranked.findIndex((r) => r.characterId === characterId);
  const mine = meIdx >= 0 ? ranked[meIdx] : null;

  return {
    total,
    top: ranked.slice(0, limit),
    you: {
      damage: mine?.damage ?? 0,
      hits: mine?.hits ?? 0,
      rank: meIdx >= 0 ? meIdx + 1 : null,
    },
  };
}

/**
 * Take a swing at the server-wide boss.
 *
 * Damage comes from this hero's effective stats (gear + talents folded in) with
 * seeded variance and a luck-driven crit — deterministic for the call. In one
 * transaction we decrement the shared HP (guarded so it can never dip below 0
 * or overkill under concurrent hits), log the WorldBossHit, and pay a small
 * damage-scaled gold/dust reward through the ledger. Land the final blow and the
 * boss falls, active flips off, and the next behemoth rises. Capped per hero per
 * UTC day so no one lone hero can solo the world.
 */
export async function attackWorldBoss(): Promise<ActionResult> {
  "use server";

  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const boss = await getOrSpawnBoss();

  // Fairness: only so many swings per hero per day.
  const swungToday = await countBossHitsToday(character.id, boss.id);
  if (swungToday >= WORLDBOSS_DAILY_CAP) {
    return {
      ok: false,
      message: `You've thrown your ${WORLDBOSS_DAILY_CAP} swings at ${boss.name} today. Rest those arms — the world fights on without you. 💤`,
    };
  }

  // Deterministic-per-call hit roll from a fresh seed.
  const rng = makeRng(randomSeed());
  const fighter = toFighter(character, character.items);
  const power = primaryValue(fighter);
  const variance = 0.6 + rng() * 0.8; // 0.6x – 1.4x, à la arena strikes
  const critChance = Math.min(0.5, 0.05 + fighter.luck / 200);
  const crit = rng() < critChance;
  const raw = power * variance * (crit ? 2 : 1) * (3 + fighter.level * 0.4);
  const dmg = Math.max(1, Math.round(raw));

  // Read-then-guarded-update: cap the blow at the HP that's actually left, and
  // gate the decrement on `hp >= dealt` so races can't push HP negative.
  const dealt = Math.min(dmg, boss.hp);
  const wouldKill = boss.hp - dealt <= 0;

  const reward = {
    gold: Math.max(1, Math.round(dealt * 0.35)),
    dust: 1 + Math.floor(dealt / 120),
  };

  await prisma.$transaction([
    prisma.worldBoss.updateMany({
      where: { id: boss.id, active: true, hp: { gte: dealt } },
      data: wouldKill
        ? { hp: { decrement: dealt }, active: false, defeatedAt: new Date() }
        : { hp: { decrement: dealt } },
    }),
    prisma.worldBossHit.create({
      data: { worldBossId: boss.id, characterId: character.id, damage: dealt },
    }),
    prisma.character.update({
      where: { id: character.id },
      data: {
        gold: character.gold + reward.gold,
        dust: character.dust + reward.dust,
      },
    }),
    ...currencyLedgerOps(
      character.id,
      {
        gold: character.gold,
        mushrooms: character.mushrooms,
        dust: character.dust,
      },
      reward,
      "WORLDBOSS_REWARD",
    ),
  ]);

  // Re-read to narrate the true aftermath (a concurrent hero may have finished
  // the job, or our guarded decrement may have no-oped in a rare race).
  const after = await prisma.worldBoss.findUnique({ where: { id: boss.id } });
  const slain = !after || after.active === false || after.hp <= 0;

  const spoils = `+${reward.gold}🪙 +${reward.dust}✨`;
  revalidatePath("/");

  // A single dramatic swing at the shared colossus. Unlike an arena/dungeon
  // duel this isn't a win/lose fight — the boss doesn't swing back and its bar
  // is common ground — so we hand the report a one-event replay that opens on
  // the boss's already-chipped HP (foeStartHp) and closes on a bespoke banner.
  const heroMax = maxHp(fighter);
  const buildReplay = (
    foeHpEnd: number,
    banner: { text: string; tone: "good" | "bad" | "gold" },
    outcome: string,
  ): BattleReplay => ({
    me: { name: fighter.name, className: fighter.class, maxHp: heroMax },
    foe: {
      name: boss.name,
      className: `Lv ${boss.level} Colossus`,
      maxHp: boss.maxHp,
      boss: true,
      glyph: boss.emoji,
    },
    events: [
      {
        turn: 1,
        byMe: true,
        attacker: fighter.name,
        defender: boss.name,
        dmg: dealt,
        crit,
        absorbed: 0,
        heal: 0,
        myHp: heroMax,
        foeHp: Math.max(0, foeHpEnd),
        notes: [],
      },
    ],
    foeStartHp: boss.hp,
    won: true,
    title: `🌍 ${boss.emoji} ${boss.name}`,
    outcome,
    banner,
  });

  if (slain) {
    const next = await getOrSpawnBoss();
    const message = `${crit ? "💥 CRIT! " : ""}You landed the KILLING BLOW on ${boss.name} for ${dealt} damage! The world roars your name. ${spoils}. A new terror stirs: ${next.emoji} ${next.name} (Lv ${next.level}). ⚔️`;
    return {
      ok: true,
      message,
      battle: buildReplay(0, { text: "🏆 WORLD BOSS SLAIN!", tone: "gold" }, message),
    };
  }

  const message = `${crit ? "💥 CRIT! " : ""}You strike ${boss.name} for ${dealt} damage! ${after.hp}/${after.maxHp} HP left — keep the pressure on. ${spoils}`;
  return {
    ok: true,
    message,
    battle: buildReplay(
      after.hp,
      { text: crit ? "💥 Massive Blow!" : "🗡️ Blow Landed!", tone: "good" },
      message,
    ),
  };
}
