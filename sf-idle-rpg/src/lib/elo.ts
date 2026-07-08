/**
 * Pure Elo rating math + arena tiers for the ranked ladder. No dependencies,
 * so it's safe to import anywhere. Combat outcomes are already deterministic
 * (seeded); this just turns a win/loss into a rating change.
 */

/** Probability that `a` beats `b`, per the Elo model. */
export function expectedScore(a: number, b: number): number {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

/**
 * New ratings for both fighters after a bout. `won` is from `mine`'s side.
 * K is the volatility factor (32 = standard).
 */
export function eloUpdate(
  mine: number,
  theirs: number,
  won: boolean,
  k = 32,
): { mine: number; theirs: number; delta: number } {
  const e = expectedScore(mine, theirs);
  const s = won ? 1 : 0;
  const newMine = Math.round(mine + k * (s - e));
  const newTheirs = Math.round(theirs + k * (1 - s - (1 - e)));
  return { mine: newMine, theirs: newTheirs, delta: newMine - mine };
}

export interface ArenaTier {
  min: number;
  name: string;
  emoji: string;
  color: string;
}

/** Ascending tier thresholds; the highest one whose `min` you meet is yours. */
export const ARENA_TIERS: ArenaTier[] = [
  { min: 0, name: "Unranked", emoji: "⚪", color: "#b99b78" },
  { min: 1050, name: "Bronze", emoji: "🥉", color: "#cd7f32" },
  { min: 1250, name: "Silver", emoji: "🥈", color: "#c0c0c0" },
  { min: 1450, name: "Gold", emoji: "🥇", color: "#e8b923" },
  { min: 1650, name: "Platinum", emoji: "💎", color: "#4aa3df" },
  { min: 1850, name: "Diamond", emoji: "💠", color: "#a55eea" },
  { min: 2050, name: "Champion", emoji: "👑", color: "#eb4d4b" },
];

export function arenaTier(rating: number): ArenaTier {
  let tier = ARENA_TIERS[0];
  for (const t of ARENA_TIERS) if (rating >= t.min) tier = t;
  return tier;
}

/** Progress (0–1) toward the next tier, for a UI bar. Champion returns 1. */
export function tierProgress(rating: number): number {
  const idx = ARENA_TIERS.findIndex((t) => t === arenaTier(rating));
  const next = ARENA_TIERS[idx + 1];
  if (!next) return 1;
  const floor = ARENA_TIERS[idx].min;
  return Math.min(1, Math.max(0, (rating - floor) / (next.min - floor)));
}
