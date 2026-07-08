/**
 * Cosmetics — how your hero *looks*, not how hard they hit. Three independent
 * slots you can dress up: a portrait avatar (an emoji face), a profile frame
 * colour (the ring around that portrait), and a banner (a little emblem that
 * flies over the card). Pure identity — equipping any of these changes nothing
 * about combat, rewards, or stats.
 *
 * Which cosmetics a hero has UNLOCKED is derived here, purely from existing hero
 * data (level, arena record, dungeon clears, achievements, lifetime gold, guild
 * membership) — exactly like titles and achievements. The only things stored are
 * the three equipped keys (`Character.avatar` / `frameColor` / `banner`, all
 * nullable). No per-cosmetic table.
 *
 * The handful of premium cosmetics are "bought" with mushrooms. Ownership is
 * itself derived — from a COSMETIC_PURCHASE row in the currency ledger — so it
 * needs no extra storage and survives being unequipped and re-equipped without
 * charging twice. Because there are several premium cosmetics, each purchase
 * tags its ledger reason with the cosmetic key (`COSMETIC_PURCHASE:<key>`), so
 * we can tell exactly which ones a hero owns.
 */

import { prisma } from "@/lib/db";
import { DUNGEONS } from "@/lib/game";
import { currencyLedgerOps, type LedgerReason } from "@/lib/ledger";
import type { ActionResult } from "@/lib/actions";

// ---------------------------------------------------------------------------
// Kinds & storage mapping
// ---------------------------------------------------------------------------

export type CosmeticKind = "avatar" | "frame" | "banner";

/** Which `Character` column stores the equipped key for a given kind. */
const KIND_COLUMN: Record<CosmeticKind, "avatar" | "frameColor" | "banner"> = {
  avatar: "avatar",
  frame: "frameColor",
  banner: "banner",
};

/** Ledger reason for a premium buy, tagged with the cosmetic key. */
const purchaseReason = (key: string): LedgerReason =>
  `COSMETIC_PURCHASE:${key}` as LedgerReason;

// ---------------------------------------------------------------------------
// The context every unlock predicate is evaluated against
// ---------------------------------------------------------------------------

export interface CosmeticContext {
  level: number;
  arenaWins: number;
  arenaLosses: number;
  /** How many distinct dungeons have been fully conquered. */
  dungeonsFullyCleared: number;
  /** Rows in CharacterAchievement — milestones actually earned. */
  achievementsEarned: number;
  /** Lifetime gold *earned* — sum of positive GOLD deltas in the ledger. */
  goldEarnedTotal: number;
  hasGuild: boolean;
  /** Keys of every premium cosmetic the hero has bought (any kind). */
  ownedPremiumKeys: Set<string>;
}

// ---------------------------------------------------------------------------
// Catalog definitions
// ---------------------------------------------------------------------------

export interface CosmeticDef {
  key: string;
  label: string;
  /** The thing that actually gets shown: an emoji, or a hex colour for frames. */
  value: string;
  /** One dry line of dressing-room flavour. */
  flavor: string;
  /** True when the hero has earned (or bought) the right to wear this. */
  predicate: (ctx: CosmeticContext) => boolean;
  /** Short "how to get it" hint shown while it's still locked. */
  progress: (ctx: CosmeticContext) => string;
  /** Mushroom price if this is a buyable premium cosmetic. */
  premiumCost?: number;
}

/** "3 / 10 wins" style progress helper. */
const bar = (have: number, need: number, noun: string) =>
  `${Math.min(have, need).toLocaleString()} / ${need.toLocaleString()} ${noun}`;

/** Standard progress line for a premium (buyable) cosmetic. */
const buyHint = (cost: number) => `Buy it for ${cost}🍄 in the dressing room.`;

