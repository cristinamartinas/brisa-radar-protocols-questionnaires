/**
 * Pure game rules for the Shakes & Fidget–style idle RPG.
 *
 * Everything here runs ONLY on the server (it is imported exclusively by
 * server actions). The browser never computes rewards or combat outcomes,
 * which keeps the game server-authoritative and hard to cheat.
 */

export type CharClass = "WARRIOR" | "MAGE" | "SCOUT";

export interface Attributes {
  strength: number;
  dexterity: number;
  intelligence: number;
  constitution: number;
  luck: number;
}

export type PrimaryStat = "strength" | "dexterity" | "intelligence";

export interface ClassDef {
  id: CharClass;
  label: string;
  emoji: string;
  blurb: string;
  primary: PrimaryStat;
  hpFactor: number;
  base: Attributes;
}

export const CLASSES: ClassDef[] = [
  {
    id: "WARRIOR",
    label: "Warrior",
    emoji: "⚔️",
    blurb: "Hits things until they stop moving. Tanky and reliable.",
    primary: "strength",
    hpFactor: 6,
    base: { strength: 15, dexterity: 8, intelligence: 6, constitution: 14, luck: 5 },
  },
  {
    id: "MAGE",
    label: "Mage",
    emoji: "🪄",
    blurb: "Glass cannon. Enormous damage, please don't get hit.",
    primary: "intelligence",
    hpFactor: 3,
    base: { strength: 6, dexterity: 9, intelligence: 16, constitution: 8, luck: 6 },
  },
  {
    id: "SCOUT",
    label: "Scout",
    emoji: "🏹",
    blurb: "Fast and lucky. Strikes first and crits often.",
    primary: "dexterity",
    hpFactor: 4,
    base: { strength: 9, dexterity: 15, intelligence: 8, constitution: 11, luck: 9 },
  },
];

export function getClass(id: string): ClassDef {
  return CLASSES.find((c) => c.id === id) ?? CLASSES[0];
}

/** Experience required to advance FROM `level` to the next level. */
export function xpForLevel(level: number): number {
  return 50 * level * level + 50 * level;
}

// ---------------------------------------------------------------------------
// Fighters + combat
// ---------------------------------------------------------------------------

export interface Fighter extends Attributes {
  name: string;
  class: CharClass;
  level: number;
}

export function primaryValue(f: Fighter): number {
  return f[getClass(f.class).primary];
}

export function maxHp(f: Fighter): number {
  return Math.round(f.constitution * (f.level + 1) * getClass(f.class).hpFactor);
}

export interface BattleResult {
  won: boolean;
  rounds: string[];
  opponent: Fighter;
}

function strike(attacker: Fighter, defender: Fighter): { dmg: number; crit: boolean } {
  const power = primaryValue(attacker);
  const variance = 0.6 + Math.random() * 0.8; // 0.6x – 1.4x
  let dmg = power * variance;

  const critChance = Math.min(0.5, 0.05 + attacker.luck / 200);
  const crit = Math.random() < critChance;
  if (crit) dmg *= 2;

  // Defender's constitution soaks a little damage.
  dmg = Math.max(1, dmg - defender.constitution * 0.3);
  return { dmg: Math.round(dmg), crit };
}

/**
 * Resolve a full turn-based duel between two fighters and return a
 * blow-by-blow log. The faster (higher dexterity) fighter strikes first.
 */
export function resolveBattle(me: Fighter, foe: Fighter): BattleResult {
  let myHp = maxHp(me);
  let foeHp = maxHp(foe);
  const rounds: string[] = [];

  // Determine turn order.
  const meFirst = me.dexterity >= foe.dexterity;
  let attacker = meFirst ? me : foe;
  let defender = meFirst ? foe : me;
  let attackerIsMe = meFirst;

  rounds.push(
    `⚔️ ${me.name} (${maxHp(me)} HP) faces ${foe.name} (${maxHp(foe)} HP)!`,
  );

  for (let turn = 0; turn < 60; turn++) {
    if (myHp <= 0 || foeHp <= 0) break;

    const { dmg, crit } = strike(attacker, defender);
    if (attackerIsMe) foeHp -= dmg;
    else myHp -= dmg;

    rounds.push(
      `${crit ? "💥 CRIT! " : ""}${attacker.name} hits ${defender.name} for ${dmg}. ` +
        `(${me.name}: ${Math.max(0, myHp)} HP · ${foe.name}: ${Math.max(0, foeHp)} HP)`,
    );

    // Swap roles for the next turn.
    [attacker, defender] = [defender, attacker];
    attackerIsMe = !attackerIsMe;
  }

  const won = myHp > foeHp;
  rounds.push(won ? `🏆 ${me.name} is victorious!` : `☠️ ${me.name} was defeated…`);
  return { won, rounds, opponent: foe };
}

