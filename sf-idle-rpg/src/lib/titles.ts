/**
 * Titles — cosmetic epithets a hero equips to show off (e.g. "the Unkillable",
 * "Dragonsbane", "Cellar Rat"). Identity, not power: equipping a title changes
 * nothing about combat, rewards, or stats. It's a bragging rights slot.
 *
 * Which titles a hero has UNLOCKED is derived here, purely from existing hero
 * data (level, arena record, dungeon clears, achievements earned, lifetime gold,
 * guild membership) — exactly like achievements. The only thing stored is the
 * single equipped key (`Character.title`, nullable). No per-title table.
 *
 * The lone exception is the premium title, which is "bought" with mushrooms.
 * Ownership of it is itself derived — from the presence of a TITLE_PURCHASE row
 * in the currency ledger — so it too needs no extra storage and survives being
 * unequipped and re-equipped without charging twice.
 */

import { prisma } from "@/lib/db";
import { DUNGEONS } from "@/lib/game";
import { currencyLedgerOps } from "@/lib/ledger";
import type { ActionResult } from "@/lib/actions";

// ---------------------------------------------------------------------------
// Rarity / flavour
// ---------------------------------------------------------------------------

export type TitleRarity = "Common" | "Rare" | "Epic" | "Legendary" | "Premium";

export interface TitleRarityMeta {
  label: string;
  color: string;
}

export const TITLE_RARITY: Record<TitleRarity, TitleRarityMeta> = {
  Common: { label: "Common", color: "#b99b78" },
  Rare: { label: "Rare", color: "#4aa3df" },
  Epic: { label: "Epic", color: "#a55eea" },
  Legendary: { label: "Legendary", color: "#e8b923" },
  Premium: { label: "Premium", color: "#ff6ab5" },
};

/** Mushroom price of the premium title. */
export const PREMIUM_TITLE_COST = 5;

// ---------------------------------------------------------------------------
// The context every predicate is evaluated against
// ---------------------------------------------------------------------------

export interface TitleContext {
  level: number;
  arenaWins: number;
  arenaLosses: number;
  /** Sum of cleared floors across every dungeon run. */
  dungeonFloorsCleared: number;
  /** Keys of dungeons cleared to the last floor. */
  clearedDungeonKeys: string[];
  /** How many distinct dungeons have been fully conquered. */
  dungeonsFullyCleared: number;
  /** Rows in CharacterAchievement — milestones actually earned. */
  achievementsEarned: number;
  /** Lifetime gold *earned* — sum of positive GOLD deltas in the ledger. */
  goldEarnedTotal: number;
  hasGuild: boolean;
  /** Whether the hero has ever bought a premium title (TITLE_PURCHASE ledger row). */
  ownsPremium: boolean;
}

export interface TitleDef {
  key: string;
  /** The epithet as shown after the hero's name, e.g. "the Unkillable". */
  label: string;
  emoji: string;
  rarity: TitleRarity;
  /** One dry line of flavour. */
  flavor: string;
  /** True when the hero has earned (or bought) the right to wear this title. */
  predicate: (ctx: TitleContext) => boolean;
  /** Short "how to earn it" hint shown while the title is still locked. */
  progress: (ctx: TitleContext) => string;
  /** Mushroom price if this is a buyable premium title. */
  premiumCost?: number;
}

/** "3 / 10 wins" style progress helper. */
const bar = (have: number, need: number, noun: string) =>
  `${Math.min(have, need).toLocaleString()} / ${need.toLocaleString()} ${noun}`;

const dungeonName = (key: string) =>
  DUNGEONS.find((d) => d.key === key)?.name ?? key;

// ---------------------------------------------------------------------------
// The catalog — ~15 titles
// ---------------------------------------------------------------------------

