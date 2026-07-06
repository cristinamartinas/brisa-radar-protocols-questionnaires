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
  generateShopStock,
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
    include: { character: true },
  });

  // Stock the hero's personal Magic Shop with a starting selection.
  if (player.character) {
    await prisma.item.createMany({
      data: generateShopStock(1).map((it) => ({
        ...it,
        characterId: player.character!.id,
        location: "SHOP",
      })),
    });
  }

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

  const quest = rollQuest(toFighter(character, character.items));

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

  // Try to find a real opponent: another player's hero (with their gear).
  const others = await prisma.character.findMany({
    where: { id: { not: character.id } },
    take: 25,
    include: { items: true },
  });
  const opponent =
    others.length > 0
      ? others[Math.floor(Math.random() * others.length)]
      : null;
  const foe = opponent
    ? toFighter(opponent, opponent.items)
    : randomOpponent(character.level);

  const result = resolveBattle(toFighter(character, character.items), foe);

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
// The Magic Shop + inventory
// ---------------------------------------------------------------------------

/** Reroll the hero's shop with a fresh selection scaled to their level. */
export async function refreshShop(): Promise<void> {
  const character = await loadCharacter();
  if (!character) return;

  await prisma.item.deleteMany({
    where: { characterId: character.id, location: "SHOP" },
  });
  await prisma.item.createMany({
    data: generateShopStock(character.level).map((it) => ({
      ...it,
      characterId: character.id,
      location: "SHOP",
    })),
  });

  revalidatePath("/");
}

/** Buy a shop item: deduct gold and move it into the inventory. */
export async function buyItem(itemId: string, _formData?: FormData): Promise<void> {
  const character = await loadCharacter();
  if (!character) return;

  const item = await prisma.item.findFirst({
    where: { id: itemId, characterId: character.id, location: "SHOP" },
  });
  if (!item || character.gold < item.price) return;

  await prisma.$transaction([
    prisma.character.update({
      where: { id: character.id },
      data: { gold: character.gold - item.price },
    }),
    prisma.item.update({
      where: { id: item.id },
      data: { location: "INVENTORY" },
    }),
  ]);

  revalidatePath("/");
}

/** Equip an inventory item, moving any item in the same slot back to the bag. */
export async function equipItem(itemId: string, _formData?: FormData): Promise<void> {
  const character = await loadCharacter();
  if (!character) return;

  const item = await prisma.item.findFirst({
    where: { id: itemId, characterId: character.id, location: "INVENTORY" },
  });
  if (!item) return;

  await prisma.$transaction([
    prisma.item.updateMany({
      where: { characterId: character.id, slot: item.slot, location: "EQUIPPED" },
      data: { location: "INVENTORY" },
    }),
    prisma.item.update({
      where: { id: item.id },
      data: { location: "EQUIPPED" },
    }),
  ]);

  revalidatePath("/");
}

/** Move an equipped item back into the inventory. */
export async function unequipItem(itemId: string, _formData?: FormData): Promise<void> {
  const character = await loadCharacter();
  if (!character) return;

  await prisma.item.updateMany({
    where: { id: itemId, characterId: character.id, location: "EQUIPPED" },
    data: { location: "INVENTORY" },
  });

  revalidatePath("/");
}

/** Sell an owned item (equipped or in the bag) for half its price. */
export async function sellItem(itemId: string, _formData?: FormData): Promise<void> {
  const character = await loadCharacter();
  if (!character) return;

  const item = await prisma.item.findFirst({
    where: {
      id: itemId,
      characterId: character.id,
      location: { in: ["INVENTORY", "EQUIPPED"] },
    },
  });
  if (!item) return;

  const payout = Math.max(1, Math.round(item.price / 2));
  await prisma.$transaction([
    prisma.character.update({
      where: { id: character.id },
      data: { gold: character.gold + payout },
    }),
    prisma.item.delete({ where: { id: item.id } }),
  ]);

  revalidatePath("/");
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
