/**
 * The Fishing Hole — a light, charming diversion. Cast a line on a short
 * cooldown and reel in a seeded catch from a weighted table, from a soggy Old
 * Boot up to the fabled Pondwyrm.
 *
 * Same discipline as the rest of the game: the fish table and all the rolls are
 * pure, exported helpers so the UI can preview them and unit tests can pin them
 * down. The one server action (`castLine`) is the only thing that touches the
 * database — the cooldown is decided from server time, the catch flows through
 * the seeded `Rng` (never Math.random), and its gold is banked through the
 * ledger so the economy stays auditable.
 *
 * NOTE: this module deliberately has NO file-level "use server" directive — it
 * exports the fish table and pure helpers too. The server action carries its
 * own inline directive.
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { loadCharacter } from "@/lib/data";
import { currencyLedgerOps } from "@/lib/ledger";
import { makeRng, randomSeed, type Rng } from "@/lib/rng";
import type { ActionResult } from "@/lib/actions";

// ---------------------------------------------------------------------------
// The fish table
// ---------------------------------------------------------------------------

export type FishRarity =
  | "Junk"
  | "Common"
  | "Uncommon"
  | "Rare"
  | "Epic"
  | "Legendary";

/** Higher rank = rarer. Used to decide "is this a new best catch?". */
export const RARITY_RANK: Record<FishRarity, number> = {
  Junk: 0,
  Common: 1,
  Uncommon: 2,
  Rare: 3,
  Epic: 4,
  Legendary: 5,
};

/** Colour token per rarity, reused by the UI. */
export const RARITY_COLOR: Record<FishRarity, string> = {
  Junk: "var(--muted)",
  Common: "var(--foreground)",
  Uncommon: "var(--good)",
  Rare: "var(--accent)",
  Epic: "#b56bff",
  Legendary: "var(--gold)",
};

export interface Fish {
  key: string;
  name: string;
  rarity: FishRarity;
  /** Gold reeled in with this catch. */
  gold: number;
  /** How likely this fish is to bite (relative weight, not a percentage). */
  weight: number;
  /** Gently-funny line shown when it lands in your net. */
  flavour: string;
}

export const FISH_TABLE: readonly Fish[] = [
  {
    key: "old_boot",
    name: "🥾 Old Boot",
    rarity: "Junk",
    gold: 1,
    weight: 26,
    flavour: "It is a boot. It is wet. The other one is presumably still down there.",
  },
  {
    key: "rusty_can",
    name: "🥫 Rusty Can",
    rarity: "Junk",
    gold: 2,
    weight: 20,
    flavour: "Vintage tin, lightly haunted. The label reads 'BEANS?' with a question mark.",
  },
  {
    key: "minnow",
    name: "🐟 Nervous Minnow",
    rarity: "Common",
    gold: 6,
    weight: 18,
    flavour: "It apologises for wasting your time and asks to be released.",
  },
  {
    key: "bream",
    name: "🐟 Bream",
    rarity: "Common",
    gold: 11,
    weight: 15,
    flavour: "A perfectly respectable fish that pays a perfectly respectable amount.",
  },
  {
    key: "carp",
    name: "🐡 Grumbling Carp",
    rarity: "Uncommon",
    gold: 22,
    weight: 10,
    flavour: "It has opinions about the pond's management and shares them at length.",
  },
  {
    key: "prismfish",
    name: "🐠 Prismfish",
    rarity: "Uncommon",
    gold: 34,
    weight: 7,
    flavour: "Refracts the light into a small rainbow, then into a small invoice.",
  },
  {
    key: "goldfin",
    name: "🐟 Goldfin Trout",
    rarity: "Rare",
    gold: 68,
    weight: 4,
    flavour: "Its scales are suspiciously coin-shaped. Do not ask where it banks.",
  },
  {
    key: "moon_eel",
    name: "🌙 Moon Eel",
    rarity: "Rare",
    gold: 96,
    weight: 2.5,
    flavour: "Only bites when it thinks no one is watching. You were watching.",
  },
  {
    key: "deep_one",
    name: "🦑 Deep One",
    rarity: "Epic",
    gold: 180,
    weight: 1,
    flavour: "It regards you with far too many eyes, then tips generously out of pity.",
  },
  {
    key: "pondwyrm",
    name: "🐉 Pondwyrm",
    rarity: "Legendary",
    gold: 420,
    weight: 0.25,
    flavour: "The pond's landlord. Bards will insist you fought it. You did not.",
  },
];

