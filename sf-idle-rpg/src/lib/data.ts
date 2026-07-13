import { prisma } from "@/lib/db";
import { getSessionToken } from "@/lib/session";
import {
  effectiveAttributes,
  type Attributes,
  type Fighter,
  type CharClass,
} from "@/lib/game";
import { talentBonuses } from "@/lib/talents";
import { guildPerks } from "@/lib/guildhall";
import { ascensionMultiplier } from "@/lib/prestige";

export type CharacterWithLogs = NonNullable<
  Awaited<ReturnType<typeof loadCharacter>>
>;

/** Load the current session's hero along with gear and recent history. */
export async function loadCharacter() {
  const token = await getSessionToken();
  if (!token) return null;

  return prisma.character.findFirst({
    where: { player: { sessionToken: token } },
    include: {
      items: true,
      talents: true,
      activeQuest: true,
      dungeons: true,
      guild: {
        include: {
          members: {
            orderBy: [{ level: "desc" }, { experience: "desc" }],
            select: { id: true, name: true, class: true, level: true },
          },
          rooms: true,
        },
      },
      questLogs: { orderBy: { createdAt: "desc" }, take: 8 },
      battleLogs: { orderBy: { createdAt: "desc" }, take: 8 },
      tonics: true,
    },
  });
}

/**
 * Guild directory ranked by total member level, for the guild leaderboard and
 * the "join a guild" browser. Returns a small denormalised shape for the UI.
 */
export async function loadGuilds(limit = 12) {
  const guilds = await prisma.guild.findMany({
    include: { members: { select: { level: true } } },
  });
  return guilds
    .map((g) => ({
      id: g.id,
      name: g.name,
      tag: g.tag,
      description: g.description,
      memberCount: g.members.length,
      totalLevel: g.members.reduce((s, m) => s + m.level, 0),
    }))
    .sort((a, b) => b.totalLevel - a.totalLevel || b.memberCount - a.memberCount)
    .slice(0, limit);
}

/** Perk multiplier applied to a member's quest gold (+2% per member, capped). */
export function guildGoldMultiplier(memberCount: number): number {
  return 1 + Math.min(0.2, memberCount * 0.02);
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
  talents?: { node: string; rank: number }[];
  guild?: { rooms: { room: string; level: number }[] } | null;
  ascension?: number;
} & Attributes;

/**
 * Convert a stored character (with its items) into a combat-ready Fighter,
 * folding equipped-gear bonuses into its attributes. If `items` is omitted
 * the raw base attributes are used. Allocated `talents` and, when enlisted, the
 * guild Barracks' flat stat bonus are folded in on top of gear.
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
  const tal = talentBonuses(c.talents ?? []);
  // Guild Barracks grants a flat bonus to every attribute for enlisted members.
  const barracks = c.guild ? guildPerks(c.guild.rooms).statBonus : 0;
  // Ascension (prestige) is a permanent multiplier on the whole stat line.
  const asc = ascensionMultiplier(c.ascension ?? 0);
  const stat = (base: number, t: number) => Math.round((base + t + barracks) * asc);
  return {
    name: c.name,
    class: c.class as CharClass,
    level: c.level,
    strength: stat(eff.strength, tal.strength),
    dexterity: stat(eff.dexterity, tal.dexterity),
    intelligence: stat(eff.intelligence, tal.intelligence),
    constitution: stat(eff.constitution, tal.constitution),
    luck: stat(eff.luck, tal.luck),
  };
}
