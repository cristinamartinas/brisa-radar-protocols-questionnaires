"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { loadCharacter } from "@/lib/data";
import { currencyLedgerOps, type CurrencyDelta } from "@/lib/ledger";
import type { ActionResult } from "@/lib/actions";

// ---------------------------------------------------------------------------
// The Bounty Board
//
// Tougher cousins of the Daily Deeds: bigger asks, chunkier purses. Like the
// dailies, every bounty is evaluated against TODAY's activity by counting
// existing history rows (QuestLog, BattleLog, WorldBossHit, the currency
// ledger) — we deliberately never hook the core loops, so the board stays
// additive and can never wedge a fight or a forge. UTC throughout: a "day" is
// a yyyy-mm-dd string and "since" is that day at T00:00:00.000Z.
// ---------------------------------------------------------------------------

/** Today as a UTC yyyy-mm-dd string. The one source of "what day is it". */
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** The UTC midnight that opens `day` — the lower bound for "today's" rows. */
function midnightOf(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

// Dungeon AND Tower battle logs tag their opponent name with a "floor N"
// marker (see raidDungeon / climbTower); arena duels never do. That lets us
// tell the PvE climbs apart from PvP on the shared BattleLog table.
const FLOOR_MARKER = "floor";

/**
 * A bounty. `count` returns how much of the goal the hero has racked up today
 * (a running tally, not a boolean); `goal` is the tally needed to post it as
 * done. Purses flow through the ledger under "BOUNTY_REWARD".
 */
interface Bounty {
  key: string;
  label: string;
  emoji: string;
  goal: number;
  reward: CurrencyDelta;
  count: (characterId: string, since: Date) => Promise<number>;
}

const BOUNTIES: Bounty[] = [
  {
    key: "arena-brawler",
    label: "Win 3 arena duels today",
    emoji: "🗡️",
    goal: 3,
    reward: { gold: 300 },
    count: (characterId, since) =>
      prisma.battleLog.count({
        where: {
          characterId,
          won: true,
          createdAt: { gte: since },
          NOT: { opponentName: { contains: FLOOR_MARKER } },
        },
      }),
  },
  {
    key: "floor-crawler",
    label: "Clear 5 dungeon or tower floors today",
    emoji: "🗝️",
    goal: 5,
    reward: { gold: 400 },
    count: (characterId, since) =>
      prisma.battleLog.count({
        where: {
          characterId,
          won: true,
          createdAt: { gte: since },
          opponentName: { contains: FLOOR_MARKER },
        },
      }),
  },
  {
    key: "gold-hoarder",
    label: "Earn 800 gold today",
    emoji: "💰",
    goal: 800,
    reward: { gold: 250, mushrooms: 1 },
    count: async (characterId, since) => {
      const agg = await prisma.currencyLedger.aggregate({
        where: {
          characterId,
          currency: "GOLD",
          delta: { gt: 0 },
          createdAt: { gte: since },
        },
        _sum: { delta: true },
      });
      return agg._sum.delta ?? 0;
    },
  },
  {
    key: "boss-slugger",
    label: "Land 3 world-boss hits today",
    emoji: "🐲",
    goal: 3,
    reward: { gold: 350 },
    count: (characterId, since) =>
      prisma.worldBossHit.count({
        where: { characterId, createdAt: { gte: since } },
      }),
  },
  {
    key: "forge-fiddler",
    label: "Reforge or upgrade an item today",
    emoji: "🔨",
    goal: 1,
    reward: { gold: 200, mushrooms: 1 },
    count: (characterId, since) =>
      prisma.currencyLedger.count({
        where: {
          characterId,
          reason: { in: ["FORGE_REROLL", "FORGE_UPGRADE"] },
          createdAt: { gte: since },
        },
      }),
  },
];

export interface BountyView {
  key: string;
  label: string;
  emoji: string;
  progress: number;
  goal: number;
  done: boolean;
  claimed: boolean;
  reward: CurrencyDelta;
}

export interface BountyBoardView {
  day: string;
  bounties: BountyView[];
}

/**
 * Load (or lazily create) today's BountyState for a hero, rolling it over to a
 * fresh day when the stored `day` has gone stale — which clears the claimed
 * set so the board resets each UTC day. Then tally each bounty against today's
 * activity and return a UI-ready view.
 */
export async function loadBounties(characterId: string): Promise<BountyBoardView> {
  const day = todayUtc();

  let state = await prisma.bountyState.findUnique({ where: { characterId } });
  if (!state) {
    state = await prisma.bountyState.create({ data: { characterId, day } });
  } else if (state.day !== day) {
    state = await prisma.bountyState.update({
      where: { characterId },
      data: { day, claimed: "[]" },
    });
  }

  const claimedKeys = new Set<string>(JSON.parse(state.claimed) as string[]);
  const since = midnightOf(day);

  const bounties: BountyView[] = await Promise.all(
    BOUNTIES.map(async (b) => {
      const progress = await b.count(characterId, since);
      return {
        key: b.key,
        label: b.label,
        emoji: b.emoji,
        progress,
        goal: b.goal,
        done: progress >= b.goal,
        claimed: claimedKeys.has(b.key),
        reward: b.reward,
      };
    }),
  );

  return { day, bounties };
}

/** Human-friendly one-liner describing a currency reward. */
function describeReward(reward: CurrencyDelta): string {
  const parts: string[] = [];
  if (reward.gold) parts.push(`+${reward.gold}🪙`);
  if (reward.mushrooms) parts.push(`+${reward.mushrooms}🍄`);
  return parts.join(" ");
}

/** Sum a list of currency rewards into a single delta. */
function sumRewards(rewards: CurrencyDelta[]): CurrencyDelta {
  return rewards.reduce<CurrencyDelta>(
    (acc, r) => ({
      gold: (acc.gold ?? 0) + (r.gold ?? 0),
      mushrooms: (acc.mushrooms ?? 0) + (r.mushrooms ?? 0),
    }),
    {},
  );
}

/**
 * Claim a finished bounty. Server-authoritative: we re-tally the bounty from
 * the history rows and re-check the claimed set inside the same request, so a
 * double-submit or a not-yet-earned claim can't slip through the board.
 */
export async function claimBounty(key: string): Promise<ActionResult> {
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const bounty = BOUNTIES.find((b) => b.key === key);
  if (!bounty) return { ok: false, message: "No such bounty on the board." };

  const day = todayUtc();
  const since = midnightOf(day);

  let state = await prisma.bountyState.findUnique({
    where: { characterId: character.id },
  });
  if (!state || state.day !== day) {
    // Roll over (or create) before claiming, so we're always acting on today.
    state = await prisma.bountyState.upsert({
      where: { characterId: character.id },
      create: { characterId: character.id, day },
      update: { day, claimed: "[]" },
    });
  }

  const claimed = new Set<string>(JSON.parse(state.claimed) as string[]);
  if (claimed.has(key)) {
    return { ok: false, message: "Already collected on that one, bounty hunter." };
  }

  const done = (await bounty.count(character.id, since)) >= bounty.goal;
  if (!done) {
    return { ok: false, message: `Not earned yet — ${bounty.label.toLowerCase()}.` };
  }

  claimed.add(key);

  await prisma.$transaction([
    prisma.bountyState.update({
      where: { characterId: character.id },
      data: { claimed: JSON.stringify([...claimed]) },
    }),
    prisma.character.update({
      where: { id: character.id },
      data: {
        gold: character.gold + (bounty.reward.gold ?? 0),
        mushrooms: character.mushrooms + (bounty.reward.mushrooms ?? 0),
      },
    }),
    ...currencyLedgerOps(
      character.id,
      { gold: character.gold, mushrooms: character.mushrooms },
      bounty.reward,
      "BOUNTY_REWARD",
    ),
  ]);

  revalidatePath("/");
  return {
    ok: true,
    message: `${bounty.emoji} Bounty collected! ${describeReward(bounty.reward)} — spend it well.`,
  };
}

/**
 * Collect every finished-but-unclaimed bounty in one go. Re-derives each
 * bounty's "done" state server-side and pays the lot through a single ledger
 * write per currency, so the audit trail stays clean and balanceAfter is right.
 */
export async function claimAllBounties(): Promise<ActionResult> {
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const day = todayUtc();
  const since = midnightOf(day);

  let state = await prisma.bountyState.findUnique({
    where: { characterId: character.id },
  });
  if (!state || state.day !== day) {
    state = await prisma.bountyState.upsert({
      where: { characterId: character.id },
      create: { characterId: character.id, day },
      update: { day, claimed: "[]" },
    });
  }

  const claimed = new Set<string>(JSON.parse(state.claimed) as string[]);
  const payable: Bounty[] = [];

  for (const bounty of BOUNTIES) {
    if (claimed.has(bounty.key)) continue;
    const done = (await bounty.count(character.id, since)) >= bounty.goal;
    if (!done) continue;
    payable.push(bounty);
    claimed.add(bounty.key);
  }

  if (payable.length === 0) {
    return { ok: false, message: "Nothing on the board to collect yet. Get to work." };
  }

  const total = sumRewards(payable.map((b) => b.reward));

  await prisma.$transaction([
    prisma.bountyState.update({
      where: { characterId: character.id },
      data: { claimed: JSON.stringify([...claimed]) },
    }),
    prisma.character.update({
      where: { id: character.id },
      data: {
        gold: character.gold + (total.gold ?? 0),
        mushrooms: character.mushrooms + (total.mushrooms ?? 0),
      },
    }),
    ...currencyLedgerOps(
      character.id,
      { gold: character.gold, mushrooms: character.mushrooms },
      total,
      "BOUNTY_REWARD",
    ),
  ]);

  revalidatePath("/");
  return {
    ok: true,
    message: `${payable.length} ${payable.length === 1 ? "bounty" : "bounties"} collected! ${describeReward(total)}`,
  };
}
