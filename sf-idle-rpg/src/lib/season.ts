import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { loadCharacter } from "@/lib/data";
import { currencyLedgerOps, type CurrencyDelta } from "@/lib/ledger";
import type { ActionResult } from "@/lib/actions";

// ---------------------------------------------------------------------------
// Seasonal Pass — the retention spine.
//
// A single-track reward pass whose progress is DERIVED from how much the hero
// has actually played: level, arena wins, quests finished, dungeon floors,
// tower depth, achievements, and world-boss hits are weighted into "Season
// Points". Crossing a tier's cumulative threshold *unlocks* its reward; the
// hero then *claims* it. Rewards always flow through the currency ledger under
// "SEASON_REWARD", inside the same transaction that records the claim, so
// balances and the audit trail can never drift.
//
// This module owns the SeasonPassState table (one row per hero, lazily
// created). Everything is server-authoritative: points are recomputed from the
// source data on every load and claim, and the browser never decides a tier is
// unlocked. Owned by the Seasonal Pass feature (this file).
// ---------------------------------------------------------------------------

/** The season currently running. Also the SeasonPassState default. */
export const CURRENT_SEASON = "season-1";

/** How much each activity is worth in Season Points. */
export const POINT_WEIGHTS = {
  /** Per hero level. */
  level: 12,
  /** Per arena win. */
  arenaWin: 6,
  /** Per completed quest (QuestLog row). */
  quest: 3,
  /** Per dungeon floor cleared (summed across dungeons). */
  dungeonFloor: 10,
  /** Per floor of the hero's best Tower climb. */
  towerFloor: 14,
  /** Per achievement earned. */
  achievement: 30,
  /** Per world-boss hit landed. */
  worldBossHit: 8,
} as const;

/** A tier's reward payload — a subset of the wallet, granted on claim. */
export interface SeasonReward {
  gold?: number;
  dust?: number;
  mushrooms?: number;
}

export interface SeasonTierDef {
  index: number;
  /** Cumulative Season Points required to unlock this tier. */
  threshold: number;
  reward: SeasonReward;
}

/** How many tiers the track has. */
export const TIER_COUNT = 25;

/** Milestone tiers (every 5th) also drop a premium mushroom. */
function isMilestone(index: number): boolean {
  return (index + 1) % 5 === 0;
}

/**
 * The reward pass track. Thresholds are cumulative and escalate (each tier
 * costs more points than the last); rewards escalate to match. Generated once
 * at module load so the definition is the single source of truth for both the
 * server actions and the UI.
 */
export const SEASON_TIERS: SeasonTierDef[] = buildTiers();

function buildTiers(): SeasonTierDef[] {
  const tiers: SeasonTierDef[] = [];
  let cumulative = 0;
  for (let i = 0; i < TIER_COUNT; i++) {
    // Per-tier cost grows linearly, so cumulative thresholds curve upward.
    const step = 60 + i * 45;
    cumulative += step;
    const milestone = isMilestone(i);
    tiers.push({
      index: i,
      threshold: cumulative,
      reward: {
        gold: 250 + i * 175,
        dust: 4 + i * 2,
        ...(milestone ? { mushrooms: 1 + Math.floor(i / 5) } : {}),
      },
    });
  }
  return tiers;
}

// ---------------------------------------------------------------------------
// Points: derived from existing hero activity
// ---------------------------------------------------------------------------

/**
 * Recompute a hero's Season Points from the source data. Mirrors the
 * "derive from counts" pattern used by achievements: gather the raw counts,
 * then apply the weights. Read-only.
 */