export const TITLES: TitleDef[] = [
  // — Starter ——————————————————————————————————————————————————
  {
    key: "the_hopeful",
    label: "the Hopeful",
    emoji: "🌱",
    rarity: "Common",
    flavor: "Every legend starts as somebody's disappointing nephew.",
    predicate: () => true,
    progress: () => "Unlocked the moment you rolled a hero.",
  },

  // — Levelling ————————————————————————————————————————————————
  {
    key: "the_seasoned",
    label: "the Seasoned",
    emoji: "🎖️",
    rarity: "Rare",
    flavor: "Reach level 15. Old enough to complain about young heroes.",
    predicate: (c) => c.level >= 15,
    progress: (c) => bar(c.level, 15, "levels"),
  },
  {
    key: "the_ascended",
    label: "the Ascended",
    emoji: "🏔️",
    rarity: "Legendary",
    flavor: "Reach level 30. The bards have officially run out of adjectives.",
    predicate: (c) => c.level >= 30,
    progress: (c) => bar(c.level, 30, "levels"),
  },

  // — Arena ————————————————————————————————————————————————————
  {
    key: "the_brawler",
    label: "the Brawler",
    emoji: "🥊",
    rarity: "Common",
    flavor: "Win 5 duels. The Arena bouncer knows your usual.",
    predicate: (c) => c.arenaWins >= 5,
    progress: (c) => bar(c.arenaWins, 5, "wins"),
  },
  {
    key: "the_unkillable",
    label: "the Unkillable",
    emoji: "🛡️",
    rarity: "Epic",
    flavor: "Win 50 duels. Opponents now schedule sick days in advance.",
    predicate: (c) => c.arenaWins >= 50,
    progress: (c) => bar(c.arenaWins, 50, "wins"),
  },
  {
    key: "punching_bag",
    label: "the Well-Padded",
    emoji: "🤕",
    rarity: "Common",
    flavor: "Lose 25 duels. A dubious honour, worn with dubious pride.",
    predicate: (c) => c.arenaLosses >= 25,
    progress: (c) => bar(c.arenaLosses, 25, "losses"),
  },

  // — Dungeons —————————————————————————————————————————————————
  {
    key: "cellar_rat",
    label: "Cellar Rat",
    emoji: "🐀",
    rarity: "Common",
    flavor: "Clear a dungeon floor. Someone had to go down there.",
    predicate: (c) => c.dungeonFloorsCleared >= 1,
    progress: (c) => bar(c.dungeonFloorsCleared, 1, "floors"),
  },
  {
    key: "crypt_walker",
    label: "the Crypt-Walker",
    emoji: "⚰️",
    rarity: "Epic",
    flavor: "Fully clear the Whispering Crypt. The whispers whisper about you now.",
    predicate: (c) => c.clearedDungeonKeys.includes("crypt"),
    progress: () => `Conquer ${dungeonName("crypt")}, floor by floor.`,
  },
  {
    key: "dragonsbane",
    label: "Dragonsbane",
    emoji: "🐉",
    rarity: "Legendary",
    flavor: "Fully clear the Dragon's Keep. The insurance claims were astronomical.",
    predicate: (c) => c.clearedDungeonKeys.includes("keep"),
    progress: () => `Conquer ${dungeonName("keep")} to its final floor.`,
  },
  {
    key: "delvemaster",
    label: "the Delvemaster",
    emoji: "🗝️",
    rarity: "Legendary",
    flavor: "Fully clear every dungeon. You dream exclusively in torchlight.",
    predicate: (c) => c.dungeonsFullyCleared >= DUNGEONS.length,
    progress: (c) => bar(c.dungeonsFullyCleared, DUNGEONS.length, "dungeons"),
  },

  // — Wealth ———————————————————————————————————————————————————
  {
    key: "the_wealthy",
    label: "the Insufferably Rich",
    emoji: "💰",
    rarity: "Epic",
    flavor: "Earn 50,000 gold in total. The tax collector left a strongly-worded note.",
    predicate: (c) => c.goldEarnedTotal >= 50_000,
    progress: (c) => bar(c.goldEarnedTotal, 50_000, "gold earned"),
  },

  // — Prestige (achievements about achievements) ——————————————————
  {
    key: "trophy_hunter",
    label: "the Decorated",
    emoji: "🏅",
    rarity: "Rare",
    flavor: "Earn 10 achievements. Your mantelpiece is beginning to sag.",
    predicate: (c) => c.achievementsEarned >= 10,
    progress: (c) => bar(c.achievementsEarned, 10, "achievements"),
  },

  // — Social ———————————————————————————————————————————————————
  {
    key: "guilded",
    label: "the Guilded",
    emoji: "🏰",
    rarity: "Common",
    flavor: "Join or found a guild. Adventuring is better with a group chat.",
    predicate: (c) => c.hasGuild,
    progress: () => "Join or found a guild.",
  },

  // — Premium (bought with mushrooms) —————————————————————————————
  {
    key: "objectively_correct",
    label: "the Objectively Correct",
    emoji: "👑",
    rarity: "Premium",
    flavor: `Not earned — simply purchased. ${PREMIUM_TITLE_COST}🍄 buys the moral high ground.`,
    predicate: (c) => c.ownsPremium,
    progress: () => `Buy it for ${PREMIUM_TITLE_COST}🍄. Dignity sold separately.`,
    premiumCost: PREMIUM_TITLE_COST,
  },
];

