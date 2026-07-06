import { prisma } from "@/lib/db";
import { getPlayerId } from "@/lib/session";
import type { Fighter, CharClass } from "@/lib/game";

export type CharacterWithLogs = NonNullable<
  Awaited<ReturnType<typeof loadCharacter>>
>;

/** Load the current browser's hero along with recent quest/battle history. */
export async function loadCharacter() {
  const pid = await getPlayerId();
  if (!pid) return null;

  return prisma.character.findUnique({
    where: { playerId: pid },
    include: {
      questLogs: { orderBy: { createdAt: "desc" }, take: 8 },
      battleLogs: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });
}

/** Top heroes by level then experience, for the Hall of Fame. */
export function loadLeaderboard(limit = 10) {
  return prisma.character.findMany({
    orderBy: [{ level: "desc" }, { experience: "desc" }],
    take: limit,
    select: {
      id: true,
      name: true,
      class: true,
      level: true,
      arenaWins: true,
    },
  });
}

/** Convert a stored character row into a combat-ready Fighter. */
export function toFighter(c: {
  name: string;
  class: string;
  level: number;
  strength: number;
  dexterity: number;
  intelligence: number;
  constitution: number;
  luck: number;
}): Fighter {
  return {
    name: c.name,
    class: c.class as CharClass,
    level: c.level,
    strength: c.strength,
    dexterity: c.dexterity,
    intelligence: c.intelligence,
    constitution: c.constitution,
    luck: c.luck,
  };
}
