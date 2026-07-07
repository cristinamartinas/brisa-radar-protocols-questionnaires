/**
 * The Forge — salvage & crafting.
 *
 * A gold/gear sink that turns unwanted equipment into `dust`, then lets the
 * hero spend that dust to improve gear they want to keep. Like the rest of the
 * game this is fully server-authoritative: every dust movement routes through
 * the currency ledger, and every random roll flows through a seeded RNG — the
 * browser never decides an outcome.
 *
 * NOTE: this module deliberately has NO top-level "use server" directive so it
 * can export both server actions (each marked "use server" inline) and pure,
 * synchronous helpers the UI uses to preview costs.
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { loadCharacter } from "@/lib/data";
import { currencyLedgerOps } from "@/lib/ledger";
import { getRarity, getSlot, type Attributes } from "@/lib/game";
import { makeRng, randomSeed, pick } from "@/lib/rng";
import type { ActionResult } from "@/lib/actions";
import type { Prisma } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Pure helpers (safe to import into server components for cost previews)
// ---------------------------------------------------------------------------

/** The five attribute columns an item can carry a bonus on. */
export const STAT_KEYS = [
  "strength",
  "dexterity",
  "intelligence",
  "constitution",
  "luck",
] as const;

type StatKey = (typeof STAT_KEYS)[number];

/** The minimal item shape the forge math needs. */
export type ForgeItem = {
  rarity: string;
  slot: string;
  price: number;
} & Attributes;

/** Sum of an item's attribute bonuses — a stand-in for its overall power. */
export function itemPower(item: ForgeItem): number {
  return STAT_KEYS.reduce((sum, k) => sum + item[k], 0);
}

/**
 * Dust yielded from salvaging an item: scaled by price and rarity. Cheap
 * commons dribble out a speck; legendaries are worth melting down.
 */
export function salvageValue(item: ForgeItem): number {
  const rarity = getRarity(item.rarity);
  return Math.max(1, Math.round((item.price / 10) * rarity.mult));
}

/**
 * Dust cost to reroll an item's stats. Scales with the item's power (its
 * notional "level") and rarity, so juicing a big legendary is dear.
 */
export function reforgeCost(item: ForgeItem): number {
  const rarity = getRarity(item.rarity);
  return Math.max(1, Math.round((6 + itemPower(item)) * rarity.mult));
}

/**
 * The item's dominant favoured stat — the one an upgrade reinforces. Picks the
 * favoured stat with the highest current bonus, falling back to the slot's
 * first favoured stat.
 */
export function primaryStatKey(item: ForgeItem): StatKey {
  const favors = getSlot(item.slot).favors as StatKey[];
  let best: StatKey = favors[0];
  let bestVal = -1;
  for (const stat of favors) {
    if (item[stat] > bestVal) {
      bestVal = item[stat];
      best = stat;
    }
  }
  return best;
}

/** Ceiling an item's primary stat can be upgraded to, so it can't run away. */
export function upgradeCap(item: ForgeItem): number {
  const rarity = getRarity(item.rarity);
  return Math.round(25 * rarity.mult);
}

/** Escalating dust cost to add +1 to the primary stat (grows as it climbs). */
export function upgradeCost(item: ForgeItem): number {
  const rarity = getRarity(item.rarity);
  const current = item[primaryStatKey(item)];
  return Math.max(1, Math.round((3 + current * 2) * rarity.mult));
}

/** True when the item's primary stat has already hit its ceiling. */
export function isMaxUpgraded(item: ForgeItem): boolean {
  return item[primaryStatKey(item)] >= upgradeCap(item);
}

const ZERO: Attributes = {
  strength: 0,
  dexterity: 0,
  intelligence: 0,
  constitution: 0,
  luck: 0,
};

/**
 * Redistribute `budget` stat points across a slot's favoured stats, mirroring
 * generateItem's bias (the lion's share to one favoured stat, the rest 70/30
 * favoured/anywhere). Keeps the SAME total budget and slot bias as the
 * original roll — a reforge is a shuffle, not a power-up.
 */
function rerollBonuses(
  rng: ReturnType<typeof makeRng>,
  slotId: string,
  budget: number,
): Attributes {
  const slot = getSlot(slotId);
  const bonuses: Attributes = { ...ZERO };
  if (budget <= 0) return bonuses;

  let remaining = budget;
  const primary = pick(rng, slot.favors) as StatKey;
  const primaryAmount = Math.min(remaining, Math.ceil(budget * 0.6));
  bonuses[primary] += primaryAmount;
  remaining -= primaryAmount;

  while (remaining > 0) {
    const target =
      rng() < 0.7 ? (pick(rng, slot.favors) as StatKey) : pick(rng, STAT_KEYS);
    bonuses[target] += 1;
    remaining -= 1;
  }
  return bonuses;
}

