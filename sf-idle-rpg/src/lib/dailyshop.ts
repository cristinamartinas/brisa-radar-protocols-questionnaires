"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { loadCharacter } from "@/lib/data";
import { currencyLedgerOps } from "@/lib/ledger";
import { generateItem, type ItemDraft } from "@/lib/game";
import { makeRng } from "@/lib/rng";
import type { ActionResult } from "@/lib/actions";

// ---------------------------------------------------------------------------
// The Daily Deal — a hand-curated shop that rotates ONCE PER UTC DAY.
//
// Distinct from the always-available Magic Shop: it offers a small set of
// slightly-stronger, discounted items, giving a reason to log in daily and a
// steady gold sink. The rotation marker lives in DailyShopState; the offered
// items are ordinary Item rows tagged location "DAILY_SHOP".
//
// The day's stock is fully deterministic — seeded by `${characterId}:${day}` —
// so re-loading the page never reshuffles the deal, and it stays stable until
// UTC midnight ticks the day over. Server-authoritative throughout.
// ---------------------------------------------------------------------------

const LOCATION = "DAILY_SHOP";
const DEAL_COUNT = 4;
/** The deal's gear rolls a couple levels above the hero — a touch stronger. */
const LEVEL_BUMP = 2;
/** …and every item is marked down from its usual asking price. */
const DISCOUNT = 0.75;

/** Today as a UTC yyyy-mm-dd string — the one source of "what day is it". */
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Seconds from now until the next UTC midnight, when the deal rotates. */
function secondsToUtcMidnight(): number {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return Math.max(0, Math.ceil((next.getTime() - now.getTime()) / 1000));
}

/**
 * Roll the day's curated stock: a little stronger (higher item level) and
 * discounted versus the base shop. Deterministic in `rng`, so the same seed
 * always yields the same deal.
 */
function generateDailyStock(rng: () => number, level: number): ItemDraft[] {
  return Array.from({ length: DEAL_COUNT }, () => {
    const draft = generateItem(rng, level + LEVEL_BUMP);
    return { ...draft, price: Math.max(1, Math.round(draft.price * DISCOUNT)) };
  });
}

export interface DailyShopItem {
  id: string;
  name: string;
  slot: string;
  rarity: string;
  location: string;
  price: number;
  strength: number;
  dexterity: number;
  intelligence: number;
  constitution: number;
  luck: number;
}

export interface DailyShopView {
  day: string;
  gold: number;
  items: DailyShopItem[];
  /** Seconds until the deal rotates (UTC midnight). */
  refreshInSeconds: number;
}

/**
 * Load (or lazily rotate) the hero's Daily Deal. When the stored rotation day
 * has gone stale, the previous stock is cleared and a fresh, deterministic set
 * is minted for today before the marker is stamped forward.
 */
export async function loadDailyShop(characterId: string): Promise<DailyShopView> {
  const day = todayUtc();

  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { level: true, gold: true },
  });
  if (!character) {
    return { day, gold: 0, items: [], refreshInSeconds: secondsToUtcMidnight() };
  }

  const state = await prisma.dailyShopState.findUnique({ where: { characterId } });

  if (!state || state.day !== day) {
    const drafts = generateDailyStock(
      makeRng(`${characterId}:${day}`),
      character.level,
    );
    await prisma.$transaction([
      prisma.item.deleteMany({ where: { characterId, location: LOCATION } }),
      prisma.item.createMany({
        data: drafts.map((it) => ({ ...it, characterId, location: LOCATION })),
      }),
      prisma.dailyShopState.upsert({
        where: { characterId },
        create: { characterId, day },
        update: { day },
      }),
    ]);
  }

  const items = await prisma.item.findMany({
    where: { characterId, location: LOCATION },
    orderBy: { createdAt: "asc" },
  });

  return {
    day,
    gold: character.gold,
    items,
    refreshInSeconds: secondsToUtcMidnight(),
  };
}

/**
 * Buy an item from the Daily Deal: deduct gold and move it into the inventory.
 * Server-authoritative — re-checks ownership, location and affordability inside
 * the request, so a stale button or double-submit can't slip through. Gold flows
 * through the ledger under "DAILY_SHOP_BUY".
 */
export async function buyDailyItem(
  itemId: string,
  _formData?: FormData,
): Promise<ActionResult> {
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const item = await prisma.item.findFirst({
    where: { id: itemId, characterId: character.id, location: LOCATION },
  });
  if (!item) return { ok: false, message: "That deal's gone, friend." };
  if (character.gold < item.price) {
    return { ok: false, message: `Not enough gold — need ${item.price}🪙.` };
  }

  await prisma.$transaction([
    prisma.character.update({
      where: { id: character.id },
      data: { gold: character.gold - item.price },
    }),
    prisma.item.update({
      where: { id: item.id },
      data: { location: "INVENTORY" },
    }),
    ...currencyLedgerOps(
      character.id,
      { gold: character.gold, mushrooms: character.mushrooms },
      { gold: -item.price },
      "DAILY_SHOP_BUY",
    ),
  ]);

  revalidatePath("/");
  return { ok: true, message: `Sold! ${item.name} is yours. Pleasure doin' business. 🤝` };
}
