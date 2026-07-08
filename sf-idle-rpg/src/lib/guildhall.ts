/**
 * The Guild Hall — a shared, upgradable clubhouse that turns a guild from a
 * line on a leaderboard into a communal progression game. Members pool their
 * gold to level individual ROOMS; each room grants a described PERK that scales
 * with its level.
 *
 * The room catalog lives here in code (the DB only stores which room is at
 * which level, one row per guild+room), so balance is a code review, not a
 * migration. All validation — guild membership, room existence, level caps,
 * cost, and the payer's gold — happens server-side; the client may ask, but
 * the ledger decides.
 *
 * Perks are LIVE: `guildPerks()` (below) resolves built rooms into gameplay
 * bonuses, and actions.ts applies them — Treasury → quest gold, Library → quest
 * XP, War Room → arena winnings. (Barracks' flat stat bonus is defined and
 * displayed but not yet folded into combat — a small follow-up in toFighter.)
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { loadCharacter } from "@/lib/data";
import { currencyLedgerOps } from "@/lib/ledger";
import type { ActionResult } from "@/lib/actions";

// ---------------------------------------------------------------------------
// The catalog (code-defined)
// ---------------------------------------------------------------------------

export interface GuildRoomPerk {
  /** The raw magnitude of the perk at a given level (0 when unbuilt). */
  value: number;
  /** A player-facing sentence describing what this level grants. */
  description: string;
}

export interface GuildRoomDef {
  key: string;
  name: string;
  emoji: string;
  description: string;
  /** How deep the room can be built. Level 0 = an empty plot, no perk yet. */
  maxLevel: number;
  /** Base gold for the FIRST level; each level after costs more (see cost()). */
  baseCost: number;
  /** The perk this room grants at `level` (0 = unbuilt, no perk). */
  perk: (level: number) => GuildRoomPerk;
}

/**
 * Five rooms, one plot per theme. Perk magnitudes are deliberately modest and
 * linear-per-level so the guild always understands what the next brick buys.
 */
export const GUILD_ROOMS: GuildRoomDef[] = [
  {
    key: "treasury",
    name: "The Treasury",
    emoji: "🪙",
    description:
      "A vault of dubious accounting that sweetens every member's quest takings.",
    maxLevel: 5,
    baseCost: 400,
    perk: (level) => ({
      value: level * 3,
      description:
        level === 0
          ? "An empty strongroom. Build it to boost guild quest gold."
          : `+${level * 3}% quest gold for every member on top of the roster bonus.`,
    }),
  },
  {
    key: "barracks",
    name: "The Barracks",
    emoji: "🛡️",
    description:
      "Drills at dawn, paperwork at dusk. Toughens every hero on the roster.",
    maxLevel: 5,
    baseCost: 350,
    perk: (level) => ({
      value: level * 2,
      description:
        level === 0
          ? "A cold, empty yard. Build it to grant members a flat stat bonus."
          : `+${level * 2} to every attribute for all members while enlisted.`,
    }),
  },
  {
    key: "warRoom",
    name: "The War Room",
    emoji: "⚔️",
    description:
      "Maps, pins, and strong opinions. Sharpens members in the arena.",
    maxLevel: 5,
    baseCost: 500,
    perk: (level) => ({
      value: level * 5,
      description:
        level === 0
          ? "A bare table awaiting a map. Build it to boost arena winnings."
          : `+${level * 5}% gold from every arena victory.`,
    }),
  },
  {
    key: "library",
    name: "The Library",
    emoji: "📚",
    description:
      "Suspiciously well-stocked for a guild of brawlers. Speeds up learning.",
    maxLevel: 5,
    baseCost: 450,
    perk: (level) => ({
      value: level * 4,
      description:
        level === 0
          ? "Empty shelves and good intentions. Build it to boost quest XP."
          : `+${level * 4}% experience from completed quests for all members.`,
    }),
  },
  {
    key: "trophyHall",
    name: "The Trophy Hall",
    emoji: "🏆",
    description:
      "A monument to the guild's own magnificence. Grants prestige and bragging rights.",
    maxLevel: 5,
    baseCost: 600,
    perk: (level) => ({
      value: level * 10,
      description:
        level === 0
          ? "Bare plinths awaiting glory. Build it to accrue guild prestige."
          : `+${level * 10} guild prestige — the envy of every rival charter.`,
    }),
  },
];