export function getTitle(key: string): TitleDef | undefined {
  return TITLES.find((t) => t.key === key);
}

// ---------------------------------------------------------------------------
// Context assembly
// ---------------------------------------------------------------------------

/** Gather everything the predicates need from existing hero data. */
export async function buildTitleContext(
  characterId: string,
): Promise<TitleContext | null> {
  const [character, dungeons, achievementsEarned, goldAgg, premiumPurchases] =
    await Promise.all([
      prisma.character.findUnique({
        where: { id: characterId },
        select: { level: true, arenaWins: true, arenaLosses: true, guildId: true },
      }),
      prisma.dungeonProgress.findMany({
        where: { characterId },
        select: { dungeonKey: true, floor: true, clearedAt: true },
      }),
      prisma.characterAchievement.count({ where: { characterId } }),
      prisma.currencyLedger.aggregate({
        where: { characterId, currency: "GOLD", delta: { gt: 0 } },
        _sum: { delta: true },
      }),
      prisma.currencyLedger.count({
        where: { characterId, reason: "TITLE_PURCHASE" },
      }),
    ]);

  if (!character) return null;

  // `floor` is the *next* floor to attempt, so cleared floors = floor - 1.
  const dungeonFloorsCleared = dungeons.reduce(
    (sum, d) => sum + Math.max(0, d.floor - 1),
    0,
  );

  // A dungeon is fully conquered when it's been marked cleared, or the hero has
  // advanced past its final floor.
  const clearedDungeonKeys = dungeons
    .filter((d) => {
      const def = DUNGEONS.find((x) => x.key === d.dungeonKey);
      return d.clearedAt != null || (def != null && d.floor > def.floors);
    })
    .map((d) => d.dungeonKey);

  return {
    level: character.level,
    arenaWins: character.arenaWins,
    arenaLosses: character.arenaLosses,
    dungeonFloorsCleared,
    clearedDungeonKeys,
    dungeonsFullyCleared: clearedDungeonKeys.length,
    achievementsEarned,
    goldEarnedTotal: goldAgg._sum.delta ?? 0,
    hasGuild: character.guildId != null,
    ownsPremium: premiumPurchases > 0,
  };
}

// ---------------------------------------------------------------------------
// Evaluation (for display)
// ---------------------------------------------------------------------------

export interface EvaluatedTitle extends TitleDef {
  /** Whether the hero has earned/bought the right to wear this title. */
  unlocked: boolean;
  /** Whether this title is the one currently equipped. */
  equipped: boolean;
  /** Locked → how to earn it; unlocked → null. */
  progressText: string | null;
}