// ---------------------------------------------------------------------------
// Server actions
// ---------------------------------------------------------------------------

/** Salvage a bag item: destroy it and grant dust. */
export async function salvageItem(
  itemId: string,
  _formData?: FormData,
): Promise<ActionResult> {
  "use server";
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const item = await prisma.item.findFirst({
    where: { id: itemId, characterId: character.id, location: "INVENTORY" },
  });
  if (!item) return { ok: false, message: "That item isn't in your bag." };

  const dust = salvageValue(item);

  await prisma.$transaction([
    prisma.character.update({
      where: { id: character.id },
      data: { dust: character.dust + dust },
    }),
    prisma.item.delete({ where: { id: item.id } }),
    ...currencyLedgerOps(
      character.id,
      {
        gold: character.gold,
        mushrooms: character.mushrooms,
        dust: character.dust,
      },
      { dust },
      "SALVAGE",
    ),
  ]);

  revalidatePath("/");
  return {
    ok: true,
    message: `The blacksmith sighs and grinds ${item.name} into ${dust} dust. ✨`,
  };
}

/** Reforge an owned item: spend dust to reroll its bonuses at equal budget. */
export async function reforgeItem(
  itemId: string,
  _formData?: FormData,
): Promise<ActionResult> {
  "use server";
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const item = await prisma.item.findFirst({
    where: {
      id: itemId,
      characterId: character.id,
      location: { in: ["INVENTORY", "EQUIPPED"] },
    },
  });
  if (!item) return { ok: false, message: "That item isn't yours to reforge." };

  const cost = reforgeCost(item);
  if (character.dust < cost) {
    return {
      ok: false,
      message: `Reforging costs ${cost} dust — you have ${character.dust}.`,
    };
  }

  const budget = itemPower(item);
  const rerolled = rerollBonuses(makeRng(randomSeed()), item.slot, budget);

  await prisma.$transaction([
    prisma.character.update({
      where: { id: character.id },
      data: { dust: character.dust - cost },
    }),
    prisma.item.update({
      where: { id: item.id },
      data: { ...rerolled },
    }),
    ...currencyLedgerOps(
      character.id,
      {
        gold: character.gold,
        mushrooms: character.mushrooms,
        dust: character.dust,
      },
      { dust: -cost },
      "FORGE_REROLL",
    ),
  ]);

  revalidatePath("/");
  return {
    ok: true,
    message: `The blacksmith reforges ${item.name} for ${cost} dust. New numbers — hope you like them.`,
  };
}

/** Upgrade an owned item: spend dust to add +1 to its primary stat. */
export async function upgradeItem(
  itemId: string,
  _formData?: FormData,
): Promise<ActionResult> {
  "use server";
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const item = await prisma.item.findFirst({
    where: {
      id: itemId,
      characterId: character.id,
      location: { in: ["INVENTORY", "EQUIPPED"] },
    },
  });
  if (!item) return { ok: false, message: "That item isn't yours to upgrade." };

  const cap = upgradeCap(item);
  const primary = primaryStatKey(item);
  if (item[primary] >= cap) {
    return {
      ok: false,
      message: `${item.name}'s ${primary} is already forged to its limit (${cap}).`,
    };
  }

  const cost = upgradeCost(item);
  if (character.dust < cost) {
    return {
      ok: false,
      message: `That upgrade costs ${cost} dust — you have ${character.dust}.`,
    };
  }

  // A better item is worth more; nudge its price so salvage/sell reflect it.
  const priceBump = Math.max(1, Math.round(9 * getRarity(item.rarity).mult));
  const data: Prisma.ItemUpdateInput = { price: { increment: priceBump } };
  data[primary] = { increment: 1 };

  await prisma.$transaction([
    prisma.character.update({
      where: { id: character.id },
      data: { dust: character.dust - cost },
    }),
    prisma.item.update({ where: { id: item.id }, data }),
    ...currencyLedgerOps(
      character.id,
      {
        gold: character.gold,
        mushrooms: character.mushrooms,
        dust: character.dust,
      },
      { dust: -cost },
      "FORGE_UPGRADE",
    ),
  ]);

  revalidatePath("/");
  return {
    ok: true,
    message: `The blacksmith sighs and takes your money. ${item.name}'s ${primary} is now ${item[primary] + 1}.`,
  };
}
