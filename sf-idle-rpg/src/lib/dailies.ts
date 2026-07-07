"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { loadCharacter } from "@/lib/data";
import { currencyLedgerOps, type CurrencyDelta } from "@/lib/ledger";
import type { ActionResult } from "@/lib/actions";

// ---------------------------------------------------------------------------
// Daily Quests & Login Streak
//
// A daily reason to swing back through the tavern. Tasks are defined in code
// and evaluated against TODAY's activity by counting existing history rows —
// we deliberately do NOT hook into the quest/arena/dungeon actions, so this
// feature stays additive and can never wedge the core loops. UTC throughout:
// a "day" is a yyyy-mm-dd string, and "today's midnight" is that string at
// T00:00:00.000Z.
// ---------------------------------------------------------------------------

/** Today as a UTC yyyy-mm-dd string. The one source of "what day is it". */
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** The UTC midnight that opens `day` — the lower bound for "today's" rows. */
function midnightOf(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

/** Yesterday relative to a UTC yyyy-mm-dd string. */
function yesterdayOf(day: string): string {
  const d = midnightOf(day);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * A daily task. `count` returns how many qualifying things the hero did today;
 * `goal` is how many are needed to mark it done. Rewards flow through the
 * ledger under "DAILY_REWARD".
 */
interface DailyTask {
  key: string;
  label: string;
  emoji: string;
  goal: number;
  reward: CurrencyDelta;
  count: (characterId: string, since: Date) => Promise<number>;
}

// Dungeon battle logs are tagged with a "floor N" marker in their opponent
// name (see raidDungeon); arena duels never are. That lets us tell the two
// PvE/PvP loops apart from the shared BattleLog table.
const DUNGEON_MARKER = "floor";

const DAILY_TASKS: DailyTask[] = [
  {
    key: "quest",
    label: "Complete a quest",
    emoji: "🍺",
    goal: 1,
    reward: { gold: 50 },
    count: (characterId, since) =>
      prisma.questLog.count({
        where: { characterId, createdAt: { gte: since } },
      }),
  },
  {
    key: "arena",
    label: "Win an arena duel",
    emoji: "🛡️",
    goal: 1,
    reward: { gold: 40 },
    count: (characterId, since) =>
      prisma.battleLog.count({
        where: {
          characterId,
          won: true,
          createdAt: { gte: since },
          NOT: { opponentName: { contains: DUNGEON_MARKER } },
        },
      }),
  },
  {
    key: "dungeon",
    label: "Descend a dungeon floor",
    emoji: "🗝️",
    goal: 1,
    reward: { gold: 60 },
    count: (characterId, since) =>
      prisma.battleLog.count({
        where: {
          characterId,
          won: true,
          createdAt: { gte: since },
          opponentName: { contains: DUNGEON_MARKER },
        },
      }),
  },
];

export interface DailyTaskView {
  key: string;
  label: string;
  emoji: string;
  done: boolean;
  claimed: boolean;
  reward: CurrencyDelta;
}

export interface DailiesView {
  day: string;
  streak: number;
  loginClaimed: boolean;
  tasks: DailyTaskView[];
}

/** Login reward for a given streak length: escalating gold, plus a mushroom every 7th day. */
function loginReward(streak: number): CurrencyDelta {
  const gold = 25 + streak * 10;
  return streak % 7 === 0 ? { gold, mushrooms: 1 } : { gold };
}

/**
 * Load (or lazily create) today's DailyState for a hero, rolling it over to a
 * fresh day when the stored `day` has gone stale — that clears the claimed
 * tasks and the login flag, but preserves the streak (which only advances or
 * resets on an actual login claim). Then evaluate each task against today's
 * activity and return a UI-ready view.
 */
export async function loadDailies(characterId: string): Promise<DailiesView> {
  const day = todayUtc();

  let state = await prisma.dailyState.findUnique({ where: { characterId } });
  if (!state) {
    state = await prisma.dailyState.create({ data: { characterId, day } });
  } else if (state.day !== day) {
    state = await prisma.dailyState.update({
      where: { characterId },
      data: { day, tasksClaimed: "[]", loginClaimed: false },
    });
  }

  const claimedKeys = new Set<string>(JSON.parse(state.tasksClaimed) as string[]);
  const since = midnightOf(day);

  const tasks: DailyTaskView[] = await Promise.all(
    DAILY_TASKS.map(async (t) => ({
      key: t.key,
      label: t.label,
      emoji: t.emoji,
      done: (await t.count(characterId, since)) >= t.goal,
      claimed: claimedKeys.has(t.key),
      reward: t.reward,
    })),
  );

  return { day, streak: state.streak, loginClaimed: state.loginClaimed, tasks };
}

/** Human-friendly one-liner describing a currency reward. */
function describeReward(reward: CurrencyDelta): string {
  const parts: string[] = [];
  if (reward.gold) parts.push(`+${reward.gold}🪙`);
  if (reward.mushrooms) parts.push(`+${reward.mushrooms}🍄`);
  return parts.join(" ");
}

/**
 * Claim a finished daily task. Server-authoritative: we re-derive "done" from
 * the history rows and re-check the claimed set inside the same request, so a
 * double-submit or a not-yet-earned claim can't slip through.
 */
export async function claimDailyTask(key: string): Promise<ActionResult> {
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const task = DAILY_TASKS.find((t) => t.key === key);
  if (!task) return { ok: false, message: "Unknown task." };

  const day = todayUtc();
  const since = midnightOf(day);

  let state = await prisma.dailyState.findUnique({
    where: { characterId: character.id },
  });
  if (!state || state.day !== day) {
    // Roll over (or create) before claiming, so we're always acting on today.
    state = await prisma.dailyState.upsert({
      where: { characterId: character.id },
      create: { characterId: character.id, day },
      update: { day, tasksClaimed: "[]", loginClaimed: false },
    });
  }

  const claimed = new Set<string>(JSON.parse(state.tasksClaimed) as string[]);
  if (claimed.has(key)) {
    return { ok: false, message: "Already claimed that one today. Greedy. 😏" };
  }

  const done = (await task.count(character.id, since)) >= task.goal;
  if (!done) {
    return { ok: false, message: `Not done yet — ${task.label.toLowerCase()} first!` };
  }

  claimed.add(key);

  await prisma.$transaction([
    prisma.dailyState.update({
      where: { characterId: character.id },
      data: { tasksClaimed: JSON.stringify([...claimed]) },
    }),
    prisma.character.update({
      where: { id: character.id },
      data: {
        gold: character.gold + (task.reward.gold ?? 0),
        mushrooms: character.mushrooms + (task.reward.mushrooms ?? 0),
      },
    }),
    ...currencyLedgerOps(
      character.id,
      { gold: character.gold, mushrooms: character.mushrooms },
      task.reward,
      "DAILY_REWARD",
    ),
  ]);

  revalidatePath("/");
  return {
    ok: true,
    message: `${task.emoji} ${task.label} — reward claimed! ${describeReward(task.reward)}`,
  };
}

/**
 * Claim the daily login reward and advance the streak. Once per UTC day. A
 * streak continues only if the last claim was literally yesterday; any gap
 * resets it to 1. Every 7th day pays out a bonus mushroom.
 */
export async function claimLogin(): Promise<ActionResult> {
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const day = todayUtc();

  let state = await prisma.dailyState.findUnique({
    where: { characterId: character.id },
  });
  if (!state || state.day !== day) {
    state = await prisma.dailyState.upsert({
      where: { characterId: character.id },
      create: { characterId: character.id, day },
      update: { day, tasksClaimed: "[]", loginClaimed: false },
    });
  }

  if (state.loginClaimed) {
    return { ok: false, message: "Already checked in today. See you tomorrow! 👋" };
  }

  const continued = state.lastClaimDay === yesterdayOf(day);
  const streak = continued ? state.streak + 1 : 1;
  const reward = loginReward(streak);

  await prisma.$transaction([
    prisma.dailyState.update({
      where: { characterId: character.id },
      data: { streak, loginClaimed: true, lastClaimDay: day },
    }),
    prisma.character.update({
      where: { id: character.id },
      data: {
        gold: character.gold + (reward.gold ?? 0),
        mushrooms: character.mushrooms + (reward.mushrooms ?? 0),
      },
    }),
    ...currencyLedgerOps(
      character.id,
      { gold: character.gold, mushrooms: character.mushrooms },
      reward,
      "DAILY_REWARD",
    ),
  ]);

  revalidatePath("/");

  const flair = continued
    ? `Day ${streak} streak — keep it burning! 🔥`
    : streak === 1 && state.lastClaimDay
      ? "Streak reset, but a fresh start counts. Welcome back!"
      : "Welcome, hero!";
  let message = `🗓️ Daily check-in! ${describeReward(reward)}. ${flair}`;
  if (reward.mushrooms) message += " Lucky 7 mushroom bonus! 🍄";
  return { ok: true, message };
}
