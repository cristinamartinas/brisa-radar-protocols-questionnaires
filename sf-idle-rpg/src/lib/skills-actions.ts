"use server";

import { prisma } from "@/lib/db";
import { loadCharacter } from "@/lib/data";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions";
import type { CharClass } from "@/lib/game";
import {
  MAX_SLOTS,
  getSkill,
  getTrigger,
  skillUnlocked,
  type LoadoutSlot,
} from "@/lib/skills";

/**
 * Persist a hero's chosen rotation. Every slot is re-validated server-side: the
 * skill must exist and be unlocked, the trigger must exist, no skill may appear
 * twice, and the loadout is capped at MAX_SLOTS. The client's UI states are a
 * courtesy — this is the authority.
 *
 * Lives in its own `"use server"` module (not skills.ts) so the pure skill
 * helpers that the combat engine imports stay free of server-only deps and
 * never leak `pg`/prisma into a client bundle.
 */
export async function setLoadout(slots: LoadoutSlot[]): Promise<ActionResult> {
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  if (!Array.isArray(slots)) {
    return { ok: false, message: "That doesn't look like a rotation." };
  }
  if (slots.length > MAX_SLOTS) {
    return { ok: false, message: `You may equip at most ${MAX_SLOTS} skills.` };
  }

  const seen = new Set<string>();
  const clean: LoadoutSlot[] = [];

  for (const slot of slots) {
    const skill = getSkill(slot?.skill);
    if (!skill) {
      return { ok: false, message: `Unknown skill: ${String(slot?.skill)}.` };
    }
    const trigger = getTrigger(slot?.trigger);
    if (!trigger) {
      return { ok: false, message: `Unknown trigger: ${String(slot?.trigger)}.` };
    }
    if (!skillUnlocked(skill, character.level, character.class as CharClass)) {
      return {
        ok: false,
        message: `${skill.name} unlocks at level ${skill.unlockLevel}.`,
      };
    }
    if (seen.has(skill.key)) {
      return { ok: false, message: `You can only slot ${skill.name} once.` };
    }
    seen.add(skill.key);
    clean.push({ skill: skill.key, trigger: trigger.key });
  }

  await prisma.character.update({
    where: { id: character.id },
    data: { skillLoadout: JSON.stringify(clean) },
  });

  revalidatePath("/");
  return {
    ok: true,
    message: clean.length
      ? `Rotation locked in — ${clean.length} skill(s) at the ready. ⚔️`
      : "Rotation cleared. A pacifist build, bold.",
  };
}
