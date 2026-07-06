"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getPlayerId, setPlayerId, clearPlayer } from "@/lib/session";
import { loadCharacter, toFighter } from "@/lib/data";
import {
  getClass,
  rollQuest,
  applyLevelUps,
  resolveBattle,
  randomOpponent,
  type CharClass,
  type Progression,
} from "@/lib/game";

export interface ActionResult {
  ok: boolean;
  message: string;
}

// ---------------------------------------------------------------------------
// Create a hero
// ---------------------------------------------------------------------------

export async function createCharacter(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const cls = String(formData.get("class") ?? "") as CharClass;

  if (name.length < 2 || name.length > 20) {
    return { ok: false, message: "Name must be 2–20 characters." };
  }
  if (!["WARRIOR", "MAGE", "SCOUT"].includes(cls)) {
    return { ok: false, message: "Please choose a class." };
  }

  const existing = await prisma.player.findUnique({ where: { name } });
  if (existing) {
    return { ok: false, message: "That name is already taken, hero." };
  }

  const base = getClass(cls).base;
  const player = await prisma.player.create({
    data: {
      name,
      character: {
        create: {
          name,
          class: cls,
          strength: base.strength,
          dexterity: base.dexterity,
          intelligence: base.intelligence,
          constitution: base.constitution,
          luck: base.luck,
        },
      },
    },
  });

  await setPlayerId(player.id);
  revalidatePath("/");
  return { ok: true, message: `Welcome to the realm, ${name}!` };
}

// ---------------------------------------------------------------------------
// Go on a quest
// ---------------------------------------------------------------------------

export async function goOnQuest(): Promise<ActionResult> {
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const quest = rollQuest(toFighter(character));

  const progression: Progression = {
    class: character.class as CharClass,
    level: character.level,
    experience: character.experience + quest.xpReward,
    strength: character.strength,
    dexterity: character.dexterity,
    intelligence: character.intelligence,
    constitution: character.constitution,
    luck: character.luck,
  };
  const levels = applyLevelUps(progression);

  await prisma.character.update({
    where: { id: character.id },
    data: {
      gold: character.gold + quest.goldReward,
      mushrooms: character.mushrooms + quest.mushroomReward,
      experience: progression.experience,
      level: progression.level,
      strength: progression.strength,
      dexterity: progression.dexterity,
      intelligence: progression.intelligence,
      constitution: progression.constitution,
      luck: progression.luck,
      questLogs: {
        create: {
          title: quest.title,
          goldReward: quest.goldReward,
          xpReward: quest.xpReward,
        },
      },
    },
  });

  revalidatePath("/");

  let message = `"${quest.title}" complete! +${quest.goldReward} gold, +${quest.xpReward} XP`;
  if (quest.mushroomReward) message += `, +${quest.mushroomReward} 🍄`;
  if (levels > 0) message += ` — LEVEL UP! You are now level ${progression.level}. ✨`;
  return { ok: true, message };
}

// ---------------------------------------------------------------------------
// Fight in the arena (PvP against another real hero, or an NPC if alone)
// ---------------------------------------------------------------------------

export async function fightArena(): Promise<ActionResult> {
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  // Try to find a real opponent: another player's hero.
  const others = await prisma.character.findMany({
    where: { id: { not: character.id } },
    take: 25,
  });
  const foe =
    others.length > 0
      ? toFighter(others[Math.floor(Math.random() * others.length)])
      : randomOpponent(character.level);

  const result = resolveBattle(toFighter(character), foe);

  // Rewards: winning grants gold + a little XP; losing costs a small stake.
  const stake = Math.round(8 * foe.level + Math.random() * 20);
  const goldChange = result.won ? stake : -Math.min(character.gold, Math.round(stake / 2));
  const xpGain = result.won ? Math.round(10 * foe.level) : 0;

  const progression: Progression = {
    class: character.class as CharClass,
    level: character.level,
    experience: character.experience + xpGain,
    strength: character.strength,
    dexterity: character.dexterity,
    intelligence: character.intelligence,
    constitution: character.constitution,
    luck: character.luck,
  };
  const levels = applyLevelUps(progression);

  await prisma.character.update({
    where: { id: character.id },
    data: {
      gold: character.gold + goldChange,
      arenaWins: character.arenaWins + (result.won ? 1 : 0),
      arenaLosses: character.arenaLosses + (result.won ? 0 : 1),
      experience: progression.experience,
      level: progression.level,
      strength: progression.strength,
      dexterity: progression.dexterity,
      intelligence: progression.intelligence,
      constitution: progression.constitution,
      luck: progression.luck,
      battleLogs: {
        create: {
          opponentName: foe.name,
          won: result.won,
          goldChange,
          rounds: JSON.stringify(result.rounds),
        },
      },
    },
  });

  revalidatePath("/");

  let message = result.won
    ? `You defeated ${foe.name}! +${goldChange} gold`
    : `${foe.name} bested you. ${goldChange} gold`;
  if (xpGain) message += `, +${xpGain} XP`;
  if (levels > 0) message += ` — LEVEL UP to ${progression.level}! ✨`;
  return { ok: true, message };
}

// ---------------------------------------------------------------------------
// Danger zone: abandon the current hero
// ---------------------------------------------------------------------------

export async function abandonHero(): Promise<void> {
  const pid = await getPlayerId();
  if (pid) {
    // Delete the character first (its logs cascade), then the player row.
    await prisma.character.deleteMany({ where: { playerId: pid } });
    await prisma.player.deleteMany({ where: { id: pid } });
    await clearPlayer();
  }
  revalidatePath("/");
}
