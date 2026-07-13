"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionToken, clearSession } from "@/lib/session";
import { loadCharacter, toFighter, guildGoldMultiplier } from "@/lib/data";
import { currencyLedgerOps } from "@/lib/ledger";
import { guildPerks } from "@/lib/guildhall";
import { eloUpdate } from "@/lib/elo";
import {
  rollQuest,
  applyLevelUps,
  resolveBattle,
  randomOpponent,
  generateShopStock,
  getQuestLength,
  getDungeon,
  generateBoss,
  dungeonReward,
  SLOTS,
  type CharClass,
  type Progression,
  type BattleEvent,
} from "@/lib/game";
import { makeRng, randomSeed } from "@/lib/rng";
import { parseLoadout } from "@/lib/skills";
import { applyTonic, TONIC_DEFS, isTonicId } from "@/lib/tonics";
import type { Prisma } from "@/generated/prisma/client";

/** An animatable blow-by-blow replay handed back to the client after a fight. */
export interface BattleReplay {
  me: { name: string; className: string; maxHp: number };
  /** `boss`/`glyph` let the report draw a monster medallion for dungeon foes. */
  foe: { name: string; className: string; maxHp: number; boss?: boolean; glyph?: string };
  events: BattleEvent[];
  won: boolean;
  /** Title shown above the duel (e.g. the dungeon + floor). */
  title?: string;
  /** Reward summary line to show when the dust settles. */
  outcome: string;
  /**
   * Foe's HP at the START of the replay (defaults to `foe.maxHp`). Lets a
   * shared, already-chipped pool — the World Boss — open partly drained so a
   * single swing reads as a sliver off a huge bar rather than a full duel.
   */
  foeStartHp?: number;
  /**
   * Overrides the closing Victory/Defeat banner. World-boss hits aren't a
   * win/lose duel — a landed blow just wants a triumphant line of its own.
   */
  banner?: { text: string; tone: "good" | "bad" | "gold" };
}

export interface ActionResult {
  ok: boolean;
  message: string;
  /** Present on combat actions — drives the animated battle report. */
  battle?: BattleReplay;
}

// ---------------------------------------------------------------------------
// Timed quests: start one, watch the clock, collect when it's done
// ---------------------------------------------------------------------------

export async function startQuest(
  lengthKey: string,
  _formData?: FormData,
): Promise<void> {
  const character = await loadCharacter();
  if (!character) return;
  if (character.activeQuest) return; // one quest at a time

  const length = getQuestLength(lengthKey);
  const seed = randomSeed();
  const rng = makeRng(seed);
  const roll = rollQuest(rng, toFighter(character, character.items));

  const goldReward = Math.round(roll.goldReward * length.mult);
  const xpReward = Math.round(roll.xpReward * length.mult);
  // Longer trips have a better shot at a mushroom.
  const mushroomReward =
    roll.mushroomReward + (rng() < 0.03 * length.mult ? 1 : 0);

  const endsAt = new Date(Date.now() + length.durationSec * 1000);

  await prisma.activeQuest.create({
    data: {
      characterId: character.id,
      title: roll.title,
      seed,
      goldReward,
      xpReward,
      mushroomReward,
      durationSec: length.durationSec,
      endsAt,
    },
  });

  revalidatePath("/");
}

