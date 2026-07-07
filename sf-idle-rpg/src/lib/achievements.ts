/**
 * Achievements — code-defined milestones that recognise player *prestige*
 * (not power). Definitions live here; the database only records what a hero
 * has earned (see the CharacterAchievement model). Owned by this module.
 *
 * These evaluate purely from existing hero data (level, arena record, quest
 * history, dungeon depth, gear, guild membership, lifetime gold). No currency
 * is awarded — unlocking is its own reward. Bragging rights are non-inflationary.
 */

import { prisma } from "@/lib/db";
import { RARITIES, type Rarity } from "@/lib/game";
import type { ActionResult } from "@/lib/actions";

// ---------------------------------------------------------------------------
// The context every predicate is evaluated against
// ---------------------------------------------------------------------------

export interface AchievementContext {
  level: number;
  arenaWins: number;
  /** Rows in QuestLog — how many quests have paid out. */
  totalQuestsCompleted: number;
  /** Sum of cleared floors across every dungeon run. */
  dungeonFloorsCleared: number;
  /** Pieces of gear the hero actually holds (inventory + equipped, not shop). */
  itemsOwned: number;
  hasGuild: boolean;
  /** Lifetime gold *earned* — sum of positive GOLD deltas in the ledger. */
  goldEarnedTotal: number;
  /** Best rarity the hero owns, or null if they own nothing. */
  highestRarityOwned: Rarity | null;
}

export type AchievementTier = "Bronze" | "Silver" | "Gold";

export interface AchievementDef {
  key: string;
  name: string;
  emoji: string;
  description: string;
  tier: AchievementTier;
  /** True when the milestone is satisfied by the current context. */
  predicate: (ctx: AchievementContext) => boolean;
  /** Short "how close am I" hint shown while the achievement is still locked. */
  progress: (ctx: AchievementContext) => string;
}

// Rarity ordering, so "own a Legendary" style checks are easy.
const RARITY_RANK: Record<Rarity, number> = RARITIES.reduce(
  (acc, r, i) => ({ ...acc, [r.id]: i }),
  {} as Record<Rarity, number>,
);

function rarityAtLeast(owned: Rarity | null, min: Rarity): boolean {
  return owned != null && RARITY_RANK[owned] >= RARITY_RANK[min];
}

/** "3 / 10 quests" style progress helper. */
const bar = (have: number, need: number, noun: string) =>
  `${Math.min(have, need).toLocaleString()} / ${need.toLocaleString()} ${noun}`;

// ---------------------------------------------------------------------------
// The catalog — ~17 milestones across three tiers
// ---------------------------------------------------------------------------