export async function computeSeasonPoints(characterId: string): Promise<number> {
  const [character, quests, dungeons, tower, achievements, bossHits] =
    await Promise.all([
      prisma.character.findUnique({
        where: { id: characterId },
        select: { level: true, arenaWins: true },
      }),
      prisma.questLog.count({ where: { characterId } }),
      prisma.dungeonProgress.findMany({
        where: { characterId },
        select: { floor: true },
      }),
      prisma.towerState.findUnique({
        where: { characterId },
        select: { highestFloor: true },
      }),
      prisma.characterAchievement.count({ where: { characterId } }),
      prisma.worldBossHit.count({ where: { characterId } }),
    ]);

  if (!character) return 0;

  // `floor` is the *next* floor to attempt, so cleared = floor - 1.
  const dungeonFloorsCleared = dungeons.reduce(
    (sum, d) => sum + Math.max(0, d.floor - 1),
    0,
  );

  const points =
    character.level * POINT_WEIGHTS.level +
    character.arenaWins * POINT_WEIGHTS.arenaWin +
    quests * POINT_WEIGHTS.quest +
    dungeonFloorsCleared * POINT_WEIGHTS.dungeonFloor +
    (tower?.highestFloor ?? 0) * POINT_WEIGHTS.towerFloor +
    achievements * POINT_WEIGHTS.achievement +
    bossHits * POINT_WEIGHTS.worldBossHit;

  return Math.max(0, Math.round(points));
}

// ---------------------------------------------------------------------------
// Loading (lazily creates the row)
// ---------------------------------------------------------------------------

export interface SeasonTierView extends SeasonTierDef {
  /** Points threshold reached — reward is available (or already taken). */
  unlocked: boolean;
  /** Reward already collected. */
  claimed: boolean;
}

export interface SeasonPassView {
  season: string;
  points: number;
  /** How many tiers the hero has unlocked (0..TIER_COUNT). */
  currentTier: number;
  tiers: SeasonTierView[];
}

/** Parse the stored claimed-indices JSON into a Set, defensively. */
function parseClaimed(raw: string): Set<number> {
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      return new Set(arr.filter((n): n is number => typeof n === "number"));
    }
  } catch {
    /* fall through to empty */
  }
  return new Set();
}

/**
 * Load a hero's Seasonal Pass: recompute their points, cross-reference the
 * claimed tiers, and annotate the whole track for the UI. Lazily creates the
 * SeasonPassState row on first open so the feature demonstrates itself.
 */
export async function loadSeasonPass(
  characterId: string,
): Promise<SeasonPassView> {
  const [state, points] = await Promise.all([
    prisma.seasonPassState.upsert({
      where: { characterId },
      update: {},
      create: { characterId, season: CURRENT_SEASON },
    }),
    computeSeasonPoints(characterId),
  ]);

  const claimed = parseClaimed(state.claimed);

  const tiers: SeasonTierView[] = SEASON_TIERS.map((t) => ({
    ...t,
    unlocked: points >= t.threshold,
    claimed: claimed.has(t.index),
  }));

  const currentTier = tiers.filter((t) => t.unlocked).length;

  return { season: state.season, points, currentTier, tiers };
}

// ---------------------------------------------------------------------------
// Reward helpers
// ---------------------------------------------------------------------------

/** Turn a tier reward into a ledger/currency delta. */
function rewardDelta(reward: SeasonReward): CurrencyDelta {
  return {
    gold: reward.gold ?? 0,
    dust: reward.dust ?? 0,
    mushrooms: reward.mushrooms ?? 0,
  };
}

/** Human-friendly one-liner describing a reward. */
export function describeSeasonReward(reward: SeasonReward): string {
  const parts: string[] = [];
  if (reward.gold) parts.push(`+${reward.gold.toLocaleString()}🪙`);
  if (reward.dust) parts.push(`+${reward.dust}✨`);
  if (reward.mushrooms) parts.push(`+${reward.mushrooms}🍄`);
  return parts.join(" ");
}

/** Sum a batch of rewards into a single delta. */
function sumRewards(rewards: SeasonReward[]): CurrencyDelta {
  return rewards.reduce<CurrencyDelta>(
    (sum, r) => ({
      gold: (sum.gold ?? 0) + (r.gold ?? 0),
      dust: (sum.dust ?? 0) + (r.dust ?? 0),
      mushrooms: (sum.mushrooms ?? 0) + (r.mushrooms ?? 0),
    }),
    { gold: 0, dust: 0, mushrooms: 0 },
  );
}