// — Avatars (portrait emoji) ————————————————————————————————————————
export const AVATARS: CosmeticDef[] = [
  {
    key: "hopeful_smile",
    label: "Hopeful Smile",
    value: "🙂",
    flavor: "The face of someone who hasn't read the quest board yet.",
    predicate: () => true,
    progress: () => "Yours from the moment you rolled a hero.",
  },
  {
    key: "cool_shades",
    label: "Cool Customer",
    value: "😎",
    flavor: "Reach level 5. Confidence: unearned, but growing.",
    predicate: (c) => c.level >= 5,
    progress: (c) => bar(c.level, 5, "levels"),
  },
  {
    key: "trail_worn",
    label: "Trail-Worn Wanderer",
    value: "🤠",
    flavor: "Earn 10,000 gold. Enough dust on your boots to plant a garden.",
    predicate: (c) => c.goldEarnedTotal >= 10_000,
    progress: (c) => bar(c.goldEarnedTotal, 10_000, "gold earned"),
  },
  {
    key: "battle_snarl",
    label: "Battle-Snarl",
    value: "👹",
    flavor: "Win 10 duels. The Arena crowd learned your face the hard way.",
    predicate: (c) => c.arenaWins >= 10,
    progress: (c) => bar(c.arenaWins, 10, "wins"),
  },
  {
    key: "sore_loser",
    label: "The Sore Loser",
    value: "👺",
    flavor: "Lose 15 duels. Worn with a grimace, not a grin.",
    predicate: (c) => c.arenaLosses >= 15,
    progress: (c) => bar(c.arenaLosses, 15, "losses"),
  },
  {
    key: "crypt_pallor",
    label: "Crypt Pallor",
    value: "🧛",
    flavor: "Fully clear a dungeon. You've seen things down there. Pale things.",
    predicate: (c) => c.dungeonsFullyCleared >= 1,
    progress: (c) => bar(c.dungeonsFullyCleared, 1, "dungeons"),
  },
  {
    key: "arcane_elder",
    label: "Arcane Elder",
    value: "🧙",
    flavor: "Reach level 20. The beard is mostly for credibility.",
    predicate: (c) => c.level >= 20,
    progress: (c) => bar(c.level, 20, "levels"),
  },
  {
    key: "caped_paragon",
    label: "Caped Paragon",
    value: "🦸",
    flavor: "Earn 10 achievements. You do this for the people. And the cape.",
    predicate: (c) => c.achievementsEarned >= 10,
    progress: (c) => bar(c.achievementsEarned, 10, "achievements"),
  },
  // — Premium —
  {
    key: "gilded_dragon",
    label: "Gilded Dragonling",
    value: "🐲",
    flavor: "Not hatched — purchased. The only dragon that accepts mushrooms.",
    predicate: (c) => c.ownedPremiumKeys.has("gilded_dragon"),
    progress: () => buyHint(4),
    premiumCost: 4,
  },
  {
    key: "crowned_ego",
    label: "Crowned Ego",
    value: "🤴",
    flavor: "Royalty is a state of mind, and also a mushroom transaction.",
    predicate: (c) => c.ownedPremiumKeys.has("crowned_ego"),
    progress: () => buyHint(6),
    premiumCost: 6,
  },
];

