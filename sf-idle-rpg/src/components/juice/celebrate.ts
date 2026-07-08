/**
 * celebrate.ts — pure, dependency-free classifier that turns an ActionResult
 * message into a celebration tier. No React, no DOM, no side effects, so it is
 * trivially testable and safe to import anywhere.
 *
 * Tiers, loudest wins:
 *   epic  — a run-defining moment (level up, legendary drop, a boss conquered)
 *   big   — real loot worth a flourish (loot / epic / rare gear)
 *   small — a routine but positive payout (+gold, quest complete, a victory)
 *   none  — nothing worth celebrating (or a failure the caller shouldn't pass)
 */

export type CelebrationTier = "none" | "small" | "big" | "epic";

export interface Celebration {
  tier: CelebrationTier;
  /** A single glyph to headline the flourish. */
  emoji?: string;
  /** Short, shouty label ("LEVEL UP", "LEGENDARY", "LOOT!"). */
  label?: string;
}

// Ordered loudest-first: the first pattern that matches decides the tier.
const RULES: { tier: CelebrationTier; re: RegExp; emoji: string; label: string }[] = [
  { tier: "epic", re: /level\s*up/i, emoji: "✨", label: "LEVEL UP" },
  {
    tier: "epic",
    re: /legendary|jackpot|killing blow|conquered|ascend/i,
    emoji: "🏅",
    label: "LEGENDARY",
  },
  { tier: "big", re: /loot|epic|rare|treasure/i, emoji: "🎁", label: "LOOT!" },
  {
    tier: "small",
    re: /\+\d[\d,]*\s*gold|complete|victor|defeated|cleared|founded/i,
    emoji: "🪙",
    label: "NICE",
  },
];

/** Classify an ActionResult message into a celebration tier. */
export function celebrationFor(message: string): Celebration {
  if (!message) return { tier: "none" };
  for (const rule of RULES) {
    if (rule.re.test(message)) {
      return { tier: rule.tier, emoji: rule.emoji, label: rule.label };
    }
  }
  return { tier: "none" };
}

/**
 * Pull the largest "+N" gold/number out of a message so the overlay can float
 * a "+N" readout. Returns null when there's no clear number to show.
 */
export function floatAmountFor(message: string): string | null {
  const gold = message.match(/\+(\d[\d,]*)\s*gold/i);
  if (gold) return `+${gold[1]} 🪙`;
  const generic = message.match(/\+(\d[\d,]*)/);
  return generic ? `+${generic[1]}` : null;
}