// ---------------------------------------------------------------------------
// Server actions
// ---------------------------------------------------------------------------

/**
 * Claim a single tier's reward. Server-authoritative: points are recomputed
 * here, the tier must be unlocked (points >= threshold) and not already
 * claimed, and the grant + the claim record land in one transaction.
 */
export async function claimSeasonTier(index: number): Promise<ActionResult> {
  "use server";
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const tier = SEASON_TIERS[index];
  if (!tier) return { ok: false, message: "That tier isn't on the track." };

  const [state, points] = await Promise.all([
    prisma.seasonPassState.upsert({
      where: { characterId: character.id },
      update: {},
      create: { characterId: character.id, season: CURRENT_SEASON },
    }),
    computeSeasonPoints(character.id),
  ]);

  if (points < tier.threshold) {
    return {
      ok: false,
      message: `Tier ${index + 1} is still locked — keep playing to reach ${tier.threshold.toLocaleString()} pts! 🔒`,
    };
  }

  const claimed = parseClaimed(state.claimed);
  if (claimed.has(index)) {
    return { ok: false, message: "You've already claimed that tier. 🎖️" };
  }

  claimed.add(index);
  const delta = rewardDelta(tier.reward);

  await prisma.$transaction([
    prisma.seasonPassState.update({
      where: { characterId: character.id },
      data: { claimed: JSON.stringify([...claimed].sort((a, b) => a - b)) },
    }),
    prisma.character.update({
      where: { id: character.id },
      data: {
        gold: character.gold + (delta.gold ?? 0),
        mushrooms: character.mushrooms + (delta.mushrooms ?? 0),
        dust: character.dust + (delta.dust ?? 0),
      },
    }),
    ...currencyLedgerOps(
      character.id,
      {
        gold: character.gold,
        mushrooms: character.mushrooms,
        dust: character.dust,
      },
      delta,
      "SEASON_REWARD",
    ),
  ]);

  revalidatePath("/");
  return {
    ok: true,
    message: `🏅 Tier ${index + 1} claimed — ${describeSeasonReward(tier.reward)}!`,
  };
}

/**
 * Claim every unlocked-but-unclaimed tier at once. Rewards are aggregated into
 * a single ledger entry and the claim record is updated in one transaction.
 */
export async function claimAllSeasonTiers(): Promise<ActionResult> {
  "use server";
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const [state, points] = await Promise.all([
    prisma.seasonPassState.upsert({
      where: { characterId: character.id },
      update: {},
      create: { characterId: character.id, season: CURRENT_SEASON },
    }),
    computeSeasonPoints(character.id),
  ]);

  const claimed = parseClaimed(state.claimed);
  const toClaim = SEASON_TIERS.filter(
    (t) => points >= t.threshold && !claimed.has(t.index),
  );

  if (toClaim.length === 0) {
    return {
      ok: false,
      message: "Nothing to claim yet — earn more Season Points! 📈",
    };
  }

  for (const t of toClaim) claimed.add(t.index);
  const delta = sumRewards(toClaim.map((t) => t.reward));

  await prisma.$transaction([
    prisma.seasonPassState.update({
      where: { characterId: character.id },
      data: { claimed: JSON.stringify([...claimed].sort((a, b) => a - b)) },
    }),
    prisma.character.update({
      where: { id: character.id },
      data: {
        gold: character.gold + (delta.gold ?? 0),
        mushrooms: character.mushrooms + (delta.mushrooms ?? 0),
        dust: character.dust + (delta.dust ?? 0),
      },
    }),
    ...currencyLedgerOps(
      character.id,
      {
        gold: character.gold,
        mushrooms: character.mushrooms,
        dust: character.dust,
      },
      delta,
      "SEASON_REWARD",
    ),
  ]);

  revalidatePath("/");
  return {
    ok: true,
    message: `🎉 Claimed ${toClaim.length} tier${
      toClaim.length === 1 ? "" : "s"
    } — ${describeSeasonReward(delta)}!`,
  };
}
