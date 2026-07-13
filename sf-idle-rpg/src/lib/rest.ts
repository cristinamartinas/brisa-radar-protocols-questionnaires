import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { loadCharacter } from "@/lib/data";
import { currencyLedgerOps } from "@/lib/ledger";
import { applyLevelUps, type CharClass, type Progression } from "@/lib/game";
import type { ActionResult } from "@/lib/actions";

// ---------------------------------------------------------------------------
// Rested (away) earnings — the idle-game "while you were away" hook. Time since
// the hero last claimed banks a little gold + XP (capped), collected on return.
// Pure math here so it can be shown before claiming and unit-tested; the claim
// is a server action.
// ---------------------------------------------------------------------------

/** Don't nag on a quick refresh — only surface once a couple minutes have passed. */
export const REST_MIN_MS = 2 * 60 * 1000;
/** Earnings stop accruing after this long away. */
export const REST_MAX_HOURS = 12;

export interface RestReward {
  hours: number;
  gold: number;
  xp: number;
  /** True once there's enough banked to bother showing a card. */
  ready: boolean;
}

/** What the hero has banked from resting `sinceMs` at the given level. */
export function restReward(level: number, sinceMs: number): RestReward {
  const hours = Math.min(REST_MAX_HOURS, Math.max(0, sinceMs) / 3_600_000);
  const gold = Math.floor(hours * (8 + level * 2));
  const xp = Math.floor(hours * (10 + level * 3));
  return { hours, gold, xp, ready: sinceMs >= REST_MIN_MS && gold + xp > 0 };
}

/** Claim rested earnings: bank the gold + XP and reset the clock. */
export async function collectRest(): Promise<ActionResult> {
  "use server";
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const sinceMs = Date.now() - character.restCollectedAt.getTime();
  const r = restReward(character.level, sinceMs);
  const now = new Date();

  if (!r.ready) {
    await prisma.character.update({
      where: { id: character.id },
      data: { restCollectedAt: now },
    });
    return { ok: true, message: "You feel rested. Come back after some time away for a bonus." };
  }

  const progression: Progression = {
    class: character.class as CharClass,
    level: character.level,
    experience: character.experience + r.xp,
    strength: character.strength,
    dexterity: character.dexterity,
    intelligence: character.intelligence,
    constitution: character.constitution,
    luck: character.luck,
  };
  const levels = applyLevelUps(progression);

  await prisma.$transaction([
    prisma.character.update({
      where: { id: character.id },
      data: {
        gold: character.gold + r.gold,
        experience: progression.experience,
        level: progression.level,
        strength: progression.strength,
        dexterity: progression.dexterity,
        intelligence: progression.intelligence,
        constitution: progression.constitution,
        luck: progression.luck,
        restCollectedAt: now,
      },
    }),
    ...currencyLedgerOps(
      character.id,
      { gold: character.gold, mushrooms: character.mushrooms, dust: character.dust },
      { gold: r.gold },
      "REST_REWARD",
    ),
  ]);

  revalidatePath("/");
  let message = `Welcome back! Rested earnings: +${r.gold} gold, +${r.xp} XP.`;
  if (levels > 0) message += ` — LEVEL UP to ${progression.level}! ✨`;
  return { ok: true, message };
}
