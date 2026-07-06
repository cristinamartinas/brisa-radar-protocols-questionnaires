import { prisma } from "@/lib/db";
import { getPlayerId } from "@/lib/session";
import {
  effectiveAttributes,
  type Attributes,
  type Fighter,
  type CharClass,
} from "@/lib/game";

export type CharacterWithLogs = NonNullable<
  Awaited<ReturnType<typeof loadCharacter>>
>;

/** Load the current browser's hero along with gear and recent history. */
export async function loadCharacter() {
  const pid = await getPlayerId();
  if (!pid) return null;

  return prisma.character.findUnique({
    where: { playerId: pid },
    include: {
      items: true,
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

type ItemLike = { location: string } & Attributes;

type CharacterLike = {
  name: string;
  class: string;
  level: number;
} & Attributes;

/**
 * Convert a stored character (with its items) into a combat-ready Fighter,
 * folding equipped-gear bonuses into its attributes. If `items` is omitted
 * the raw base attributes are used.
 */
export function toFighter(c: CharacterLike, items: ItemLike[] = []): Fighter {
  const base: Attributes = {
    strength: c.strength,
    dexterity: c.dexterity,
    intelligence: c.intelligence,
    constitution: c.constitution,
    luck: c.luck,
  };
  const eff = effectiveAttributes(base, items);
  return {
    name: c.name,
    class: c.class as CharClass,
    level: c.level,
    ...eff,
  };
}
