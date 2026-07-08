/**
 * Ascension (prestige / rebirth) — the long-game reset.
 *
 * At the level cap you can be Reborn: your level, experience, base attributes,
 * and talents reset to nothing, but you keep everything you've *collected*
 * (gold, gear, cosmetics, pets, achievements, guild, ratings…) and bank
 * permanent Ascension points. Each point is a flat multiplier on your combat
 * power forever, so a reborn hero re-clears content faster and pushes deeper.
 *
 * Pure helpers here; the reset action is in prestige-actions.ts (server-only)
 * so this module stays import-safe from the combat engine.
 */

/** The level you must reach before you may be Reborn. */
export const REBIRTH_MIN_LEVEL = 30;

/** Permanent points earned by being Reborn from a given level. */
export function pointsForRebirth(level: number): number {
  if (level < REBIRTH_MIN_LEVEL) return 0;
  // 1 point per full 10 levels, so higher pushes before rebirth pay off.
  return Math.floor(level / 10);
}

/** Multiplier applied to every attribute in combat: +3% per Ascension point. */
export function ascensionMultiplier(points: number): number {
  return 1 + Math.max(0, points) * 0.03;
}

/** Human-readable power bonus, e.g. "+15%". */
export function ascensionBonusLabel(points: number): string {
  return `+${Math.round((ascensionMultiplier(points) - 1) * 100)}%`;
}
