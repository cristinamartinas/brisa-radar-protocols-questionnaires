"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { loadCharacter } from "@/lib/data";
import { currencyLedgerOps } from "@/lib/ledger";
import { TONIC_DEFS, tonicPrice, isTonicId, type TonicId } from "@/lib/tonics";
import type { ActionResult } from "@/lib/actions";

// Server actions for the Battle Tonics consumable. Pure helpers + the read-side
// loader live in tonics.ts; these are the write paths (buy, arm) the UI calls.

/** Buy one tonic of the given kind, if the hero can afford it. */
export async function buyTonic(id: TonicId): Promise<ActionResult> {
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };
  if (!isTonicId(id)) return { ok: false, message: "No such tonic." };

  const price = tonicPrice(id, character.level);
  if (character.gold < price) {
    return { ok: false, message: `Not enough gold — need ${price}🪙.` };
  }

  await prisma.$transaction([
    prisma.character.update({
      where: { id: character.id },
      data: { gold: character.gold - price },
    }),
    prisma.tonicState.upsert({
      where: { characterId: character.id },
      create: { characterId: character.id, [id]: 1 },
      update: { [id]: { increment: 1 } },
    }),
    ...currencyLedgerOps(
      character.id,
      { gold: character.gold, mushrooms: character.mushrooms },
      { gold: -price },
      "TONIC_BUY",
    ),
  ]);

  revalidatePath("/");
  return { ok: true, message: `Bought ${TONIC_DEFS[id].name}. ${TONIC_DEFS[id].emoji}` };
}

/**
 * Arm (or disarm) a tonic for the next arena fight. Passing the currently-armed
 * tonic toggles it off; passing a kind you own arms it. Only one may be armed.
 */
export async function armTonic(id: TonicId): Promise<ActionResult> {
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };
  if (!isTonicId(id)) return { ok: false, message: "No such tonic." };

  const state = await prisma.tonicState.findUnique({ where: { characterId: character.id } });
  const owned = state?.[id] ?? 0;
  if (owned < 1) {
    return { ok: false, message: `You don't have any ${TONIC_DEFS[id].name}.` };
  }

  const next = state?.armed === id ? null : id;
  await prisma.tonicState.upsert({
    where: { characterId: character.id },
    create: { characterId: character.id, armed: next },
    update: { armed: next },
  });

  revalidatePath("/");
  return {
    ok: true,
    message: next
      ? `${TONIC_DEFS[id].name} armed — it'll kick in your next arena fight.`
      : `${TONIC_DEFS[id].name} stowed.`,
  };
}
