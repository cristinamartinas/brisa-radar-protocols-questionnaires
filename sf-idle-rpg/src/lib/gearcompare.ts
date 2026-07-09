import type { Attributes } from "@/lib/game";

// ---------------------------------------------------------------------------
// Gear comparison — how a candidate item stacks up against what's equipped in
// the same slot. Pure and deterministic so it can run on the server (in item
// cards) and in unit tests. The "net" is a simple sum of stat deltas: a quick,
// class-agnostic upgrade signal (positive = more total stats than you have on).
// ---------------------------------------------------------------------------

export const STAT_ORDER: (keyof Attributes)[] = [
  "strength",
  "dexterity",
  "intelligence",
  "constitution",
  "luck",
];

export interface StatDelta {
  key: keyof Attributes;
  /** candidate − equipped for this stat. */
  delta: number;
}

export interface GearDelta {
  /** Per-stat differences, in STAT_ORDER. */
  stats: StatDelta[];
  /** Sum of all stat deltas — the headline upgrade/downgrade signal. */
  net: number;
  /** True when nothing is equipped in the slot (everything is a gain). */
  emptySlot: boolean;
}

const zero: Attributes = {
  strength: 0,
  dexterity: 0,
  intelligence: 0,
  constitution: 0,
  luck: 0,
};

/**
 * Compare a candidate item's attributes to the currently-equipped item in its
 * slot (or nothing). Returns per-stat deltas plus a net total.
 */
export function gearDelta(
  candidate: Attributes,
  equipped: Attributes | null | undefined,
): GearDelta {
  const base = equipped ?? zero;
  const stats = STAT_ORDER.map((key) => ({ key, delta: candidate[key] - base[key] }));
  const net = stats.reduce((sum, s) => sum + s.delta, 0);
  return { stats, net, emptySlot: !equipped };
}
