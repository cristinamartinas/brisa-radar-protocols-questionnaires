/**
 * Pure game rules for the Shakes & Fidget–style idle RPG.
 *
 * Everything here runs ONLY on the server (it is imported exclusively by
 * server actions). The browser never computes rewards or combat outcomes,
 * which keeps the game server-authoritative and hard to cheat.
 *
 * All randomness flows through a seeded `Rng` (see rng.ts) passed in by the
 * caller — nothing here calls Math.random — so every outcome is reproducible
 * from its stored seed.
 */

import { type Rng, pick as pickRng } from "@/lib/rng";
import {
  applySkills,
  newSkillRuntime,
  type LoadoutSlot,
} from "@/lib/skills";

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

// --- derived combat stats -------------------------------------------------
// One source of truth for the numbers shown on the Character screen. These
// mirror what `strike()` actually does, so the sheet never drifts from combat.

/** Per-swing damage spread: primary stat × the 0.6–1.4 variance in `strike`. */
export function damageRange(f: Fighter): { min: number; max: number } {
  const power = primaryValue(f);
  return { min: Math.round(power * 0.6), max: Math.round(power * 1.4) };
}

/** Critical-hit chance as a 0–1 fraction (5% base + Luck/200, capped at 50%). */
export function critChance(f: Fighter): number {
  return Math.min(0.5, 0.05 + f.luck / 200);
}

/** Flat damage soaked from each incoming hit (Constitution × 0.3, rounded). */
export function mitigation(f: Fighter): number {
  return Math.round(f.constitution * 0.3);
}

/** One resolved swing, with enough state to animate a blow-by-blow replay. */
export interface BattleEvent {
  turn: number;
  /** True when the hero (me) is the attacker this swing. */
  byMe: boolean;
  attacker: string;
  defender: string;
  /** Damage actually applied (after any shield soak). */
  dmg: number;
  crit: boolean;
  absorbed: number;
  heal: number;
  /** Both fighters' HP after this swing (clamped at 0). */
  myHp: number;
  foeHp: number;
  /** Skill flavor lines emitted this swing. */
  notes: string[];
}

export interface BattleResult {
  won: boolean;
  rounds: string[];
  events: BattleEvent[];
  meMaxHp: number;
  foeMaxHp: number;
  opponent: Fighter;
}

function strike(
  rng: Rng,
  attacker: Fighter,
  defender: Fighter,
  dmgMult = 1,
  critBonus = 0,
): { dmg: number; crit: boolean } {
  const power = primaryValue(attacker);
  const variance = 0.6 + rng() * 0.8; // 0.6x – 1.4x
  let dmg = power * variance * dmgMult;

  const critChance = Math.min(0.5, 0.05 + attacker.luck / 200 + critBonus);
  const crit = rng() < critChance;
  if (crit) dmg *= 2;

  // Defender's constitution soaks a little damage.
  dmg = Math.max(1, dmg - defender.constitution * 0.3);
  return { dmg: Math.round(dmg), crit };
}

/**
 * Resolve a full turn-based duel between two fighters and return a
 * blow-by-blow log. The faster (higher dexterity) fighter strikes first.
 *
 * Fully deterministic: given the same two fighters and the same `rng` seed,
 * the fight always resolves identically — which is what makes replays,
 * spectating, provably-fair ladders, and combat unit tests possible.
 *
 * Optional `meSkills`/`foeSkills` are ordered active-skill loadouts (see
 * skills.ts). When both are empty — as with every legacy 3-argument caller —
 * `applySkills` is a no-op that touches neither the log nor the rng, so those
 * fights resolve bit-for-bit as they did before this system existed.
 */
