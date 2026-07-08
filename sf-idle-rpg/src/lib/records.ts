/**
 * The Hall of Records — a hero's lifetime-stats dashboard.
 *
 * This is the proud-archivist screen: "look how far you've come." It reads the
 * append-only currency ledger and a handful of counts to tally a tidy set of
 * lifetime statistics, grouped into four themed sections (Combat, Wealth,
 * Adventuring, Collection).
 *
 * Everything here is a pure read — no mutations, no server actions. The queries
 * are batched with Promise.all and lean on Prisma aggregates/groupBy so the
 * whole dashboard is a fixed handful of round-trips, never an N+1. The ledger
 * is the source of truth for every coin ever earned or spent, so "gold earned
 * by source" and "gold spent by sink" fall straight out of a grouped sum.
 */

import { prisma } from "@/lib/db";
import { DUNGEONS } from "@/lib/game";

/** Human-facing labels + emoji for ledger reasons, so the breakdown reads well. */
const REASON_META: Record<string, { label: string; emoji: string }> = {
  SIGNUP_GRANT: { label: "Signup Grant", emoji: "🎁" },
  QUEST_REWARD: { label: "Quests", emoji: "🗺️" },
  ARENA_WIN: { label: "Arena Wins", emoji: "🛡️" },
  ARENA_LOSS: { label: "Arena Losses", emoji: "💢" },
  DUNGEON_REWARD: { label: "Dungeons", emoji: "🗝️" },
  SHOP_BUY: { label: "Magic Shop", emoji: "🪄" },
  SHOP_SELL: { label: "Selling Gear", emoji: "💱" },
  GUILD_FOUND: { label: "Founding a Guild", emoji: "🏰" },
  SALVAGE: { label: "Salvaging", emoji: "🔩" },
  FORGE_REROLL: { label: "Forge Rerolls", emoji: "🎲" },
  FORGE_UPGRADE: { label: "Forge Upgrades", emoji: "⚒️" },
  DAILY_REWARD: { label: "Daily Tasks", emoji: "📅" },
  TALENT_RESPEC: { label: "Talent Respecs", emoji: "🌳" },
  TOWER_REWARD: { label: "The Tower", emoji: "🗼" },
  WORLDBOSS_REWARD: { label: "World Bosses", emoji: "👹" },
  GUILD_UPGRADE: { label: "Guild Hall", emoji: "🏛️" },
  TITLE_PURCHASE: { label: "Titles", emoji: "📜" },
  WHEEL_REWARD: { label: "Wheel of Fortune", emoji: "🎡" },
  PIT_COLLECT: { label: "The Pit", emoji: "⛏️" },
  PIT_UPGRADE: { label: "Pit Upgrades", emoji: "🕳️" },
  PET_FORAGE: { label: "Pet Foraging", emoji: "🐾" },
  PET_ADOPT: { label: "Adopting Pets", emoji: "🥚" },
  MAIL_CLAIM: { label: "Inbox Rewards", emoji: "📬" },
  SEASON_REWARD: { label: "Season Pass", emoji: "🎟️" },
  EXPEDITION_REWARD: { label: "Expeditions", emoji: "🧭" },
  FISHING_CATCH: { label: "Fishing", emoji: "🎣" },
  COSMETIC_PURCHASE: { label: "Cosmetics", emoji: "✨" },
  BOUNTY_REWARD: { label: "Bounties", emoji: "📌" },
  DICE_WIN: { label: "Dice Wins", emoji: "🎲" },
  DICE_LOSS: { label: "Dice Losses", emoji: "🎲" },
  DAILY_SHOP_BUY: { label: "Daily Shop", emoji: "🛒" },
};

function reasonMeta(reason: string): { label: string; emoji: string } {
  return REASON_META[reason] ?? { label: reason, emoji: "🪙" };
}

/** One slice of the "by source" / "by sink" gold breakdown. */
export interface GoldFlow {
  reason: string;
  label: string;
  emoji: string;
  /** Always a positive magnitude (absolute gold moved through this channel). */
  amount: number;
  /** Share of the section total, 0–100, for bar rendering. */
  pct: number;
}

