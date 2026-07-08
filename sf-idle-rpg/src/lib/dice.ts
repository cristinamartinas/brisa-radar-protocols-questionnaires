import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { loadCharacter } from "@/lib/data";
import { currencyLedgerOps } from "@/lib/ledger";
import { makeRng, randomSeed, randInt, type Rng } from "@/lib/rng";
import type { ActionResult } from "@/lib/actions";

// ---------------------------------------------------------------------------
// Tavern Dice 🎲🎲
//
// A backroom 2d6 gamble. Slap gold on the felt, call how the bones will land,
// and the barkeep rolls. Three calls: Low (2–6), Seven (dead on 7, the big
// pay), and High (8–12). The two even-money-ish calls win 15-in-36 of the
// time; Seven only 6-in-36 but pays five-ish to one.
//
// Honest house edge: every payout is set a shade BELOW the fair multiplier, so
// over a long night the felt slowly drains gold (a healthy sink) rather than
// minting it — a ~4% house cut, not a mugging. The math is printed right on
// the panel; no one's hiding the odds.
//
// Server-authoritative & provably-fair: the roll is a pure function of a crypto
// seed made server-side (never Math.random). Gold moves through the currency
// ledger under "DICE_WIN"/"DICE_LOSS" in the SAME transaction that stamps the
// stats, so the cached balance and the audit trail can never drift.
// ---------------------------------------------------------------------------

/** Smallest and largest stake the barkeep will take. Bets are fully bounded. */
export const MIN_BET = 10;
export const MAX_BET = 1000;

/** A call you can make on the roll of 2d6. */
export interface DiceBet {
  key: string;
  label: string;
  emoji: string;
  blurb: string;
  /** Inclusive total range this call covers. */
  range: [number, number];
  /** Net-profit multiplier: winnings = floor(wager × payout). */
  payout: number;
}

/**
 * The three calls. `payout` is winnings-on-top-of-your-returned-stake, pitched
 * just under the fair line so the house keeps a small, honest cut:
 *
 *   Low  / High — win 15/36 ≈ 41.7%; fair ×1.40, we pay ×1.30 → ~4.2% edge
 *   Seven       — win  6/36 ≈ 16.7%; fair ×5.00, we pay ×4.75 → ~4.2% edge
 *
 * Every winning is floored, nudging the edge a hair further to the house.
 */
export const DICE_BETS: readonly DiceBet[] = [
  {
    key: "low",
    label: "Low",
    emoji: "⬇️",
    blurb: "Total 2–6",
    range: [2, 6],
    payout: 1.3,
  },
  {
    key: "seven",
    label: "Lucky Seven",
    emoji: "🎯",
    blurb: "Total exactly 7",
    range: [7, 7],
    payout: 4.75,
  },
  {
    key: "high",
    label: "High",
    emoji: "⬆️",
    blurb: "Total 8–12",
    range: [8, 12],
    payout: 1.3,
  },
] as const;

/** Look up a call by key; undefined if it isn't a real bet option. */
export function getBet(key: string): DiceBet | undefined {
  return DICE_BETS.find((b) => b.key === key);
}

/** Roll two six-sided dice with a seeded RNG. Never Math.random. */
export function rollDice(rng: Rng): [number, number] {
  return [randInt(rng, 1, 6), randInt(rng, 1, 6)];
}

/** Winnings (net gold on top of the returned stake) if `bet` hits at `wager`. */
export function winnings(bet: DiceBet, wager: number): number {
  return Math.floor(wager * bet.payout);
}

export interface DiceView {
  rolls: number;
  wins: number;
  biggestWin: number;
  gold: number;
  bets: readonly DiceBet[];
  minBet: number;
  maxBet: number;
}

/**
 * Load (or lazily create) a hero's DiceState and pull the current gold, so the
 * panel can render the felt, the stats, and how much the hero can actually
 * stake. Read-only apart from first-touch state creation.
 */
export async function loadDice(characterId: string): Promise<DiceView> {
  let state = await prisma.diceState.findUnique({ where: { characterId } });
  if (!state) {
    state = await prisma.diceState.create({ data: { characterId } });
  }

  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { gold: true },
  });

  return {
    rolls: state.rolls,
    wins: state.wins,
    biggestWin: state.biggestWin,
    gold: character?.gold ?? 0,
    bets: DICE_BETS,
    minBet: MIN_BET,
    maxBet: MAX_BET,
  };
}

/**
 * Place a bet and roll the bones. Server-authoritative: the call is re-validated
 * and the wager re-clamped against the stored gold INSIDE the request, so a
 * stale UI or a doctored form can't overstake or bet gold the hero doesn't have.
 * The 2d6 come off a fresh crypto seed, and gold moves through the ledger in the
 * same transaction that bumps rolls/wins/biggestWin.
 */
export async function playDice(bet: string, wager: number): Promise<ActionResult> {
  "use server";

  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const option = getBet(bet);
  if (!option) {
    return { ok: false, message: "That's not a call the barkeep recognises. 🤨" };
  }

  if (!Number.isInteger(wager) || wager < MIN_BET || wager > MAX_BET) {
    return {
      ok: false,
      message: `The felt takes stakes from ${MIN_BET}🪙 to ${MAX_BET}🪙 — pick a number in between.`,
    };
  }

  if (wager > character.gold) {
    return {
      ok: false,
      message: `You can't stake ${wager}🪙 with only ${character.gold}🪙 in your purse. 🫥`,
    };
  }

  // Ensure a stats row exists (own the biggestWin comparison ourselves rather
  // than leaning on whatever the shared character loader happens to include).
  const state = await prisma.diceState.upsert({
    where: { characterId: character.id },
    create: { characterId: character.id },
    update: {},
  });

  // Roll the bones. Provably-fair: pure function of a server-side crypto seed.
  const seed = randomSeed();
  const [d1, d2] = rollDice(makeRng(seed));
  const total = d1 + d2;

  const won = total >= option.range[0] && total <= option.range[1];
  const win = won ? winnings(option, wager) : 0;
  const delta = won ? win : -wager;

  await prisma.$transaction([
    prisma.character.update({
      where: { id: character.id },
      data: { gold: character.gold + delta },
    }),
    ...currencyLedgerOps(
      character.id,
      { gold: character.gold, mushrooms: character.mushrooms },
      { gold: delta },
      won ? "DICE_WIN" : "DICE_LOSS",
    ),
    prisma.diceState.update({
      where: { characterId: character.id },
      data: {
        rolls: { increment: 1 },
        wins: won ? { increment: 1 } : undefined,
        biggestWin: won && win > state.biggestWin ? win : undefined,
      },
    }),
  ]);

  revalidatePath("/");

  const dice = `🎲🎲 ${d1}+${d2} = ${total}!`;
  if (won) {
    return {
      ok: true,
      message: `${dice} You called ${option.label} — the barkeep slides you ${win}🪙. 🍻`,
    };
  }
  return {
    ok: true,
    message: `${dice} You called ${option.label}. The bones say no — down ${wager}🪙. 💀`,
  };
}