export function resolveBattle(
  rng: Rng,
  me: Fighter,
  foe: Fighter,
  meSkills: LoadoutSlot[] = [],
  foeSkills: LoadoutSlot[] = [],
): BattleResult {
  let myHp = maxHp(me);
  let foeHp = maxHp(foe);
  const myMax = myHp;
  const foeMax = foeHp;
  const rounds: string[] = [];
  const events: BattleEvent[] = [];

  // Determine turn order.
  const meFirst = me.dexterity >= foe.dexterity;
  let attacker = meFirst ? me : foe;
  let defender = meFirst ? foe : me;
  let attackerIsMe = meFirst;

  // Per-fighter skill runtime + loadout, kept aligned with attacker/defender
  // as the roles swap each turn.
  const meRt = newSkillRuntime();
  const foeRt = newSkillRuntime();
  let attackerRt = meFirst ? meRt : foeRt;
  let defenderRt = meFirst ? foeRt : meRt;
  let attackerSkills = meFirst ? meSkills : foeSkills;
  let defenderSkills = meFirst ? foeSkills : meSkills;

  rounds.push(
    `⚔️ ${me.name} (${maxHp(me)} HP) faces ${foe.name} (${maxHp(foe)} HP)!`,
  );

  for (let turn = 0; turn < 60; turn++) {
    if (myHp <= 0 || foeHp <= 0) break;

    attackerRt.turns += 1;
    const { dmg, crit } = strike(
      rng,
      attacker,
      defender,
      attackerRt.rallyMult,
      attackerRt.critBonus,
    );

    // Resolve the attacker's skills for this swing.
    const selfHp = attackerIsMe ? myHp : foeHp;
    const selfMax = attackerIsMe ? myMax : foeMax;
    const targetHp = attackerIsMe ? foeHp : myHp;
    const targetMax = attackerIsMe ? foeMax : myMax;
    const outcome = applySkills(
      rng,
      attackerSkills,
      {
        self: attacker,
        foe: defender,
        selfHp,
        selfMaxHp: selfMax,
        foeHp: targetHp,
        foeMaxHp: targetMax,
        baseDmg: dmg,
        didCrit: crit,
        turn: attackerRt.turns,
      },
      attackerRt,
    );

    // Combine the base hit with any skill bonus, then let the defender's
    // pending shield (if any) soak the incoming blow.
    let total = dmg + outcome.bonusDamage;
    let absorbed = 0;
    if (defenderRt.shield > 0) {
      absorbed = Math.min(defenderRt.shield, Math.max(0, total - 1));
      total -= absorbed;
      defenderRt.shield = 0;
    }

    if (attackerIsMe) foeHp -= total;
    else myHp -= total;

    // Apply the attacker's self-heal (capped at their maximum).
    if (outcome.selfHeal > 0) {
      if (attackerIsMe) myHp = Math.min(myMax, myHp + outcome.selfHeal);
      else foeHp = Math.min(foeMax, foeHp + outcome.selfHeal);
    }

    rounds.push(
      `${crit ? "💥 CRIT! " : ""}${attacker.name} hits ${defender.name} for ${total}. ` +
        `(${me.name}: ${Math.max(0, myHp)} HP · ${foe.name}: ${Math.max(0, foeHp)} HP)`,
    );
    for (const line of outcome.logs) rounds.push(line);
    if (absorbed > 0) {
      rounds.push(`🛡️ ${defender.name}'s guard absorbs ${absorbed} damage.`);
    }

    events.push({
      turn: attackerRt.turns,
      byMe: attackerIsMe,
      attacker: attacker.name,
      defender: defender.name,
      dmg: total,
      crit,
      absorbed,
      heal: outcome.selfHeal,
      myHp: Math.max(0, myHp),
      foeHp: Math.max(0, foeHp),
      notes: outcome.logs,
    });

    // Swap roles (and their aligned skill state) for the next turn.
    [attacker, defender] = [defender, attacker];
    [attackerRt, defenderRt] = [defenderRt, attackerRt];
    [attackerSkills, defenderSkills] = [defenderSkills, attackerSkills];
    attackerIsMe = !attackerIsMe;
  }

  const won = myHp > foeHp;
  rounds.push(won ? `🏆 ${me.name} is victorious!` : `☠️ ${me.name} was defeated…`);
  return { won, rounds, events, meMaxHp: myMax, foeMaxHp: foeMax, opponent: foe };
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

/**
 * Quest lengths, à la Shakes & Fidget: longer adventures take real time but
 * pay out proportionally more. Durations are short here so the loop is
 * pleasant to watch during development.
 */
export interface QuestLength {
  key: string;
  label: string;
  emoji: string;
  durationSec: number;
  mult: number;
}

export const QUEST_LENGTHS: QuestLength[] = [
  { key: "quick", label: "Quick Errand", emoji: "🥾", durationSec: 20, mult: 1 },
  { key: "standard", label: "Proper Quest", emoji: "🗺️", durationSec: 60, mult: 3 },
  { key: "epic", label: "Grand Adventure", emoji: "🐉", durationSec: 180, mult: 10 },
];

export function getQuestLength(key: string): QuestLength {
  return QUEST_LENGTHS.find((q) => q.key === key) ?? QUEST_LENGTHS[0];
}

export interface QuestResult {
  title: string;
  goldReward: number;
  xpReward: number;
  mushroomReward: number;
}

export function rollQuest(rng: Rng, f: Fighter): QuestResult {
  const title = pickRng(rng, QUEST_TITLES);
  const luckBonus = 1 + f.luck / 100;

  const goldReward = Math.round(
    (12 * f.level + Math.floor(rng() * (10 + f.level * 6))) * luckBonus,
  );
  const xpReward = Math.round(
    18 * f.level + Math.floor(rng() * (15 + f.level * 8)),
  );
  // Occasional lucky mushroom drop.
  const mushroomReward = rng() < 0.05 + f.luck / 400 ? 1 : 0;

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
// NPC roster (used to name synthetic arena opponents)
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

// ---------------------------------------------------------------------------
// Equipment + the Magic Shop
// ---------------------------------------------------------------------------

export type ItemSlot = "WEAPON" | "ARMOR" | "AMULET";
export type Rarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

export interface RarityDef {
  id: Rarity;
  label: string;
  mult: number;
  weight: number;
  color: string;
}

export const RARITIES: RarityDef[] = [
  { id: "COMMON", label: "Common", mult: 1.0, weight: 55, color: "#b99b78" },
  { id: "RARE", label: "Rare", mult: 1.7, weight: 30, color: "#4aa3df" },
  { id: "EPIC", label: "Epic", mult: 2.6, weight: 12, color: "#a55eea" },
  { id: "LEGENDARY", label: "Legendary", mult: 4.0, weight: 3, color: "#e8b923" },
];

export function getRarity(id: string): RarityDef {
  return RARITIES.find((r) => r.id === id) ?? RARITIES[0];
}

type StatKey = keyof Attributes;

export interface SlotDef {
  id: ItemSlot;
  label: string;
  emoji: string;
  favors: StatKey[];
  nouns: string[];
}

export const SLOTS: SlotDef[] = [
  {
    id: "WEAPON",
    label: "Weapon",
    emoji: "🗡️",
    favors: ["strength", "dexterity", "intelligence"],
    nouns: ["Sword", "Axe", "Dagger", "War Staff", "Mace", "Bow", "Cudgel"],
  },
  {
    id: "ARMOR",
    label: "Armor",
    emoji: "🛡️",
    favors: ["constitution", "strength"],
    nouns: ["Plate", "Chainmail", "Robe", "Leather Jerkin", "Cuirass"],
  },
  {
    id: "AMULET",
    label: "Amulet",
    emoji: "📿",
    favors: ["luck", "intelligence", "dexterity"],
    nouns: ["Amulet", "Ring", "Charm", "Talisman", "Pendant"],
  },
];

export function getSlot(id: string): SlotDef {
  return SLOTS.find((s) => s.id === id) ?? SLOTS[0];
}

const ADJECTIVES: Record<Rarity, string[]> = {
  COMMON: ["Rusty", "Worn", "Plain", "Chipped", "Humble"],
  RARE: ["Sturdy", "Gleaming", "Fine", "Keen", "Blessed"],
  EPIC: ["Heroic", "Runed", "Vicious", "Radiant", "Ancient"],
  LEGENDARY: ["Godforged", "Dragonbone", "Mythic", "Cataclysmic", "Eternal"],
};

const SUFFIXES: Record<Rarity, string[]> = {
  COMMON: ["", "", "of the Rat"],
  RARE: ["of Vigor", "of the Fox", "of Warding"],
  EPIC: ["of the Titan", "of Storms", "of the Phoenix"],
  LEGENDARY: ["of Annihilation", "of the Ancients", "of Ultimate Doom"],
};

export interface ItemDraft {
  name: string;
  slot: ItemSlot;
  rarity: Rarity;
  strength: number;
  dexterity: number;
  intelligence: number;
  constitution: number;
  luck: number;
  price: number;
}

function rollRarity(rng: Rng): RarityDef {
  const total = RARITIES.reduce((s, r) => s + r.weight, 0);
  let roll = rng() * total;
  for (const r of RARITIES) {
    roll -= r.weight;
    if (roll <= 0) return r;
  }
  return RARITIES[0];
}

/** Roll a single shop item appropriate for the given hero level. */
export function generateItem(rng: Rng, level: number): ItemDraft {
  const slot = pickRng(rng, SLOTS);
  const rarity = rollRarity(rng);

  const bonuses: Attributes = {
    strength: 0,
    dexterity: 0,
    intelligence: 0,
    constitution: 0,
    luck: 0,
  };

  const budget = Math.max(1, Math.round((2 + level * 0.7) * rarity.mult));
  let remaining = budget;

  // The lion's share goes to a favoured stat for the slot.
  const primary = pickRng(rng, slot.favors);
  const primaryAmount = Math.ceil(budget * 0.6);
  bonuses[primary] += primaryAmount;
  remaining -= primaryAmount;

  const allStats: StatKey[] = [
    "strength",
    "dexterity",
    "intelligence",
    "constitution",
    "luck",
  ];
  while (remaining > 0) {
    // 70% chance to reinforce a favoured stat, else spread anywhere.
    const target =
      rng() < 0.7 ? pickRng(rng, slot.favors) : pickRng(rng, allStats);
    bonuses[target] += 1;
    remaining -= 1;
  }

  const suffix = pickRng(rng, SUFFIXES[rarity.id]);
  const name = `${pickRng(rng, ADJECTIVES[rarity.id])} ${pickRng(rng, slot.nouns)}${
    suffix ? " " + suffix : ""
  }`;

  const totalBonus = allStats.reduce((s, k) => s + bonuses[k], 0);
  const price = Math.round((8 + totalBonus * 9) * rarity.mult) + level * 3;

  return { name, slot: slot.id, rarity: rarity.id, ...bonuses, price };
}

export function generateShopStock(rng: Rng, level: number, count = 4): ItemDraft[] {
  return Array.from({ length: count }, () => generateItem(rng, level));
}

/** Sum the attribute bonuses of a hero's currently equipped items. */
export function equippedBonus(
  items: Array<{ location: string } & Attributes>,
): Attributes {
  const b: Attributes = {
    strength: 0,
    dexterity: 0,
    intelligence: 0,
    constitution: 0,
    luck: 0,
  };
  for (const it of items) {
    if (it.location !== "EQUIPPED") continue;
    b.strength += it.strength;
    b.dexterity += it.dexterity;
    b.intelligence += it.intelligence;
    b.constitution += it.constitution;
    b.luck += it.luck;
  }
  return b;
}

/** Base attributes plus equipped-gear bonuses. */
export function effectiveAttributes(
  base: Attributes,
  items: Array<{ location: string } & Attributes>,
): Attributes {
  const bonus = equippedBonus(items);
  return {
    strength: base.strength + bonus.strength,
    dexterity: base.dexterity + bonus.dexterity,
    intelligence: base.intelligence + bonus.intelligence,
    constitution: base.constitution + bonus.constitution,
    luck: base.luck + bonus.luck,
  };
}

// ---------------------------------------------------------------------------
// Dungeons: staged PvE with escalating bosses and loot
// ---------------------------------------------------------------------------

export interface DungeonDef {
  key: string;
  name: string;
  emoji: string;
  floors: number;
  baseLevel: number;
  difficulty: number;
  bossNames: string[];
}

export const DUNGEONS: DungeonDef[] = [
  {
    key: "warren",
    name: "The Goblin Warren",
    emoji: "🕳️",
    floors: 8,
    baseLevel: 1,
    difficulty: 1.0,
    bossNames: [
      "Snaggletooth",
      "Grubby the Biter",
      "Warboss Nix",
      "The Big Goblin",
      "Mudfang",
    ],
  },
  {
    key: "crypt",
    name: "The Whispering Crypt",
    emoji: "⚰️",
    floors: 10,
    baseLevel: 5,
    difficulty: 1.3,
    bossNames: [
      "Bonelord Achmet",
      "The Weeping Wraith",
      "Countess Morlyn",
      "Skeleton King",
      "The Lich's Errand-Boy",
    ],
  },
  {
    key: "keep",
    name: "The Dragon's Keep",
    emoji: "🐲",
    floors: 12,
    baseLevel: 12,
    difficulty: 1.7,
    bossNames: [
      "Embermaw",
      "Sir Cinderbane",
      "The Ashen Knight",
      "Vyrmalax the Greedy",
      "The Molten Warden",
    ],
  },
];

export function getDungeon(key: string): DungeonDef | undefined {
  return DUNGEONS.find((d) => d.key === key);
}

/** Build a dungeon boss for a given floor. The final floor is markedly tougher. */
export function generateBoss(rng: Rng, dungeon: DungeonDef, floor: number): Fighter {
  const level = Math.max(1, dungeon.baseLevel + floor - 1);
  const isFinal = floor >= dungeon.floors;
  const cls = pickRng(rng, CLASSES);
  const bump = isFinal ? 1.25 : 1;
  const stat = (base: number) =>
    Math.round((base + (level - 1) * 3) * dungeon.difficulty * bump);

  return {
    name: (isFinal ? "👑 " : "") + pickRng(rng, dungeon.bossNames),
    class: cls.id,
    level,
    strength: stat(cls.base.strength),
    dexterity: stat(cls.base.dexterity),
    intelligence: stat(cls.base.intelligence),
    constitution: stat(cls.base.constitution),
    luck: stat(cls.base.luck),
  };
}

export interface DungeonReward {
  gold: number;
  xp: number;
  loot: ItemDraft | null;
}

/** Compute the spoils for clearing a floor, including a chance at loot. */
export function dungeonReward(
  rng: Rng,
  dungeon: DungeonDef,
  floor: number,
): DungeonReward {
  const level = Math.max(1, dungeon.baseLevel + floor - 1);
  const isFinal = floor >= dungeon.floors;

  const gold = Math.round((15 * level + floor * 8) * dungeon.difficulty);
  const xp = Math.round(25 * level + floor * 12);

  // Loot chance climbs with depth; the final boss always drops something good.
  const dropChance = 0.3 + (floor / dungeon.floors) * 0.25;
  let loot: ItemDraft | null = null;
  if (isFinal || rng() < dropChance) {
    loot = generateItem(rng, level);
    if (isFinal) {
      // Keep the better of two rolls for the final boss.
      const alt = generateItem(rng, level);
      if (alt.price > loot.price) loot = alt;
    }
  }

  return { gold, xp, loot };
}

// ---------------------------------------------------------------------------
// Opponent generation (used when there is no other real player to fight yet)
// ---------------------------------------------------------------------------

/** Build a synthetic opponent roughly matched to the given level. */
export function randomOpponent(rng: Rng, level: number): Fighter {
  const cls = pickRng(rng, CLASSES);
  const jitter = () => Math.floor(rng() * 5) - 2; // -2..+2
  const scale = level + jitter();
  const lvl = Math.max(1, scale);
  const name = pickRng(rng, NPC_NAMES);

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
