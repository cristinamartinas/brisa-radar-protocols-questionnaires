import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { loadCharacter } from "@/lib/data";
import { currencyLedgerOps, type CurrencyDelta } from "@/lib/ledger";
import { makeRng, randomSeed, type Rng } from "@/lib/rng";
import type { ActionResult } from "@/lib/actions";
import type { Prisma } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// The Wheel of Fortune 🎡
//
// Step right up! One free spin per hero per UTC day for a randomised prize —
// a shameless S&F-style daily hook. The prize table is a weighted set of
// wedges (most spins pay a little, the jackpot almost never lands, and the
// carnival barker's "better luck next time" wedge is always lurking).
//
// Server-authoritative and provably-fair: the outcome is a pure function of a
// crypto seed rolled server-side, never Math.random. Payouts route through the
// currency ledger under "WHEEL_REWARD" in the same transaction that writes the
// cached balance, so gold/dust/mushrooms and the audit trail can never drift.
// UTC throughout — a "day" is a yyyy-mm-dd string.
// ---------------------------------------------------------------------------

/** Today as a UTC yyyy-mm-dd string — the one source of "what day is it". */
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** A single wedge on the wheel: a satirical label + a bounded reward. */
export interface WheelPrize {
  key: string;
  label: string;
  emoji: string;
  weight: number; // relative likelihood; need not sum to any total
  reward: CurrencyDelta; // {} means the dreaded blank wedge
}

/**
 * The wedges. Weights are relative — small gold is common, the jackpot is a
 * one-in-a-hundred miracle, and the barker's blank wedge is always in play.
 * Every reward is bounded so the wheel can never mint a fortune.
 */
export const WHEEL_PRIZES: readonly WheelPrize[] = [
  { key: "coppers", label: "A Handful of Coppers", emoji: "🪙", weight: 22, reward: { gold: 25 } },
  { key: "purse", label: "A Jingling Coin Purse", emoji: "💰", weight: 16, reward: { gold: 75 } },
  { key: "hoard", label: "A Dragon's Petty Cash", emoji: "🏆", weight: 6, reward: { gold: 200 } },
  { key: "dust", label: "A Pinch of Pixie Dust", emoji: "✨", weight: 18, reward: { dust: 10 } },
  { key: "dustpile", label: "A Glittering Dust Heap", emoji: "🌟", weight: 10, reward: { dust: 30 } },
  { key: "mushroom", label: "A Suspiciously Rare Mushroom", emoji: "🍄", weight: 4, reward: { mushrooms: 1 } },
  { key: "jackpot", label: "THE GRAND JACKPOT!!!", emoji: "🎰", weight: 1, reward: { gold: 500, mushrooms: 2 } },
  { key: "blank", label: "Better Luck Next Time, Chump", emoji: "🃏", weight: 23, reward: {} },
] as const;

/** Weighted draw from the prize table using a seeded RNG. Never Math.random. */
function rollPrize(rng: Rng): WheelPrize {
  const total = WHEEL_PRIZES.reduce((s, p) => s + p.weight, 0);
  let roll = rng() * total;
  for (const prize of WHEEL_PRIZES) {
    roll -= prize.weight;
    if (roll < 0) return prize;
  }
  // Floating-point paranoia: fall back to the last wedge.
  return WHEEL_PRIZES[WHEEL_PRIZES.length - 1];
}

/** Human-friendly one-liner describing a wheel reward. */
export function describeWheelReward(reward: CurrencyDelta): string {
  const parts: string[] = [];
  if (reward.gold) parts.push(`+${reward.gold}🪙`);
  if (reward.dust) parts.push(`+${reward.dust}💨`);
  if (reward.mushrooms) parts.push(`+${reward.mushrooms}🍄`);
  return parts.length > 0 ? parts.join(" ") : "a whole lot of nothing";
}

export interface WheelView {
  canSpin: boolean;
  lastPrize?: string;
  totalSpins: number;
}

/**
 * Load (or lazily create) a hero's WheelState, rolling `spinsToday` back to 0
 * whenever the stored `lastSpinDay` has gone stale. Returns whether today's
 * free spin is still available plus the lifetime spin count.
 */
export async function loadWheel(characterId: string): Promise<WheelView> {
  const day = todayUtc();

  let state = await prisma.wheelState.findUnique({ where: { characterId } });
  if (!state) {
    state = await prisma.wheelState.create({ data: { characterId } });
  } else if (state.lastSpinDay !== day && state.spinsToday !== 0) {
    // New UTC day — refill the free spin. (Guarded so we don't write every load.)
    state = await prisma.wheelState.update({
      where: { characterId },
      data: { spinsToday: 0 },
    });
  }

  const canSpin = state.lastSpinDay !== day;
  return { canSpin, totalSpins: state.totalSpins };
}

/**
 * Take today's free spin. Server-authoritative: we re-check the stored
 * `lastSpinDay` inside the request, so a double-submit or an already-spun-today
 * hero can't sneak a second pull. The prize is rolled from a fresh crypto seed
 * and paid out through the ledger in the same transaction that bumps the
 * cached balance and stamps the spin.
 */
export async function spin(): Promise<ActionResult> {
  "use server";

  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const day = todayUtc();

  // Ensure a state row exists, then act on it.
  const state = await prisma.wheelState.upsert({
    where: { characterId: character.id },
    create: { characterId: character.id },
    update: {},
  });

  if (state.lastSpinDay === day) {
    return {
      ok: false,
      message: "The wheel's already spun for you today. Come back tomorrow, gambler! 🎡",
    };
  }

  const seed = randomSeed();
  const prize = rollPrize(makeRng(seed));
  const reward = prize.reward;

  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.wheelState.update({
      where: { characterId: character.id },
      data: {
        lastSpinDay: day,
        spinsToday: 1,
        totalSpins: state.totalSpins + 1,
      },
    }),
  ];

  // Only touch the balance + ledger when there's something to grant.
  const hasReward = !!(reward.gold || reward.dust || reward.mushrooms);
  if (hasReward) {
    ops.push(
      prisma.character.update({
        where: { id: character.id },
        data: {
          gold: character.gold + (reward.gold ?? 0),
          mushrooms: character.mushrooms + (reward.mushrooms ?? 0),
          dust: character.dust + (reward.dust ?? 0),
        },
      }),
      ...currencyLedgerOps(
        character.id,
        { gold: character.gold, mushrooms: character.mushrooms, dust: character.dust },
        reward,
        "WHEEL_REWARD",
      ),
    );
  }

  await prisma.$transaction(ops);
  revalidatePath("/");

  if (!hasReward) {
    return {
      ok: true,
      message: `${prize.emoji} ${prize.label}! The wheel clatters to a stop on... nothing. The barker shrugs. 🤷`,
    };
  }
  return {
    ok: true,
    message: `${prize.emoji} ${prize.label}! You win ${describeWheelReward(reward)}. 🎉`,
  };
}