export const ACHIEVEMENTS: AchievementDef[] = [
  // — Levelling ————————————————————————————————————————————————
  {
    key: "level_5",
    name: "Wet Behind the Ears",
    emoji: "🐣",
    description: "Reach level 5. The tutorial goblins never stood a chance.",
    tier: "Bronze",
    predicate: (c) => c.level >= 5,
    progress: (c) => bar(c.level, 5, "levels"),
  },
  {
    key: "level_15",
    name: "Local Celebrity",
    emoji: "🎖️",
    description: "Reach level 15. Villagers now nod at you in the street.",
    tier: "Silver",
    predicate: (c) => c.level >= 15,
    progress: (c) => bar(c.level, 15, "levels"),
  },
  {
    key: "level_30",
    name: "Absolute Unit",
    emoji: "🏔️",
    description: "Reach level 30. The bards have run out of superlatives.",
    tier: "Gold",
    predicate: (c) => c.level >= 30,
    progress: (c) => bar(c.level, 30, "levels"),
  },

  // — Quests ———————————————————————————————————————————————————
  {
    key: "quest_1",
    name: "Gainfully Employed",
    emoji: "🥾",
    description: "Finish your first quest. A goat was escorted. Probably.",
    tier: "Bronze",
    predicate: (c) => c.totalQuestsCompleted >= 1,
    progress: (c) => bar(c.totalQuestsCompleted, 1, "quests"),
  },
  {
    key: "quest_25",
    name: "Errand Enthusiast",
    emoji: "📜",
    description: "Complete 25 quests. The cabbages deliver themselves now.",
    tier: "Silver",
    predicate: (c) => c.totalQuestsCompleted >= 25,
    progress: (c) => bar(c.totalQuestsCompleted, 25, "quests"),
  },
  {
    key: "quest_100",
    name: "Certified Adventurer™",
    emoji: "🗺️",
    description: "Complete 100 quests. You have seen every haunted outhouse.",
    tier: "Gold",
    predicate: (c) => c.totalQuestsCompleted >= 100,
    progress: (c) => bar(c.totalQuestsCompleted, 100, "quests"),
  },

  // — Arena ————————————————————————————————————————————————————
  {
    key: "arena_1",
    name: "First Blood",
    emoji: "🩸",
    description: "Win a duel in the Arena. Brenda from Accounting will remember this.",
    tier: "Bronze",
    predicate: (c) => c.arenaWins >= 1,
    progress: (c) => bar(c.arenaWins, 1, "wins"),
  },
  {
    key: "arena_25",
    name: "Crowd Favourite",
    emoji: "🛡️",
    description: "Win 25 duels. They chant a name. It is roughly yours.",
    tier: "Silver",
    predicate: (c) => c.arenaWins >= 25,
    progress: (c) => bar(c.arenaWins, 25, "wins"),
  },
  {
    key: "arena_100",
    name: "Are You Not Entertained",
    emoji: "👑",
    description: "Win 100 duels. The Arena is basically your second home.",
    tier: "Gold",
    predicate: (c) => c.arenaWins >= 100,
    progress: (c) => bar(c.arenaWins, 100, "wins"),
  },

  // — Dungeons —————————————————————————————————————————————————
  {
    key: "dungeon_1",
    name: "Rat Bane",
    emoji: "🐀",
    description: "Clear a dungeon floor. Somebody had to go down there.",
    tier: "Bronze",
    predicate: (c) => c.dungeonFloorsCleared >= 1,
    progress: (c) => bar(c.dungeonFloorsCleared, 1, "floors"),
  },
  {
    key: "dungeon_15",
    name: "Professional Spelunker",
    emoji: "🕳️",
    description: "Clear 15 dungeon floors. Darkness holds no more surprises. Mostly.",
    tier: "Silver",
    predicate: (c) => c.dungeonFloorsCleared >= 15,
    progress: (c) => bar(c.dungeonFloorsCleared, 15, "floors"),
  },
  {
    key: "dungeon_30",
    name: "Delvemaster",
    emoji: "⚰️",
    description: "Clear 30 dungeon floors. You dream in torchlight now.",
    tier: "Gold",
    predicate: (c) => c.dungeonFloorsCleared >= 30,
    progress: (c) => bar(c.dungeonFloorsCleared, 30, "floors"),
  },

  // — Wealth ———————————————————————————————————————————————————
  {
    key: "gold_1k",
    name: "Jingling Pockets",
    emoji: "🪙",
    description: "Earn 1,000 gold in total. Don't spend it all on potions.",
    tier: "Bronze",
    predicate: (c) => c.goldEarnedTotal >= 1_000,
    progress: (c) => bar(c.goldEarnedTotal, 1_000, "gold earned"),
  },
  {
    key: "gold_50k",
    name: "Suspiciously Wealthy",
    emoji: "💰",
    description: "Earn 50,000 gold in total. The tax collector has questions.",
    tier: "Gold",
    predicate: (c) => c.goldEarnedTotal >= 50_000,
    progress: (c) => bar(c.goldEarnedTotal, 50_000, "gold earned"),
  },

  // — Gear —————————————————————————————————————————————————————
  {
    key: "gear_5",
    name: "Well Equipped",
    emoji: "🎒",
    description: "Own 5 pieces of gear at once. A hero needs options.",
    tier: "Bronze",
    predicate: (c) => c.itemsOwned >= 5,
    progress: (c) => bar(c.itemsOwned, 5, "items"),
  },
  {
    key: "gear_legendary",
    name: "Main Character Energy",
    emoji: "🌟",
    description: "Own a Legendary item. It glows. People stare. You love it.",
    tier: "Gold",
    predicate: (c) => rarityAtLeast(c.highestRarityOwned, "LEGENDARY"),
    progress: (c) =>
      c.highestRarityOwned
        ? `Best owned: ${c.highestRarityOwned.toLowerCase()}`
        : "No gear owned yet",
  },

  // — Social ———————————————————————————————————————————————————
  {
    key: "guild_join",
    name: "Team Player",
    emoji: "🏰",
    description: "Join or found a guild. Adventuring is better with a group chat.",
    tier: "Bronze",
    predicate: (c) => c.hasGuild,
    progress: () => "Not in a guild yet",
  },
];

// ---------------------------------------------------------------------------
// Context assembly
// ---------------------------------------------------------------------------

