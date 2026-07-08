"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { loadCharacter } from "@/lib/data";
import { getClass, type CharClass } from "@/lib/game";
import type { ActionResult } from "@/lib/actions";
import { REBIRTH_MIN_LEVEL, pointsForRebirth } from "@/lib/prestige";

/**
 * Be Reborn: reset level/experience/base attributes/talents, bank Ascension
 * points, and increment prestige. Everything collected (gold, gear, cosmetics,
 * pets, achievements, guild, arena rating…) is deliberately KEPT. Gated at the
 * rebirth level and validated server-side.
 */
export async function rebirth(): Promise<ActionResult> {
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  if (character.level < REBIRTH_MIN_LEVEL) {
    return {
      ok: false,
      message: `You must reach level ${REBIRTH_MIN_LEVEL} to be Reborn (you're ${character.level}).`,
    };
  }

  const points = pointsForRebirth(character.level);
  const base = getClass(character.class as CharClass).base;

  await prisma.$transaction([
    prisma.character.update({
      where: { id: character.id },
      data: {
        level: 1,
        experience: 0,
        strength: base.strength,
        dexterity: base.dexterity,
        intelligence: base.intelligence,
        constitution: base.constitution,
        luck: base.luck,
        prestige: character.prestige + 1,
        ascension: character.ascension + points,
      },
    }),
    prisma.talent.deleteMany({ where: { characterId: character.id } }),
  ]);

  revalidatePath("/");
  return {
    ok: true,
    message: `♻️ Reborn! +${points} Ascension point(s). Your legend begins anew — stronger for it. ✨`,
  };
}