export async function collectQuest(): Promise<ActionResult> {
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const quest = character.activeQuest;
  if (!quest) return { ok: false, message: "No quest in progress." };

  // Server-authoritative ready-check: you cannot collect early.
  if (Date.now() < quest.endsAt.getTime()) {
    const secs = Math.ceil((quest.endsAt.getTime() - Date.now()) / 1000);
    return { ok: false, message: `Still adventuring — ${secs}s to go.` };
  }

  // Guild-hall perks (0 if roomless / guildless): Library adds quest XP,
  // Treasury adds quest gold on top of the roster bonus.
  const perks = character.guild
    ? guildPerks(character.guild.rooms)
    : { questGoldPct: 0, questXpPct: 0, arenaGoldPct: 0, statBonus: 0 };
  const xpEarned = Math.round(quest.xpReward * (1 + perks.questXpPct / 100));

  const progression: Progression = {
    class: character.class as CharClass,
    level: character.level,
    experience: character.experience + xpEarned,
    strength: character.strength,
    dexterity: character.dexterity,
    intelligence: character.intelligence,
    constitution: character.constitution,
    luck: character.luck,
  };
  const levels = applyLevelUps(progression);

  // Guild perk: members earn bonus quest gold (+2% per member, capped at +20%,
  // plus the Treasury room's percentage).
  const guildMult = character.guild
    ? guildGoldMultiplier(character.guild.members.length)
    : 1;
  const goldEarned = Math.round(
    quest.goldReward * guildMult * (1 + perks.questGoldPct / 100),
  );

  await prisma.$transaction([
    prisma.character.update({
      where: { id: character.id },
      data: {
        gold: character.gold + goldEarned,
        mushrooms: character.mushrooms + quest.mushroomReward,
        experience: progression.experience,
        level: progression.level,
        strength: progression.strength,
        dexterity: progression.dexterity,
        intelligence: progression.intelligence,
        constitution: progression.constitution,
        luck: progression.luck,
        questLogs: {
          create: {
            title: quest.title,
            goldReward: goldEarned,
            xpReward: xpEarned,
          },
        },
      },
    }),
    prisma.activeQuest.delete({ where: { id: quest.id } }),
    ...currencyLedgerOps(
      character.id,
      { gold: character.gold, mushrooms: character.mushrooms },
      { gold: goldEarned, mushrooms: quest.mushroomReward },
      "QUEST_REWARD",
    ),
  ]);

  revalidatePath("/");

  let message = `"${quest.title}" complete! +${goldEarned} gold, +${xpEarned} XP`;
  if (guildMult > 1 || perks.questGoldPct > 0 || perks.questXpPct > 0)
    message += ` (incl. guild bonus)`;
  if (quest.mushroomReward) message += `, +${quest.mushroomReward} 🍄`;
  if (levels > 0) message += ` — LEVEL UP! You are now level ${progression.level}. ✨`;
  return { ok: true, message };
}

/** Give up on the current quest without collecting any reward. */
export async function cancelQuest(): Promise<void> {
  const character = await loadCharacter();
  if (!character?.activeQuest) return;
  await prisma.activeQuest.delete({ where: { id: character.activeQuest.id } });
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Fight in the arena (PvP against another real hero, or an NPC if alone)
// ---------------------------------------------------------------------------

export async function fightArena(opponentId?: string): Promise<ActionResult> {
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const seed = randomSeed();
  const rng = makeRng(seed);

  // A specific challenge (from the scouting board) targets one hero; otherwise
  // pick a random real opponent, falling back to a generated NPC.
  const include = { items: true, guild: { include: { rooms: true } } } as const;
  let opponent;
  if (opponentId) {
    opponent = await prisma.character.findFirst({
      where: { id: opponentId, NOT: { id: character.id } },
      include,
    });
    if (!opponent) return { ok: false, message: "That challenger has left the arena." };
  } else {
    const others = await prisma.character.findMany({
      where: { id: { not: character.id } },
      take: 25,
      include,
    });
    opponent = others.length > 0 ? others[Math.floor(rng() * others.length)] : null;
  }
  const foe = opponent
    ? toFighter(opponent, opponent.items)
    : randomOpponent(rng, character.level);

  // An armed Battle Tonic (a consumable) buffs one combat stat for this fight
  // only, then is spent. Applied before the duel so the buff flows through all
  // the derived-combat math; consumed in the transaction below.
  const armedTonic = isTonicId(character.tonics?.armed) ? character.tonics.armed : null;
  const meFighter = armedTonic
    ? applyTonic(toFighter(character, character.items), armedTonic)
    : toFighter(character, character.items);
  const result = resolveBattle(
    rng,
    meFighter,
    foe,
    parseLoadout(character.skillLoadout),
  );

  // Rewards: winning grants gold + a little XP; losing costs a small stake.
  // The guild War Room boosts arena winnings.
  const arenaGoldPct = character.guild
    ? guildPerks(character.guild.rooms).arenaGoldPct
    : 0;
  const stake = Math.round(
    (8 * foe.level + rng() * 20) * (1 + arenaGoldPct / 100),
  );
  const goldChange = result.won ? stake : -Math.min(character.gold, Math.round(stake / 2));
  const xpGain = result.won ? Math.round(10 * foe.level) : 0;

  const progression: Progression = {
    class: character.class as CharClass,
    level: character.level,
    experience: character.experience + xpGain,
    strength: character.strength,
    dexterity: character.dexterity,
    intelligence: character.intelligence,
    constitution: character.constitution,
    luck: character.luck,
  };
  const levels = applyLevelUps(progression);

  // Ranked-ladder rating. Against a real hero we use their rating and update
  // both; against an NPC fallback we use a synthetic rating and only the hero's
  // moves (bots don't sit on the ladder).
  const foeRating = opponent
    ? opponent.arenaRating
    : Math.max(900, Math.min(1600, 1000 + foe.level * 15));
  const rating = eloUpdate(character.arenaRating, foeRating, result.won);

  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.character.update({
      where: { id: character.id },
      data: {
        gold: character.gold + goldChange,
        arenaWins: character.arenaWins + (result.won ? 1 : 0),
        arenaLosses: character.arenaLosses + (result.won ? 0 : 1),
        arenaRating: rating.mine,
        experience: progression.experience,
        level: progression.level,
        strength: progression.strength,
        dexterity: progression.dexterity,
        intelligence: progression.intelligence,
        constitution: progression.constitution,
        luck: progression.luck,
        battleLogs: {
          create: {
            opponentName: foe.name,
            won: result.won,
            goldChange,
            seed,
            rounds: JSON.stringify(result.rounds),
          },
        },
      },
    }),
    ...currencyLedgerOps(
      character.id,
      { gold: character.gold, mushrooms: character.mushrooms },
      { gold: goldChange },
      result.won ? "ARENA_WIN" : "ARENA_LOSS",
    ),
  ];
  if (opponent) {
    ops.push(
      prisma.character.update({
        where: { id: opponent.id },
        data: { arenaRating: rating.theirs },
      }),
    );
  }
  // Spend the armed tonic (decrement its count, clear the armed slot).
  if (armedTonic) {
    ops.push(
      prisma.tonicState.update({
        where: { characterId: character.id },
        data: { [armedTonic]: { decrement: 1 }, armed: null },
      }),
    );
  }
  await prisma.$transaction(ops);

  revalidatePath("/");

  const ratingStr = `${rating.delta >= 0 ? "+" : ""}${rating.delta} rating (${rating.mine})`;
  let message = result.won
    ? `You defeated ${foe.name}! +${goldChange} gold`
    : `${foe.name} bested you. ${goldChange} gold`;
  if (xpGain) message += `, +${xpGain} XP`;
  message += ` · ${ratingStr}`;
  if (levels > 0) message += ` — LEVEL UP to ${progression.level}! ✨`;
  if (armedTonic) message = `${TONIC_DEFS[armedTonic].emoji} ${TONIC_DEFS[armedTonic].name} kicked in! ${message}`;

  const battle: BattleReplay = {
    me: { name: meFighter.name, className: meFighter.class, maxHp: result.meMaxHp },
    foe: { name: foe.name, className: foe.class, maxHp: result.foeMaxHp },
    events: result.events,
    won: result.won,
    outcome: message,
  };
  return { ok: true, message, battle };
}