/** Gather everything the predicates need from existing hero data. */
export async function buildAchievementContext(
  characterId: string,
): Promise<AchievementContext | null> {
  const [character, totalQuestsCompleted, dungeons, items, goldAgg] =
    await Promise.all([
      prisma.character.findUnique({
        where: { id: characterId },
        select: { level: true, arenaWins: true, guildId: true },
      }),
      prisma.questLog.count({ where: { characterId } }),
      prisma.dungeonProgress.findMany({
        where: { characterId },
        select: { floor: true },
      }),
      // "Owned" gear = held (inventory or equipped), not shop stock on offer.
      prisma.item.findMany({
        where: { characterId, location: { not: "SHOP" } },
        select: { rarity: true },
      }),
      prisma.currencyLedger.aggregate({
        where: { characterId, currency: "GOLD", delta: { gt: 0 } },
        _sum: { delta: true },
      }),
    ]);

  if (!character) return null;

  // `floor` is the *next* floor to attempt, so cleared = floor - 1.
  const dungeonFloorsCleared = dungeons.reduce(
    (sum, d) => sum + Math.max(0, d.floor - 1),
    0,
  );

  let highestRarityOwned: Rarity | null = null;
  for (const it of items) {
    const r = it.rarity as Rarity;
    if (
      RARITY_RANK[r] != null &&
      (highestRarityOwned === null ||
        RARITY_RANK[r] > RARITY_RANK[highestRarityOwned])
    ) {
      highestRarityOwned = r;
    }
  }

  return {
    level: character.level,
    arenaWins: character.arenaWins,
    totalQuestsCompleted,
    dungeonFloorsCleared,
    itemsOwned: items.length,
    hasGuild: character.guildId != null,
    goldEarnedTotal: goldAgg._sum.delta ?? 0,
    highestRarityOwned,
  };
}

// ---------------------------------------------------------------------------
// Evaluation (for display) + sync (for persistence)
// ---------------------------------------------------------------------------

export interface EvaluatedAchievement extends AchievementDef {
  /** Whether this milestone has been earned and recorded. */
  unlocked: boolean;
  unlockedAt: Date | null;
  /** Locked → progress hint or "ready to claim"; unlocked → null. */
  progressText: string | null;
  tier: AchievementTier;
}

/**
 * Evaluate the whole catalog for a hero: assemble the context, cross-reference
 * the persisted unlocks, and annotate each achievement for the UI. Does not
 * write anything — call `syncAchievements` to materialise new unlocks.
 */
export async function evaluateAchievements(
  characterId: string,
): Promise<EvaluatedAchievement[]> {
  const [ctx, earned] = await Promise.all([
    buildAchievementContext(characterId),
    prisma.characterAchievement.findMany({
      where: { characterId },
      select: { key: true, unlockedAt: true },
    }),
  ]);

  const earnedAt = new Map(earned.map((e) => [e.key, e.unlockedAt]));

  return ACHIEVEMENTS.map((def) => {
    const unlockedAt = earnedAt.get(def.key) ?? null;
    const unlocked = unlockedAt !== null;
    const satisfied = ctx ? def.predicate(ctx) : false;

    let progressText: string | null = null;
    if (!unlocked) {
      progressText =
        satisfied && ctx
          ? "Ready to claim — check achievements!"
          : ctx
            ? def.progress(ctx)
            : "No hero data";
    }

    return { ...def, unlocked, unlockedAt, progressText };
  });
}

/**
 * Evaluate the catalog and persist any newly-satisfied achievements.
 * Idempotent: the @@unique([characterId, key]) plus skipDuplicates means
 * re-running never double-inserts. Prestige only — no currency is granted.
 */
export async function syncAchievements(): Promise<ActionResult> {
  "use server";

  const { loadCharacter } = await import("@/lib/data");
  const { revalidatePath } = await import("next/cache");

  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const ctx = await buildAchievementContext(character.id);
  if (!ctx) return { ok: false, message: "No hero found." };

  const already = new Set(
    (
      await prisma.characterAchievement.findMany({
        where: { characterId: character.id },
        select: { key: true },
      })
    ).map((r) => r.key),
  );

  const newlyUnlocked = ACHIEVEMENTS.filter(
    (a) => !already.has(a.key) && a.predicate(ctx),
  );

  if (newlyUnlocked.length === 0) {
    return {
      ok: true,
      message: "No new achievements — keep adventuring! 🗺️",
    };
  }

  await prisma.characterAchievement.createMany({
    data: newlyUnlocked.map((a) => ({
      characterId: character.id,
      key: a.key,
    })),
    skipDuplicates: true,
  });

  revalidatePath("/");

  const names = newlyUnlocked.map((a) => `${a.emoji} ${a.name}`).join(", ");
  const n = newlyUnlocked.length;
  return {
    ok: true,
    message: `Achievement${n > 1 ? "s" : ""} unlocked (${n}): ${names}! 🎉`,
  };
}
