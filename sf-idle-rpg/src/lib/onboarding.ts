/**
 * New Adventurer's Checklist — a read-only onboarding model.
 *
 * `loadOnboarding` evaluates a handful of "first hour" milestones directly from
 * the hero's real state, so a fresh player gets a warm, self-checking to-do list
 * that ticks itself off as they play and quietly retires once they've found
 * their feet. It writes NOTHING (no schema, no rows) and has no "use server"
 * directive — it's a plain read model, safe to call from a render.
 *
 * Each step is derived with a cheap count/aggregate query. Dungeon and arena
 * battles share the BattleLog table; they're told apart the same way the rest of
 * the game does it — dungeon/tower fights bury a "floor" marker in the decorated
 * opponent label, arena fights store the opponent verbatim (see dailies.ts /
 * bounties.ts).
 */

import { prisma } from "@/lib/db";

/** Substring that marks a BattleLog row as a dungeon/tower floor fight. */
const FLOOR_MARKER = "floor";

/** Level at which we consider a hero "established" and hide the checklist. */
const GRADUATION_LEVEL = 10;

export interface OnboardingStep {
  key: string;
  label: string;
  emoji: string;
  done: boolean;
  /** One-line mentor nudge shown while the step is still open. */
  hint: string;
}

export interface OnboardingView {
  steps: OnboardingStep[];
  doneCount: number;
  total: number;
  /** True once every step is done OR the hero has out-levelled the tutorial. */
  graduated: boolean;
}

/**
 * Evaluate the new-adventurer checklist for a hero from live state. Runs a
 * small batch of count queries in parallel and folds them into a display-ready
 * list of steps. Read-only.
 */
export async function loadOnboarding(
  characterId: string,
): Promise<OnboardingView> {
  const [
    character,
    quests,
    arenaWins,
    gear,
    dungeonFloorWins,
    dungeonProgressed,
    pets,
  ] = await Promise.all([
    prisma.character.findUnique({
      where: { id: characterId },
      select: { level: true, guildId: true },
    }),
    // Went on a quest.
    prisma.questLog.count({ where: { characterId } }),
    // Won an arena duel (a real PvP win, not a dungeon/tower floor).
    prisma.battleLog.count({
      where: {
        characterId,
        won: true,
        NOT: { opponentName: { contains: FLOOR_MARKER } },
      },
    }),
    // Bought or equipped a piece of gear (anything out of the shop).
    prisma.item.count({
      where: { characterId, location: { in: ["INVENTORY", "EQUIPPED"] } },
    }),
    // Cleared a dungeon floor — recorded as a won BattleLog with the marker...
    prisma.battleLog.count({
      where: {
        characterId,
        won: true,
        opponentName: { contains: FLOOR_MARKER },
      },
    }),
    // ...or reflected in dungeon progress advancing past the first floor.
    prisma.dungeonProgress.count({
      where: { characterId, floor: { gt: 1 } },
    }),
    // Adopted a companion.
    prisma.pet.count({ where: { characterId } }),
  ]);

  const level = character?.level ?? 1;
  const inGuild = !!character?.guildId;
  const dungeonCleared = dungeonFloorWins > 0 || dungeonProgressed > 0;

  const steps: OnboardingStep[] = [
    {
      key: "quest",
      label: "Send your hero on a quest",
      emoji: "🍺",
      done: quests > 0,
      hint: "Visit the Tavern and pick a quest — longer trips pay more.",
    },
    {
      key: "gear",
      label: "Grab your first piece of gear",
      emoji: "🪄",
      done: gear > 0,
      hint: "Buy something from the Magic Shop, then equip it from your bag.",
    },
    {
      key: "arena",
      label: "Win an arena duel",
      emoji: "🛡️",
      done: arenaWins > 0,
      hint: "Step into the Arena and pummel another hero for their gold.",
    },
    {
      key: "level5",
      label: "Reach level 5",
      emoji: "⭐",
      done: level >= 5,
      hint: "Keep questing and duelling — the XP piles up faster than you'd think.",
    },
    {
      key: "dungeon",
      label: "Clear a dungeon floor",
      emoji: "🗝️",
      done: dungeonCleared,
      hint: "Head to the Dungeons and fight your way down the first floor.",
    },
    {
      key: "pet",
      label: "Adopt a companion",
      emoji: "🐾",
      done: pets > 0,
      hint: "Swing by the Adoption Shelter and take home a critter that forages for gold.",
    },
    {
      key: "guild",
      label: "Join a guild",
      emoji: "🏰",
      done: inGuild,
      hint: "Join a guild from the directory for a quest-gold bonus and good company.",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const total = steps.length;
  const graduated = doneCount === total || level >= GRADUATION_LEVEL;

  return { steps, doneCount, total, graduated };
}