// ---------------------------------------------------------------------------
// Dungeons: fight the next floor's boss
// ---------------------------------------------------------------------------

export async function raidDungeon(dungeonKey: string): Promise<ActionResult> {
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const dungeon = getDungeon(dungeonKey);
  if (!dungeon) return { ok: false, message: "Unknown dungeon." };

  const progress = character.dungeons.find((d) => d.dungeonKey === dungeonKey);
  const floor = progress?.floor ?? 1;
  if (progress?.clearedAt || floor > dungeon.floors) {
    return { ok: false, message: `${dungeon.name} is already cleared. 🏅` };
  }

  const seed = randomSeed();
  const rng = makeRng(seed);
  const boss = generateBoss(rng, dungeon, floor);
  const meFighter = toFighter(character, character.items);
  const result = resolveBattle(
    rng,
    meFighter,
    boss,
    parseLoadout(character.skillLoadout),
  );
  const label = `${dungeon.emoji} ${boss.name} — ${dungeon.name} floor ${floor}`;

  // Shared replay skeleton — the animated report draws the boss as a monster.
  const replayBase = {
    me: { name: meFighter.name, className: meFighter.class, maxHp: result.meMaxHp },
    foe: {
      name: boss.name,
      className: boss.class,
      maxHp: result.foeMaxHp,
      boss: true,
      glyph: dungeon.emoji,
    },
    events: result.events,
    won: result.won,
    title: `${dungeon.emoji} ${dungeon.name} · Floor ${floor}`,
  };

  const ops: Prisma.PrismaPromise<unknown>[] = [];

  if (!result.won) {
    ops.push(
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
    const message = `${boss.name} defeated you on floor ${floor}. Regroup and try again!`;
    return { ok: true, message, battle: { ...replayBase, outcome: message } };
  }

  // Victory: reward, possible loot, and advance the run.
  const reward = dungeonReward(rng, dungeon, floor);

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
  const cleared = nextFloor > dungeon.floors;

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
    prisma.dungeonProgress.upsert({
      where: {
        characterId_dungeonKey: {
          characterId: character.id,
          dungeonKey,
        },
      },
      create: {
        characterId: character.id,
        dungeonKey,
        floor: nextFloor,
        clearedAt: cleared ? new Date() : null,
      },
      update: {
        floor: nextFloor,
        clearedAt: cleared ? new Date() : null,
      },
    }),
    ...currencyLedgerOps(
      character.id,
      { gold: character.gold, mushrooms: character.mushrooms },
      { gold: reward.gold },
      "DUNGEON_REWARD",
    ),
  );

  if (reward.loot) {
    ops.push(
      prisma.item.create({
        data: {
          ...reward.loot,
          characterId: character.id,
          location: "INVENTORY",
        },
      }),
    );
  }

  await prisma.$transaction(ops);
  revalidatePath("/");

  let message = `Floor ${floor} cleared! +${reward.gold} gold, +${reward.xp} XP`;
  if (reward.loot) message += ` — loot: ${reward.loot.name}! 🎁`;
  if (levels > 0) message += ` — LEVEL UP to ${progression.level}! ✨`;
  if (cleared) message += ` You have conquered ${dungeon.name}! 🏅`;
  return { ok: true, message, battle: { ...replayBase, outcome: message } };
}