// — Frame colours (hex ring around the portrait) ————————————————————
export const FRAME_COLORS: CosmeticDef[] = [
  {
    key: "bronze",
    label: "Weathered Bronze",
    value: "#b99b78",
    flavor: "The starter frame. Humble, honest, faintly green in the rain.",
    predicate: () => true,
    progress: () => "Yours from the very start.",
  },
  {
    key: "iron",
    label: "Cold Iron",
    value: "#9aa4ad",
    flavor: "Reach level 5. Sturdier than it looks, like your resolve.",
    predicate: (c) => c.level >= 5,
    progress: (c) => bar(c.level, 5, "levels"),
  },
  {
    key: "crimson",
    label: "Arena Crimson",
    value: "#d64b4b",
    flavor: "Win 10 duels. The colour of other people's misfortune.",
    predicate: (c) => c.arenaWins >= 10,
    progress: (c) => bar(c.arenaWins, 10, "wins"),
  },
  {
    key: "emerald",
    label: "Delver's Emerald",
    value: "#3fb56b",
    flavor: "Fully clear a dungeon. Slightly damp, definitely earned.",
    predicate: (c) => c.dungeonsFullyCleared >= 1,
    progress: (c) => bar(c.dungeonsFullyCleared, 1, "dungeons"),
  },
  {
    key: "sapphire",
    label: "Scholar's Sapphire",
    value: "#4aa3df",
    flavor: "Reach level 20. Cool, deep, and a little smug about it.",
    predicate: (c) => c.level >= 20,
    progress: (c) => bar(c.level, 20, "levels"),
  },
  {
    key: "amethyst",
    label: "Decorated Amethyst",
    value: "#a55eea",
    flavor: "Earn 10 achievements. Purple: the official colour of showing off.",
    predicate: (c) => c.achievementsEarned >= 10,
    progress: (c) => bar(c.achievementsEarned, 10, "achievements"),
  },
  {
    key: "royal_gold",
    label: "Royal Gold",
    value: "#e8b923",
    flavor: "Earn 25,000 gold. Blinding, tasteless, wonderful.",
    predicate: (c) => c.goldEarnedTotal >= 25_000,
    progress: (c) => bar(c.goldEarnedTotal, 25_000, "gold earned"),
  },
  // — Premium —
  {
    key: "prismatic",
    label: "Prismatic Shimmer",
    value: "#ff6ab5",
    flavor: "A frame that can't decide on a colour, purchased by one who can't decide on restraint.",
    predicate: (c) => c.ownedPremiumKeys.has("prismatic"),
    progress: () => buyHint(4),
    premiumCost: 4,
  },
];

// — Banners (emblem flown over the card) ————————————————————————————
export const BANNERS: CosmeticDef[] = [
  {
    key: "tavern_pennant",
    label: "Tavern Pennant",
    value: "🎗️",
    flavor: "The house colours of your favourite barstool.",
    predicate: () => true,
    progress: () => "Yours from the very start.",
  },
  {
    key: "crossed_swords",
    label: "Crossed Swords",
    value: "⚔️",
    flavor: "Win 5 duels. Flown by heroes who enjoy a good grudge.",
    predicate: (c) => c.arenaWins >= 5,
    progress: (c) => bar(c.arenaWins, 5, "wins"),
  },
  {
    key: "delvers_torch",
    label: "Delver's Torch",
    value: "🔦",
    flavor: "Fully clear a dungeon. It smells faintly of goblin down there.",
    predicate: (c) => c.dungeonsFullyCleared >= 1,
    progress: (c) => bar(c.dungeonsFullyCleared, 1, "dungeons"),
  },
  {
    key: "laurel_wreath",
    label: "Laurel Wreath",
    value: "🏆",
    flavor: "Earn 5 achievements. Traditional wear for the mildly accomplished.",
    predicate: (c) => c.achievementsEarned >= 5,
    progress: (c) => bar(c.achievementsEarned, 5, "achievements"),
  },
  {
    key: "guild_standard",
    label: "Guild Standard",
    value: "🏰",
    flavor: "Join or found a guild. Fly the colours, mind the group chat.",
    predicate: (c) => c.hasGuild,
    progress: () => "Join or found a guild.",
  },
  {
    key: "summit_flag",
    label: "Summit Flag",
    value: "🏔️",
    flavor: "Reach level 25. Planted at altitude, where the air is thin and the bards are loud.",
    predicate: (c) => c.level >= 25,
    progress: (c) => bar(c.level, 25, "levels"),
  },
  {
    key: "coin_hoard",
    label: "Coin Hoard",
    value: "💰",
    flavor: "Earn 50,000 gold. The tax collector would like a word.",
    predicate: (c) => c.goldEarnedTotal >= 50_000,
    progress: (c) => bar(c.goldEarnedTotal, 50_000, "gold earned"),
  },
  // — Premium —
  {
    key: "grand_fireworks",
    label: "Grand Fireworks",
    value: "🎆",
    flavor: "Every entrance an occasion. Sold, not celebrated.",
    predicate: (c) => c.ownedPremiumKeys.has("grand_fireworks"),
    progress: () => buyHint(5),
    premiumCost: 5,
  },
];