// ---------------------------------------------------------------------------
// Quests (the idle adventuring loop)
// ---------------------------------------------------------------------------

const QUEST_TITLES = [
  "Retrieve the Baker's Missing Rolling Pin",
  "Escort a Suspiciously Talkative Goat",
  "Investigate the Haunted Outhouse",
  "Deliver 400 Cabbages Before Dusk",
  "Slay the Rats in the Tavern Cellar",
  "Find the Alchemist's Lost Reading Glasses",
  "Guard a Very Important Rock",
  "Recover Grandma's Enchanted Knitting",
  "Chase Off the Mildly Aggressive Geese",
  "Taste-Test the Wizard's New Potion",
  "Untangle the King's Fishing Line",
  "Reclaim the Stolen Cheese Wheel of Destiny",
];

export interface QuestResult {
  title: string;
  goldReward: number;
  xpReward: number;
  mushroomReward: number;
}

export function rollQuest(f: Fighter): QuestResult {
  const title = QUEST_TITLES[Math.floor(Math.random() * QUEST_TITLES.length)];
  const luckBonus = 1 + f.luck / 100;

  const goldReward = Math.round(
    (12 * f.level + Math.floor(Math.random() * (10 + f.level * 6))) * luckBonus,
  );
  const xpReward = Math.round(
    18 * f.level + Math.floor(Math.random() * (15 + f.level * 8)),
  );
  // Occasional lucky mushroom drop.
  const mushroomReward = Math.random() < 0.05 + f.luck / 400 ? 1 : 0;

  return { title, goldReward, xpReward, mushroomReward };
}

// ---------------------------------------------------------------------------
// Levelling
// ---------------------------------------------------------------------------

export interface Progression {
  class: CharClass;
  level: number;
  experience: number;
  strength: number;
  dexterity: number;
  intelligence: number;
  constitution: number;
  luck: number;
}

/**
 * Consume banked experience and apply as many level-ups as it affords,
 * mutating the passed object. Returns how many levels were gained so the
 * caller can flavour the UI.
 */
export function applyLevelUps(p: Progression): number {
  let gained = 0;
  while (p.experience >= xpForLevel(p.level)) {
    p.experience -= xpForLevel(p.level);
    p.level += 1;
    gained += 1;

    const primary = getClass(p.class).primary;
    p[primary] += 3;
    p.constitution += 2;
    p.strength += 1;
    p.dexterity += 1;
    p.intelligence += 1;
    p.luck += 1;
  }
  return gained;
}

// ---------------------------------------------------------------------------
// Opponent generation (used when there is no other real player to fight yet)
// ---------------------------------------------------------------------------

const NPC_NAMES = [
  "Sir Reginald the Rusty",
  "Grunk the Unwashed",
  "Mysterious Hooded Figure",
  "Brenda from Accounting",
  "The Dread Pirate Kevin",
  "Elandra Moonwhisper",
  "Gary, Destroyer of Worlds",
  "A Very Large Badger",
];

/** Build a synthetic opponent roughly matched to the given level. */
export function randomOpponent(level: number): Fighter {
  const cls = CLASSES[Math.floor(Math.random() * CLASSES.length)];
  const jitter = () => Math.floor(Math.random() * 5) - 2; // -2..+2
  const scale = level + jitter();
  const lvl = Math.max(1, scale);
  const name = NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)];

  const grow = (base: number) => base + (lvl - 1) * 3 + jitter();
  return {
    name,
    class: cls.id,
    level: lvl,
    strength: grow(cls.base.strength),
    dexterity: grow(cls.base.dexterity),
    intelligence: grow(cls.base.intelligence),
    constitution: grow(cls.base.constitution),
    luck: grow(cls.base.luck),
  };
}