/** A single headline number with presentation metadata. */
export interface RecordStat {
  key: string;
  label: string;
  emoji: string;
  value: number;
  /** Optional short suffix, e.g. "🪙", "%", "days". */
  unit?: string;
  /** When set, render as a plain string instead of a formatted number. */
  display?: string;
}

/** A themed group of stat tiles. */
export interface RecordSection {
  key: string;
  title: string;
  emoji: string;
  blurb: string;
  stats: RecordStat[];
}

/** The full Hall of Records payload. */
export interface Records {
  hero: {
    name: string;
    class: string;
    level: number;
    daysAdventuring: number;
    joinedAt: Date;
  };
  headline: {
    lifetimeGoldEarned: number;
    lifetimeGoldSpent: number;
    biggestWindfall: number;
    biggestWindfallReason: { label: string; emoji: string } | null;
  };
  sections: RecordSection[];
  goldBySource: GoldFlow[];
  goldBySink: GoldFlow[];
}

/**
 * Turn a set of grouped ledger rows (reason -> summed delta) into an ordered,
 * percentage-weighted breakdown. `sign` flips negative sinks into positive
 * magnitudes so both breakdowns render the same way.
 */
function toFlows(
  groups: { reason: string; _sum: { delta: number | null } }[],
  sign: 1 | -1,
): GoldFlow[] {
  const rows = groups
    .map((g) => ({ reason: g.reason, amount: (g._sum.delta ?? 0) * sign }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return rows.map((r) => {
    const meta = reasonMeta(r.reason);
    return {
      reason: r.reason,
      label: meta.label,
      emoji: meta.emoji,
      amount: r.amount,
      pct: total > 0 ? Math.round((r.amount / total) * 100) : 0,
    };
  });
}

/**
 * Compute a hero's lifetime records. A fixed handful of batched queries: the
 * hero row, two grouped ledger sums (earned by source, spent by sink), the
 * single biggest gold credit, and counts across the game's systems.
 */
export async function loadRecords(characterId: string): Promise<Records | null> {
  const [
    hero,
    earnedGroups,
    spentGroups,
    biggestCredit,
    questCount,
    dungeonRows,
    tower,
    bossAgg,
    petCount,
    achievementCount,
  ] = await Promise.all([
    prisma.character.findUnique({
      where: { id: characterId },
      select: {
        name: true,
        class: true,
        level: true,
        gold: true,
        mushrooms: true,
        dust: true,
        arenaWins: true,
        arenaLosses: true,
        createdAt: true,
      },
    }),
    prisma.currencyLedger.groupBy({
      by: ["reason"],
      where: { characterId, currency: "GOLD", delta: { gt: 0 } },
      _sum: { delta: true },
    }),
    prisma.currencyLedger.groupBy({
      by: ["reason"],
      where: { characterId, currency: "GOLD", delta: { lt: 0 } },
      _sum: { delta: true },
    }),
    prisma.currencyLedger.findFirst({
      where: { characterId, currency: "GOLD", delta: { gt: 0 } },
      orderBy: { delta: "desc" },
      select: { delta: true, reason: true },
    }),
    prisma.questLog.count({ where: { characterId } }),
    prisma.dungeonProgress.findMany({
      where: { characterId },
      select: { dungeonKey: true, floor: true, clearedAt: true },
    }),
    prisma.towerState.findUnique({
      where: { characterId },
      select: { highestFloor: true },
    }),
    prisma.worldBossHit.aggregate({
      where: { characterId },
      _count: { _all: true },
      _sum: { damage: true },
    }),
    prisma.pet.count({ where: { characterId } }),
    prisma.characterAchievement.count({ where: { characterId } }),
  ]);

  if (!hero) return null;

  const goldBySource = toFlows(earnedGroups, 1);
  const goldBySink = toFlows(spentGroups, -1);
  const lifetimeGoldEarned = goldBySource.reduce((s, f) => s + f.amount, 0);
  const lifetimeGoldSpent = goldBySink.reduce((s, f) => s + f.amount, 0);

  // Floors cleared, mirroring the main page's tally: a fully-cleared dungeon
  // counts all its floors; otherwise the floors below the current one.
  const floorsCleared = dungeonRows.reduce((sum, p) => {
    const def = DUNGEONS.find((d) => d.key === p.dungeonKey);
    const total = def?.floors ?? 0;
    const cleared = p.clearedAt || (total > 0 && p.floor > total);
    return sum + (cleared ? total : Math.max(0, p.floor - 1));
  }, 0);

  const arenaTotal = hero.arenaWins + hero.arenaLosses;
  const winRate =
    arenaTotal > 0 ? Math.round((hero.arenaWins / arenaTotal) * 100) : 0;

  const now = Date.now();
  const daysAdventuring = Math.max(
    1,
    Math.floor((now - hero.createdAt.getTime()) / 86_400_000) + 1,
  );

  const sections: RecordSection[] = [
    {
      key: "combat",
      title: "Feats of Arms",
      emoji: "⚔️",
      blurb: "Every duel, descent, and dragon on the ledger.",
      stats: [
        { key: "arenaWins", label: "Arena Wins", emoji: "🛡️", value: hero.arenaWins },
        { key: "arenaLosses", label: "Arena Losses", emoji: "💢", value: hero.arenaLosses },
        { key: "winRate", label: "Win Rate", emoji: "📊", value: winRate, unit: "%" },
        { key: "towerBest", label: "Tower Best Floor", emoji: "🗼", value: tower?.highestFloor ?? 0 },
        { key: "bossHits", label: "World-Boss Hits", emoji: "👹", value: bossAgg._count._all },
        { key: "bossDmg", label: "Boss Damage Dealt", emoji: "💥", value: bossAgg._sum.damage ?? 0 },
      ],
    },
    {
      key: "wealth",
      title: "Counting House",
      emoji: "🪙",
      blurb: "The tale the coin-ledger tells.",
      stats: [
        { key: "earned", label: "Lifetime Gold Earned", emoji: "📈", value: lifetimeGoldEarned, unit: "🪙" },
        { key: "spent", label: "Lifetime Gold Spent", emoji: "📉", value: lifetimeGoldSpent, unit: "🪙" },
        { key: "gold", label: "Gold on Hand", emoji: "💰", value: hero.gold, unit: "🪙" },
        { key: "mushrooms", label: "Mushrooms", emoji: "🍄", value: hero.mushrooms },
        { key: "dust", label: "Crafting Dust", emoji: "🌫️", value: hero.dust },
        { key: "windfall", label: "Biggest Single Payout", emoji: "🌟", value: biggestCredit?.delta ?? 0, unit: "🪙" },
      ],
    },
    {
      key: "adventuring",
      title: "The Long Road",
      emoji: "🧭",
      blurb: "Miles walked and floors braved.",
      stats: [
        { key: "quests", label: "Quests Completed", emoji: "🗺️", value: questCount },
        { key: "floors", label: "Dungeon Floors Cleared", emoji: "🗝️", value: floorsCleared },
        { key: "days", label: "Days Adventuring", emoji: "📅", value: daysAdventuring, unit: "days" },
        {
          key: "joined",
          label: "First Set Out",
          emoji: "🚪",
          value: 0,
          display: hero.createdAt.toLocaleDateString(),
        },
      ],
    },
    {
      key: "collection",
      title: "The Trophy Room",
      emoji: "🏆",
      blurb: "Companions kept and glories earned.",
      stats: [
        { key: "pets", label: "Pets Adopted", emoji: "🐾", value: petCount },
        { key: "achievements", label: "Achievements Earned", emoji: "🏅", value: achievementCount },
      ],
    },
  ];

  return {
    hero: {
      name: hero.name,
      class: hero.class,
      level: hero.level,
      daysAdventuring,
      joinedAt: hero.createdAt,
    },
    headline: {
      lifetimeGoldEarned,
      lifetimeGoldSpent,
      biggestWindfall: biggestCredit?.delta ?? 0,
      biggestWindfallReason: biggestCredit ? reasonMeta(biggestCredit.reason) : null,
    },
    sections,
    goldBySource,
    goldBySink,
  };
}