// ---------------------------------------------------------------------------
// The Magic Shop + inventory
// ---------------------------------------------------------------------------

/** Reroll the hero's shop with a fresh selection scaled to their level. */
export async function refreshShop(): Promise<void> {
  const character = await loadCharacter();
  if (!character) return;

  await prisma.item.deleteMany({
    where: { characterId: character.id, location: "SHOP" },
  });
  await prisma.item.createMany({
    data: generateShopStock(makeRng(randomSeed()), character.level).map((it) => ({
      ...it,
      characterId: character.id,
      location: "SHOP",
    })),
  });

  revalidatePath("/");
}

/** Buy a shop item: deduct gold and move it into the inventory. */
export async function buyItem(itemId: string, _formData?: FormData): Promise<void> {
  const character = await loadCharacter();
  if (!character) return;

  const item = await prisma.item.findFirst({
    where: { id: itemId, characterId: character.id, location: "SHOP" },
  });
  if (!item || character.gold < item.price) return;

  await prisma.$transaction([
    prisma.character.update({
      where: { id: character.id },
      data: { gold: character.gold - item.price },
    }),
    prisma.item.update({
      where: { id: item.id },
      data: { location: "INVENTORY" },
    }),
    ...currencyLedgerOps(
      character.id,
      { gold: character.gold, mushrooms: character.mushrooms },
      { gold: -item.price },
      "SHOP_BUY",
    ),
  ]);

  revalidatePath("/");
}

/** Equip an inventory item, moving any item in the same slot back to the bag. */
export async function equipItem(itemId: string, _formData?: FormData): Promise<void> {
  const character = await loadCharacter();
  if (!character) return;

  const item = await prisma.item.findFirst({
    where: { id: itemId, characterId: character.id, location: "INVENTORY" },
  });
  if (!item) return;

  await prisma.$transaction([
    prisma.item.updateMany({
      where: { characterId: character.id, slot: item.slot, location: "EQUIPPED" },
      data: { location: "INVENTORY" },
    }),
    prisma.item.update({
      where: { id: item.id },
      data: { location: "EQUIPPED" },
    }),
  ]);

  revalidatePath("/");
}

/** Move an equipped item back into the inventory. */
export async function unequipItem(itemId: string, _formData?: FormData): Promise<void> {
  const character = await loadCharacter();
  if (!character) return;

  await prisma.item.updateMany({
    where: { id: itemId, characterId: character.id, location: "EQUIPPED" },
    data: { location: "INVENTORY" },
  });

  revalidatePath("/");
}

/**
 * Equip the highest-stat owned item in every slot. "Best" is the raw sum of an
 * item's five attribute bonuses — the same net used by the shop comparison
 * badges — so this is the one-click version of chasing every ▲ Upgrade. Ties
 * keep whatever is already equipped, so it never churns gear pointlessly.
 */
