import { prisma } from "@/lib/db";
import { getClass, type Attributes, type Fighter } from "@/lib/game";

// ---------------------------------------------------------------------------
// Battle Tonics — the game's first proper consumables.
//
// A tonic is a single-use, pre-fight buff you buy from the Alchemist with gold
// (a steady sink) and "arm" for your NEXT arena fight. When you next step into
// the arena the armed tonic is spent, boosting one of your combat stats for
// that duel only, then it clears. Buffs are expressed as stat multipliers so
// they flow through the existing derived-combat math untouched — a Berserker's
// Draught just makes your damage stat bigger for one fight.
//
// This module is pure/data + the read-side loader; the buy/arm server actions
// live in tonics-actions.ts (a "use server" module may only export async fns).
// ---------------------------------------------------------------------------

export type TonicId = "berserk" | "ironhide" | "fortune";

export interface TonicDef {
  id: TonicId;
  name: string;
  emoji: string;
  blurb: string;
  /** Which stat it swells. "primary" = the class's primary (raw damage). */
  stat: "primary" | keyof Attributes;
  /** Fractional boost, e.g. 0.35 = +35%. */
  mult: number;
  /** Base gold cost before the per-level scaling. */
  base: number;
}

export const TONIC_DEFS: Record<TonicId, TonicDef> = {
  berserk: {
    id: "berserk",
    name: "Berserker's Draught",
    emoji: "💪",
    blurb: "+35% to your damage stat for one fight. Froths pleasantly.",
    stat: "primary",
    mult: 0.35,
    base: 120,
  },
  ironhide: {
    id: "ironhide",
    name: "Ironhide Brew",
    emoji: "🛡️",
    blurb: "+40% Constitution for one fight — more life, harder to dent.",
    stat: "constitution",
    mult: 0.4,
    base: 110,
  },
  fortune: {
    id: "fortune",
    name: "Fortune's Elixir",
    emoji: "🍀",
    blurb: "+60% Luck for one fight. Crits rain like a lucky drunk's dice.",
    stat: "luck",
    mult: 0.6,
    base: 140,
  },
};

export const TONIC_IDS: TonicId[] = ["berserk", "ironhide", "fortune"];

export function isTonicId(x: unknown): x is TonicId {
  return x === "berserk" || x === "ironhide" || x === "fortune";
}

/** Gold cost of a tonic, scaling gently with level so it stays a real sink. */
export function tonicPrice(id: TonicId, level: number): number {
  return Math.round(TONIC_DEFS[id].base * (1 + Math.max(0, level - 1) * 0.15));
}

/**
 * Apply a tonic's buff to a fighter, returning a NEW fighter. Boosts the one
 * relevant stat by the tonic's multiplier; everything downstream (damage, crit,
 * mitigation, HP) recomputes from it. Pure — no I/O.
 */
export function applyTonic(f: Fighter, id: TonicId): Fighter {
  const def = TONIC_DEFS[id];
  const key = def.stat === "primary" ? getClass(f.class).primary : def.stat;
  return { ...f, [key]: Math.round(f[key] * (1 + def.mult)) };
}

export interface TonicView {
  gold: number;
  level: number;
  armed: TonicId | null;
  counts: Record<TonicId, number>;
  prices: Record<TonicId, number>;
}

/** Load the hero's tonic shelf: owned counts, current prices, and what's armed. */
export async function loadTonics(
  characterId: string,
  level: number,
  gold: number,
): Promise<TonicView> {
  const state = await prisma.tonicState.findUnique({ where: { characterId } });
  const armed = isTonicId(state?.armed) ? state.armed : null;
  return {
    gold,
    level,
    armed,
    counts: {
      berserk: state?.berserk ?? 0,
      ironhide: state?.ironhide ?? 0,
      fortune: state?.fortune ?? 0,
    },
    prices: {
      berserk: tonicPrice("berserk", level),
      ironhide: tonicPrice("ironhide", level),
      fortune: tonicPrice("fortune", level),
    },
  };
}