const CATALOG: Record<CosmeticKind, CosmeticDef[]> = {
  avatar: AVATARS,
  frame: FRAME_COLORS,
  banner: BANNERS,
};

export function getCosmetic(
  kind: CosmeticKind,
  key: string,
): CosmeticDef | undefined {
  return CATALOG[kind].find((c) => c.key === key);
}

// ---------------------------------------------------------------------------
// Context assembly
// ---------------------------------------------------------------------------

/** Gather everything the predicates need from existing hero data. */
export async function buildCosmeticContext(
  characterId: string,
): Promise<CosmeticContext | null> {
  const [character, dungeons, achievementsEarned, goldAgg, purchases] =
    await Promise.all([
      prisma.character.findUnique({
        where: { id: characterId },
        select: {
          level: true,
          arenaWins: true,
          arenaLosses: true,
          guildId: true,
        },
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
      prisma.currencyLedger.findMany({
        where: { characterId, reason: { startsWith: "COSMETIC_PURCHASE" } },
        select: { reason: true },
      }),
    ]);

  if (!character) return null;

  // A dungeon is fully conquered when it's marked cleared, or the hero has
  // advanced past its final floor.
  const dungeonsFullyCleared = dungeons.filter((d) => {
    const def = DUNGEONS.find((x) => x.key === d.dungeonKey);
    return d.clearedAt != null || (def != null && d.floor > def.floors);
  }).length;

  // Each premium purchase tags its reason as "COSMETIC_PURCHASE:<key>".
  const ownedPremiumKeys = new Set(
    purchases
      .map((p) => p.reason.split(":")[1])
      .filter((k): k is string => Boolean(k)),
  );

  return {
    level: character.level,
    arenaWins: character.arenaWins,
    arenaLosses: character.arenaLosses,
    dungeonsFullyCleared,
    achievementsEarned,
    goldEarnedTotal: goldAgg._sum.delta ?? 0,
    hasGuild: character.guildId != null,
    ownedPremiumKeys,
  };
}

// ---------------------------------------------------------------------------
// Evaluation (for display)
// ---------------------------------------------------------------------------

export interface EvaluatedCosmetic {
  kind: CosmeticKind;
  key: string;
  label: string;
  value: string;
  flavor: string;
  /** Whether the hero has earned/bought the right to wear this. */
  unlocked: boolean;
  /** Whether this is the one currently equipped in its slot. */
  equipped: boolean;
  /** True for buyable premium cosmetics. */
  premium: boolean;
  /** Mushroom price, if premium. */
  cost: number | null;
  /** Locked → how to get it; unlocked → null. */
  progressText: string | null;
}

export interface EvaluatedCosmetics {
  avatars: EvaluatedCosmetic[];
  frames: EvaluatedCosmetic[];
  banners: EvaluatedCosmetic[];
}

function evaluate(
  kind: CosmeticKind,
  defs: CosmeticDef[],
  ctx: CosmeticContext | null,
  equippedKey: string | null,
): EvaluatedCosmetic[] {
  return defs.map((def) => {
    const unlocked = ctx ? def.predicate(ctx) : false;
    return {
      kind,
      key: def.key,
      label: def.label,
      value: def.value,
      flavor: def.flavor,
      unlocked,
      equipped: equippedKey === def.key,
      premium: def.premiumCost != null,
      cost: def.premiumCost ?? null,
      progressText: unlocked ? null : ctx ? def.progress(ctx) : "No hero data",
    };
  });
}

/**
 * Evaluate all three catalogs for a hero: assemble the context, read the three
 * equipped keys, and annotate every entry for the UI. Reads only — equipping and
 * buying are the server actions below.
 */
export async function loadCosmetics(
  characterId: string,
): Promise<EvaluatedCosmetics> {
  const [ctx, character] = await Promise.all([
    buildCosmeticContext(characterId),
    prisma.character.findUnique({
      where: { id: characterId },
      select: { avatar: true, frameColor: true, banner: true },
    }),
  ]);

  return {
    avatars: evaluate("avatar", AVATARS, ctx, character?.avatar ?? null),
    frames: evaluate("frame", FRAME_COLORS, ctx, character?.frameColor ?? null),
    banners: evaluate("banner", BANNERS, ctx, character?.banner ?? null),
  };
}

// ---------------------------------------------------------------------------
// Server actions
// ---------------------------------------------------------------------------

/**
 * Equip an unlocked cosmetic into its slot. The unlock is re-derived server-side,
 * so a client can't equip something it hasn't earned by fabricating a key.
 */
export async function equipCosmetic(
  kind: CosmeticKind,
  key: string,
): Promise<ActionResult> {
  "use server";

  const { loadCharacter } = await import("@/lib/data");
  const { revalidatePath } = await import("next/cache");

  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const def = getCosmetic(kind, key);
  if (!def) return { ok: false, message: "No such cosmetic." };

  const ctx = await buildCosmeticContext(character.id);
  if (!ctx) return { ok: false, message: "No hero found." };

  if (!def.predicate(ctx)) {
    return {
      ok: false,
      message: def.premiumCost
        ? `“${def.label}” must be bought first.`
        : `You haven't unlocked “${def.label}” yet.`,
    };
  }

  await prisma.character.update({
    where: { id: character.id },
    data: { [KIND_COLUMN[kind]]: key },
  });

  revalidatePath("/");
  return { ok: true, message: `Now sporting ${def.value} ${def.label}.` };
}

/** Clear a cosmetic slot, going back to the plain default look. */
export async function unequipCosmetic(
  kind: CosmeticKind,
): Promise<ActionResult> {
  "use server";

  const { loadCharacter } = await import("@/lib/data");
  const { revalidatePath } = await import("next/cache");

  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  await prisma.character.update({
    where: { id: character.id },
    data: { [KIND_COLUMN[kind]]: null },
  });

  revalidatePath("/");
  return { ok: true, message: "Slot cleared. Back to the classic look." };
}

/**
 * Buy a premium cosmetic with mushrooms, then equip it. Ownership is recorded as
 * a COSMETIC_PURCHASE:<key> ledger row (the source of truth for the derived
 * unlock), so re-equipping later never charges again.
 */
export async function buyCosmetic(
  kind: CosmeticKind,
  key: string,
): Promise<ActionResult> {
  "use server";

  const { loadCharacter } = await import("@/lib/data");
  const { revalidatePath } = await import("next/cache");

  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const def = getCosmetic(kind, key);
  if (!def || def.premiumCost == null) {
    return { ok: false, message: "That cosmetic isn't for sale." };
  }

  const cost = def.premiumCost;
  const ctx = await buildCosmeticContext(character.id);
  if (!ctx) return { ok: false, message: "No hero found." };

  // Already owned — just equip it, free of charge.
  if (ctx.ownedPremiumKeys.has(key)) {
    await prisma.character.update({
      where: { id: character.id },
      data: { [KIND_COLUMN[kind]]: key },
    });
    revalidatePath("/");
    return { ok: true, message: `Now sporting ${def.value} ${def.label}.` };
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
      data: { mushrooms: character.mushrooms - cost, [KIND_COLUMN[kind]]: key },
    }),
    ...currencyLedgerOps(
      character.id,
      { gold: character.gold, mushrooms: character.mushrooms },
      { mushrooms: -cost },
      purchaseReason(key),
    ),
  ]);

  revalidatePath("/");
  return {
    ok: true,
    message: `Sold! The tailor pins on ${def.value} ${def.label} with a flourish.`,
  };
}