export function getGuildRoom(key: string): GuildRoomDef | undefined {
  return GUILD_ROOMS.find((r) => r.key === key);
}

// ---------------------------------------------------------------------------
// Pure helpers (safe to import anywhere; no server-only deps)
// ---------------------------------------------------------------------------

/**
 * Gold to raise a room FROM `currentLevel` to the next. Scales ~1.75× per
 * level, so the first brick is cheap and the roof is a guild-wide effort.
 */
export function upgradeCost(def: GuildRoomDef, currentLevel: number): number {
  return Math.round(def.baseCost * Math.pow(1.75, currentLevel));
}

/**
 * Resolve a guild's built rooms into the gameplay bonuses they grant. Pure and
 * server-only-dep-free, so reward/combat paths can apply it. Missing rooms = 0.
 */
export function guildPerks(rooms: { room: string; level: number }[]): {
  questGoldPct: number;
  questXpPct: number;
  arenaGoldPct: number;
  statBonus: number;
} {
  const lvl = (key: string) => rooms.find((r) => r.room === key)?.level ?? 0;
  return {
    questGoldPct: lvl("treasury") * 3,
    questXpPct: lvl("library") * 4,
    arenaGoldPct: lvl("warRoom") * 5,
    statBonus: lvl("barracks") * 2,
  };
}

/** One room, annotated with its current state for the hall UI. */
export interface GuildRoomView {
  key: string;
  name: string;
  emoji: string;
  description: string;
  level: number;
  maxLevel: number;
  maxed: boolean;
  currentPerk: GuildRoomPerk;
  nextPerk: GuildRoomPerk | null;
  upgradeCost: number;
}

// ---------------------------------------------------------------------------
// Read model
// ---------------------------------------------------------------------------

/**
 * The whole catalog annotated with this guild's current levels. Rooms with no
 * stored row default to level 0 (an empty plot), so the first upgrade "builds"
 * them to level 1.
 */
export async function loadGuildHall(guildId: string): Promise<GuildRoomView[]> {
  const rows = await prisma.guildRoom.findMany({ where: { guildId } });
  const levelOf = (key: string) =>
    rows.find((r) => r.room === key)?.level ?? 0;

  return GUILD_ROOMS.map((def) => {
    const level = levelOf(def.key);
    const maxed = level >= def.maxLevel;
    return {
      key: def.key,
      name: def.name,
      emoji: def.emoji,
      description: def.description,
      level,
      maxLevel: def.maxLevel,
      maxed,
      currentPerk: def.perk(level),
      nextPerk: maxed ? null : def.perk(level + 1),
      upgradeCost: upgradeCost(def, level),
    };
  });
}

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

/**
 * Contribute gold to raise one room by a level. Any guild member may pay — no
 * role system yet. Everything is re-validated here; the client's disabled
 * buttons are a courtesy, not a boundary.
 */
export async function upgradeRoom(room: string): Promise<ActionResult> {
  "use server";
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };
  if (!character.guildId || !character.guild) {
    return { ok: false, message: "Join or found a guild to build a hall." };
  }

  const def = getGuildRoom(room);
  if (!def) return { ok: false, message: "No such room in the hall." };

  const existing = await prisma.guildRoom.findUnique({
    where: { guildId_room: { guildId: character.guildId, room } },
  });
  const currentLevel = existing?.level ?? 0;

  if (currentLevel >= def.maxLevel) {
    return { ok: false, message: `${def.name} is already fully built. 🏛️` };
  }

  const cost = upgradeCost(def, currentLevel);
  if (character.gold < cost) {
    return {
      ok: false,
      message: `${def.name}'s next level costs ${cost} gold. The guild ledger notes your shortfall.`,
    };
  }

  const nextLevel = currentLevel + 1;

  await prisma.$transaction([
    prisma.character.update({
      where: { id: character.id },
      data: { gold: character.gold - cost },
    }),
    prisma.guildRoom.upsert({
      where: { guildId_room: { guildId: character.guildId, room } },
      create: { guildId: character.guildId, room, level: nextLevel },
      update: { level: nextLevel },
    }),
    ...currencyLedgerOps(
      character.id,
      { gold: character.gold, mushrooms: character.mushrooms },
      { gold: -cost },
      "GUILD_UPGRADE",
    ),
  ]);

  revalidatePath("/");
  return {
    ok: true,
    message: `${def.emoji} ${def.name} raised to level ${nextLevel} for ${cost} gold. The guild salutes your contribution.`,
  };
}