/** Look up a fish by its key (undefined if unknown). */
export function getFish(key: string): Fish | undefined {
  return FISH_TABLE.find((f) => f.key === key);
}

// ---------------------------------------------------------------------------
// Pure helpers: cooldown + weighted roll
// ---------------------------------------------------------------------------

/** How long the line must rest between casts (2 minutes), in milliseconds. */
export const castCooldownMs = 2 * 60 * 1000;

/**
 * Roll a catch from the weighted table. Pure in `rng` so it is reproducible
 * from a stored seed and previewable by the UI.
 */
export function rollCatch(rng: Rng): Fish {
  const total = FISH_TABLE.reduce((s, f) => s + f.weight, 0);
  let roll = rng() * total;
  for (const fish of FISH_TABLE) {
    roll -= fish.weight;
    if (roll < 0) return fish;
  }
  return FISH_TABLE[0];
}

// ---------------------------------------------------------------------------
// Read model for the UI
// ---------------------------------------------------------------------------

export interface FishingView {
  canCast: boolean;
  cooldownRemainingSec: number;
  totalCatches: number;
  /** The rarest fish this hero has landed, if any. */
  bestCatch: Fish | null;
  /** The full catchable roster, for the "what's biting" display. */
  table: readonly Fish[];
}

/**
 * Load a hero's fishing hole for display, lazily creating the state row on
 * first visit. Cooldown/ready state is computed from server time. Safe to call
 * from a render — the upsert only ever seeds an empty row.
 */
export async function loadFishing(characterId: string): Promise<FishingView> {
  const state = await prisma.fishingState.upsert({
    where: { characterId },
    create: { characterId },
    update: {},
  });

  const now = Date.now();
  const readyAt = state.lastCast ? state.lastCast.getTime() + castCooldownMs : 0;
  const remaining = Math.max(0, readyAt - now);

  return {
    canCast: remaining <= 0,
    cooldownRemainingSec: Math.ceil(remaining / 1000),
    totalCatches: state.totalCatches,
    bestCatch: state.bestCatch ? getFish(state.bestCatch) ?? null : null,
    table: FISH_TABLE,
  };
}

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

/**
 * Cast a line. Enforces the cooldown against server time, rolls a seeded catch,
 * banks its gold through the ledger, bumps the catch count, and promotes the
 * best catch when this one is rarer — all in one transaction so the cached gold
 * balance and the ledger can never drift.
 */
export async function castLine(): Promise<ActionResult> {
  "use server";

  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const state = await prisma.fishingState.upsert({
    where: { characterId: character.id },
    create: { characterId: character.id },
    update: {},
  });

  // Server-authoritative cooldown check — no casting early.
  const now = Date.now();
  if (state.lastCast) {
    const readyAt = state.lastCast.getTime() + castCooldownMs;
    if (now < readyAt) {
      const secs = Math.ceil((readyAt - now) / 1000);
      return {
        ok: false,
        message: `🎣 The water is still. Cast again in ~${secs}s.`,
      };
    }
  }

  const catchFish = rollCatch(makeRng(randomSeed()));

  const prevBest = state.bestCatch ? getFish(state.bestCatch) : undefined;
  const isNewBest =
    !prevBest || RARITY_RANK[catchFish.rarity] > RARITY_RANK[prevBest.rarity];

  await prisma.$transaction([
    prisma.character.update({
      where: { id: character.id },
      data: { gold: character.gold + catchFish.gold },
    }),
    prisma.fishingState.update({
      where: { characterId: character.id },
      data: {
        lastCast: new Date(now),
        totalCatches: state.totalCatches + 1,
        ...(isNewBest ? { bestCatch: catchFish.key } : {}),
      },
    }),
    ...currencyLedgerOps(
      character.id,
      { gold: character.gold, mushrooms: character.mushrooms },
      { gold: catchFish.gold },
      "FISHING_CATCH",
    ),
  ]);

  revalidatePath("/");

  const junk = RARITY_RANK[catchFish.rarity] === RARITY_RANK.Junk;
  let message = junk
    ? `${catchFish.name}! ${catchFish.flavour} Still, someone paid +${catchFish.gold}🪙 to take it off your hands.`
    : `You reeled in a ${catchFish.name}! ${catchFish.flavour} +${catchFish.gold}🪙`;
  if (isNewBest && !junk) message += " — a new personal best! 🏆";
  return { ok: true, message };
}