/**
 * Evaluate the whole catalog for a hero: assemble the context, read the equipped
 * key, and annotate each title for the UI. Reads only — equipping/buying are the
 * server actions below.
 */
export async function loadTitles(characterId: string): Promise<EvaluatedTitle[]> {
  const [ctx, character] = await Promise.all([
    buildTitleContext(characterId),
    prisma.character.findUnique({
      where: { id: characterId },
      select: { title: true },
    }),
  ]);

  const equippedKey = character?.title ?? null;

  return TITLES.map((def) => {
    const unlocked = ctx ? def.predicate(ctx) : false;
    const equipped = equippedKey === def.key;
    return {
      ...def,
      unlocked,
      equipped,
      progressText: unlocked ? null : ctx ? def.progress(ctx) : "No hero data",
    };
  });
}

// ---------------------------------------------------------------------------
// Server actions
// ---------------------------------------------------------------------------

/**
 * Equip an earned title. The unlock is re-derived server-side, so a client can't
 * equip a title it hasn't earned by fabricating a key.
 */
export async function equipTitle(key: string): Promise<ActionResult> {
  "use server";

  const { loadCharacter } = await import("@/lib/data");
  const { revalidatePath } = await import("next/cache");

  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const def = getTitle(key);
  if (!def) return { ok: false, message: "No such title." };

  const ctx = await buildTitleContext(character.id);
  if (!ctx) return { ok: false, message: "No hero found." };

  if (!def.predicate(ctx)) {
    return {
      ok: false,
      message: def.premiumCost
        ? `“${def.label}” must be bought first.`
        : `You haven't earned “${def.label}” yet.`,
    };
  }

  await prisma.character.update({
    where: { id: character.id },
    data: { title: key },
  });

  revalidatePath("/");
  return { ok: true, message: `Now styling yourself ${def.emoji} ${def.label}.` };
}

/** Take off the currently equipped title. */
export async function unequipTitle(): Promise<ActionResult> {
  "use server";

  const { loadCharacter } = await import("@/lib/data");
  const { revalidatePath } = await import("next/cache");

  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  await prisma.character.update({
    where: { id: character.id },
    data: { title: null },
  });

  revalidatePath("/");
  return { ok: true, message: "Title set aside. Back to plain old you." };
}

/**
 * Buy the premium title with mushrooms, then equip it. Ownership is recorded as
 * a TITLE_PURCHASE ledger row (the source of truth for the derived unlock), so
 * re-equipping later never charges again.
 */
export async function buyTitle(key: string): Promise<ActionResult> {
  "use server";

  const { loadCharacter } = await import("@/lib/data");
  const { revalidatePath } = await import("next/cache");

  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const def = getTitle(key);
  if (!def || def.premiumCost == null) {
    return { ok: false, message: "That title isn't for sale." };
  }

  const cost = def.premiumCost;
  const ctx = await buildTitleContext(character.id);
  if (!ctx) return { ok: false, message: "No hero found." };

  // Already owned — just equip it, free of charge.
  if (ctx.ownsPremium) {
    await prisma.character.update({
      where: { id: character.id },
      data: { title: key },
    });
    revalidatePath("/");
    return { ok: true, message: `Now styling yourself ${def.emoji} ${def.label}.` };
  }

  if (character.mushrooms < cost) {
    return {
      ok: false,
      message: `“${def.label}” costs ${cost}🍄 — you have ${character.mushrooms}.`,
    };
  }

  await prisma.$transaction([
    prisma.character.update({
      where: { id: character.id },
      data: { mushrooms: character.mushrooms - cost, title: key },
    }),
    ...currencyLedgerOps(
      character.id,
      { gold: character.gold, mushrooms: character.mushrooms },
      { mushrooms: -cost },
      "TITLE_PURCHASE",
    ),
  ]);

  revalidatePath("/");
  return {
    ok: true,
    message: `The herald clears his throat: “Presenting… ${def.emoji} ${def.label}!”`,
  };
}