export async function autoEquipBestGear(): Promise<ActionResult> {
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const power = (i: { strength: number; dexterity: number; intelligence: number; constitution: number; luck: number }) =>
    i.strength + i.dexterity + i.intelligence + i.constitution + i.luck;

  const slots = SLOTS.map((s) => s.id);
  const ops: Prisma.PrismaPromise<unknown>[] = [];
  let changes = 0;

  for (const slot of slots) {
    const inSlot = character.items.filter((i) => i.slot === slot);
    if (inSlot.length === 0) continue;

    const maxPower = Math.max(...inSlot.map(power));
    const equipped = inSlot.find((i) => i.location === "EQUIPPED");
    // Already wearing a best-in-slot (or tied-best) piece — leave it be.
    if (equipped && power(equipped) === maxPower) continue;

    const best = inSlot.find((i) => power(i) === maxPower);
    if (!best) continue;

    ops.push(
      prisma.item.updateMany({
        where: { characterId: character.id, slot, location: "EQUIPPED" },
        data: { location: "INVENTORY" },
      }),
      prisma.item.update({ where: { id: best.id }, data: { location: "EQUIPPED" } }),
    );
    changes += 1;
  }

  if (changes === 0) {
    return { ok: true, message: "Your gear is already the best you own. ⭐" };
  }

  await prisma.$transaction(ops);
  revalidatePath("/");
  return {
    ok: true,
    message: `Auto-equipped your best gear across ${changes} slot${changes > 1 ? "s" : ""}. ⭐`,
  };
}

/** Sell an owned item (equipped or in the bag) for half its price. */
export async function sellItem(itemId: string, _formData?: FormData): Promise<void> {
  const character = await loadCharacter();
  if (!character) return;

  const item = await prisma.item.findFirst({
    where: {
      id: itemId,
      characterId: character.id,
      location: { in: ["INVENTORY", "EQUIPPED"] },
    },
  });
  if (!item) return;

  const payout = Math.max(1, Math.round(item.price / 2));
  await prisma.$transaction([
    prisma.character.update({
      where: { id: character.id },
      data: { gold: character.gold + payout },
    }),
    prisma.item.delete({ where: { id: item.id } }),
    ...currencyLedgerOps(
      character.id,
      { gold: character.gold, mushrooms: character.mushrooms },
      { gold: payout },
      "SHOP_SELL",
    ),
  ]);

  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Guilds
// ---------------------------------------------------------------------------

const GUILD_COST = 500;

export async function createGuild(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };
  if (character.guildId) return { ok: false, message: "Leave your current guild first." };

  const name = String(formData.get("name") ?? "").trim();
  const tag = String(formData.get("tag") ?? "").trim().toUpperCase();

  if (name.length < 3 || name.length > 24) {
    return { ok: false, message: "Guild name must be 3–24 characters." };
  }
  if (!/^[A-Z0-9]{2,4}$/.test(tag)) {
    return { ok: false, message: "Tag must be 2–4 letters or digits." };
  }
  if (character.gold < GUILD_COST) {
    return { ok: false, message: `Founding a guild costs ${GUILD_COST} gold.` };
  }
  if (await prisma.guild.findUnique({ where: { name } })) {
    return { ok: false, message: "A guild with that name already exists." };
  }

  await prisma.$transaction([
    prisma.character.update({
      where: { id: character.id },
      data: {
        gold: character.gold - GUILD_COST,
        guild: {
          create: { name, tag, founderId: character.id },
        },
      },
    }),
    ...currencyLedgerOps(
      character.id,
      { gold: character.gold, mushrooms: character.mushrooms },
      { gold: -GUILD_COST },
      "GUILD_FOUND",
    ),
  ]);

  revalidatePath("/");
  return { ok: true, message: `Guild «${name}» founded! 🏰` };
}

export async function joinGuild(guildId: string, _formData?: FormData): Promise<void> {
  const character = await loadCharacter();
  if (!character || character.guildId) return;

  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild) return;

  await prisma.character.update({
    where: { id: character.id },
    data: { guildId },
  });
  revalidatePath("/");
}

export async function leaveGuild(): Promise<void> {
  const character = await loadCharacter();
  if (!character?.guildId) return;

  await prisma.character.update({
    where: { id: character.id },
    data: { guildId: null },
  });
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Danger zone: abandon the current hero
// ---------------------------------------------------------------------------

export async function abandonHero(): Promise<void> {
  const token = await getSessionToken();
  if (!token) return;
  const player = await prisma.player.findUnique({ where: { sessionToken: token } });
  if (player) {
    // Delete the character first (its logs cascade), then the player row.
    await prisma.character.deleteMany({ where: { playerId: player.id } });
    await prisma.player.deleteMany({ where: { id: player.id } });
    await clearSession();
  }
  revalidatePath("/");
}
