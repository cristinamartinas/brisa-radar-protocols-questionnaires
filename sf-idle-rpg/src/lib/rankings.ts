/**
 * The Rankings Hub — a read-only multi-category leaderboard hall.
 *
 * The Hall of Fame on the main page ranks heroes by level alone; this module
 * celebrates every axis of glory: raw power, arena prowess, tower depth,
 * hoarded gold, lifetime fortune earned, and sheer decoration.
 *
 * Everything here is a pure read. No mutations, no server actions — it only
 * computes a handful of small, efficient queries and marks the current hero's
 * row so the UI can light it up. Batched name/class lookups keep the
 * ledger/achievement aggregates from turning into an N+1.
 */

import { prisma } from "@/lib/db";

/** How many heroes make each hall. */
const TOP_N = 10;

/** One line on a leaderboard: a placed hero and their score for the category. */
export interface RankingRow {
  rank: number;
  characterId: string;
  name: string;
  class: string;
  value: number;
  isMe: boolean;
}

/** A single leaderboard hall, with presentation metadata for the panel. */
export interface RankingCategory {
  key: string;
  title: string;
  emoji: string;
  blurb: string;
  /** Short suffix rendered after each value, e.g. "wins", "🪙". */
  unit: string;
  rows: RankingRow[];
}

/** The full Rankings Hub payload: an ordered set of halls. */
export interface Rankings {
  categories: RankingCategory[];
}

/**
 * Compute the top-N heroes across every ranked category and flag the current
 * hero wherever they place. `currentCharacterId` may be null/unknown — nothing
 * simply gets marked in that case.
 */
export async function loadRankings(
  currentCharacterId: string | null,
): Promise<Rankings> {
  const me = currentCharacterId;

  // A handful of small queries, all in flight together. The two aggregate
  // halls (fortune earned, most decorated) come back as grouped rows keyed by
  // characterId; their display names are resolved in one batched lookup below.
  const [
    byLevel,
    byArena,
    byGold,
    towerRows,
    fortuneGroups,
    decoratedGroups,
  ] = await Promise.all([
    prisma.character.findMany({
      orderBy: [{ level: "desc" }, { experience: "desc" }],
      take: TOP_N,
      select: { id: true, name: true, class: true, level: true },
    }),
    prisma.character.findMany({
      where: { arenaWins: { gt: 0 } },
      orderBy: [{ arenaWins: "desc" }, { level: "desc" }],
      take: TOP_N,
      select: { id: true, name: true, class: true, arenaWins: true },
    }),
    prisma.character.findMany({
      orderBy: [{ gold: "desc" }, { level: "desc" }],
      take: TOP_N,
      select: { id: true, name: true, class: true, gold: true },
    }),
    prisma.towerState.findMany({
      where: { highestFloor: { gt: 0 } },
      orderBy: [{ highestFloor: "desc" }, { updatedAt: "asc" }],
      take: TOP_N,
      include: {
        character: { select: { id: true, name: true, class: true } },
      },
    }),
    prisma.currencyLedger.groupBy({
      by: ["characterId"],
      where: { currency: "GOLD", delta: { gt: 0 } },
      _sum: { delta: true },
      orderBy: { _sum: { delta: "desc" } },
      take: TOP_N,
    }),
    prisma.characterAchievement.groupBy({
      by: ["characterId"],
      _count: { characterId: true },
      orderBy: { _count: { characterId: "desc" } },
      take: TOP_N,
    }),
  ]);

  // Batch-resolve names/classes for the aggregate halls in a single query,
  // rather than fetching per row.
  const aggregateIds = [
    ...new Set([
      ...fortuneGroups.map((g) => g.characterId),
      ...decoratedGroups.map((g) => g.characterId),
    ]),
  ];
  const aggregateChars = aggregateIds.length
    ? await prisma.character.findMany({
        where: { id: { in: aggregateIds } },
        select: { id: true, name: true, class: true },
      })
    : [];
  const charById = new Map(aggregateChars.map((c) => [c.id, c]));

  const row = (
    characterId: string,
    name: string,
    className: string,
    value: number,
    i: number,
  ): RankingRow => ({
    rank: i + 1,
    characterId,
    name,
    class: className,
    value,
    isMe: characterId === me,
  });

  const highestLevel: RankingRow[] = byLevel.map((c, i) =>
    row(c.id, c.name, c.class, c.level, i),
  );

  const arenaChampions: RankingRow[] = byArena.map((c, i) =>
    row(c.id, c.name, c.class, c.arenaWins, i),
  );

  const towerClimbers: RankingRow[] = towerRows.map((t, i) =>
    row(t.character.id, t.character.name, t.character.class, t.highestFloor, i),
  );

  const richestHeroes: RankingRow[] = byGold.map((c, i) =>
    row(c.id, c.name, c.class, c.gold, i),
  );

  const fortuneEarned: RankingRow[] = fortuneGroups.flatMap((g, i) => {
    const c = charById.get(g.characterId);
    if (!c) return [];
    return [row(c.id, c.name, c.class, g._sum.delta ?? 0, i)];
  });

  const mostDecorated: RankingRow[] = decoratedGroups.flatMap((g, i) => {
    const c = charById.get(g.characterId);
    if (!c) return [];
    return [row(c.id, c.name, c.class, g._count.characterId, i)];
  });

  const categories: RankingCategory[] = [
    {
      key: "level",
      title: "Highest Level",
      emoji: "🌟",
      blurb: "The most storied heroes in all the realm.",
      unit: "Lv",
      rows: highestLevel,
    },
    {
      key: "arena",
      title: "Arena Champions",
      emoji: "🛡️",
      blurb: "Undefeated darlings of the fighting pits.",
      unit: "wins",
      rows: arenaChampions,
    },
    {
      key: "tower",
      title: "Tower Climbers",
      emoji: "🗼",
      blurb: "Those who dared the endless ascent.",
      unit: "flr",
      rows: towerClimbers,
    },
    {
      key: "gold",
      title: "Richest Heroes",
      emoji: "💰",
      blurb: "Coffers deep enough to drown a dragon.",
      unit: "🪙",
      rows: richestHeroes,
    },
    {
      key: "fortune",
      title: "Fortune Earned",
      emoji: "📈",
      blurb: "Lifetime gold won, spent or not.",
      unit: "🪙",
      rows: fortuneEarned,
    },
    {
      key: "decorated",
      title: "Most Decorated",
      emoji: "🎖️",
      blurb: "Walls heavy with hard-won achievements.",
      unit: "badges",
      rows: mostDecorated,
    },
  ];

  return { categories };
}
