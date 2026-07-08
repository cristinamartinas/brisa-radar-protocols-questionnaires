/**
 * The Pit — Quest & Cudgel's purest idle mechanic.
 *
 * A hole in the ground that a crew of gnomes work around the clock, whether
 * you're logged in or not. Gold trickles in at a fixed rate up to a storage
 * cap; you collect the pile and reinvest it to dig the Pit deeper, raising both
 * the rate and the cap.
 *
 * The design contract:
 *  - Everything time-related is computed SERVER-SIDE. `accrued()` is pure but
 *    takes an explicit `now`, which is read inside the server actions (or in the
 *    server-rendered panel) — never from a client clock, which the browser
 *    could lie about.
 *  - The cap bounds offline earnings, so leaving the game running for a week
 *    doesn't mint a fortune. The Pit is a trickle, not a firehose.
 *  - All gold moves through `currencyLedgerOps`, in the same $transaction that
 *    writes the cached balance, so the ledger can never drift from the wallet.
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { loadCharacter } from "@/lib/data";
import { currencyLedgerOps } from "@/lib/ledger";
import type { ActionResult } from "@/lib/actions";

// ---------------------------------------------------------------------------
// Balance constants & formulas (pure)
// ---------------------------------------------------------------------------

/** Level-1 output, in gold/hour. A modest trickle — roughly one small quest. */
const BASE_RATE = 20;
/** Each level multiplies output by this. Gentle enough to stay a side income. */
const RATE_GROWTH = 1.45;
/** The cap holds this many hours of output, so offline gains are bounded. */
const CAP_HOURS = 8;
/** Level-1 upgrade price; escalates steeply so the Pit never pays for itself fast. */
const BASE_COST = 120;
const COST_GROWTH = 1.75;

/** Gold produced per real-time hour at a given Pit level. */
export function ratePerHour(level: number): number {
  return Math.round(BASE_RATE * Math.pow(RATE_GROWTH, level - 1));
}

/** Storage cap: the most gold the Pit can hold before it stops accruing. */
export function capacity(level: number): number {
  return ratePerHour(level) * CAP_HOURS;
}

/** Gold cost to dig from `level` to `level + 1`. */
export function upgradeCost(level: number): number {
  return Math.round(BASE_COST * Math.pow(COST_GROWTH, level - 1));
}

/**
 * Gold accrued since `lastCollected`, floored and clamped to the cap. Pure:
 * `now` is passed in so callers control the clock (and it stays server-side).
 */
export function accrued(
  pit: { level: number; lastCollected: Date },
  now: Date,
): number {
  const hours = (now.getTime() - pit.lastCollected.getTime()) / 3_600_000;
  if (hours <= 0) return 0;
  const gained = ratePerHour(pit.level) * hours;
  return Math.floor(Math.min(capacity(pit.level), gained));
}

// ---------------------------------------------------------------------------
// Persistence: lazy load/create of the per-hero PitState
// ---------------------------------------------------------------------------

/**
 * Load a hero's Pit, creating its row on first touch. Returns a UI-ready shape
 * with the live `accrued` amount computed from `now` (server time by default).
 */
export async function loadPit(characterId: string, now: Date = new Date()) {
  const pit =
    (await prisma.pitState.findUnique({ where: { characterId } })) ??
    (await prisma.pitState.create({ data: { characterId } }));

  const level = pit.level;
  const stored = accrued(pit, now);
  const cap = capacity(level);

  return {
    level,
    accrued: stored,
    capacity: cap,
    ratePerHour: ratePerHour(level),
    upgradeCost: upgradeCost(level),
    full: stored >= cap,
  };
}

// ---------------------------------------------------------------------------
// Server actions
// ---------------------------------------------------------------------------

/**
 * Bank the accrued gold and reset the clock. No-op (with a wry note) when the
 * Pit is empty. Wallet write + ledger row land in one transaction.
 */
export async function collectPit(): Promise<ActionResult> {
  "use server";

  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const now = new Date();
  const pit =
    (await prisma.pitState.findUnique({ where: { characterId: character.id } })) ??
    (await prisma.pitState.create({ data: { characterId: character.id } }));

  const gold = accrued(pit, now);
  if (gold <= 0) {
    return { ok: false, message: "The pit is empty. The gnomes need more time." };
  }

  await prisma.$transaction([
    prisma.character.update({
      where: { id: character.id },
      data: { gold: character.gold + gold },
    }),
    prisma.pitState.update({
      where: { characterId: character.id },
      data: { lastCollected: now },
    }),
    ...currencyLedgerOps(
      character.id,
      { gold: character.gold, mushrooms: character.mushrooms },
      { gold },
      "PIT_COLLECT",
    ),
  ]);

  revalidatePath("/");
  return { ok: true, message: `The gnomes hand up ${gold}🪙 from the Pit. ⛏️` };
}

/**
 * Dig the Pit one level deeper: pay the escalating gold cost and raise the
 * rate + cap. Rejected server-side if the hero can't afford it.
 */
export async function upgradePit(): Promise<ActionResult> {
  "use server";

  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const pit =
    (await prisma.pitState.findUnique({ where: { characterId: character.id } })) ??
    (await prisma.pitState.create({ data: { characterId: character.id } }));

  const cost = upgradeCost(pit.level);
  if (character.gold < cost) {
    return {
      ok: false,
      message: `The gnomes demand ${cost}🪙 to dig deeper — and you're short.`,
    };
  }

  const nextLevel = pit.level + 1;
  await prisma.$transaction([
    prisma.character.update({
      where: { id: character.id },
      data: { gold: character.gold - cost },
    }),
    prisma.pitState.update({
      where: { characterId: character.id },
      data: { level: nextLevel },
    }),
    ...currencyLedgerOps(
      character.id,
      { gold: character.gold, mushrooms: character.mushrooms },
      { gold: -cost },
      "PIT_UPGRADE",
    ),
  ]);

  revalidatePath("/");
  return {
    ok: true,
    message: `The Pit deepens to level ${nextLevel}. Output rises — now ${ratePerHour(
      nextLevel,
    )}🪙/hr. 📈`,
  };
}
