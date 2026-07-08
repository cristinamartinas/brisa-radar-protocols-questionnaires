/**
 * Bestiary / Codex — a collectable monster compendium that fills in as a hero
 * fights. Pure meta/collection: this module is strictly READ-ONLY (no writes,
 * no new tables) and derives everything from existing BattleLog rows.
 *
 * The foe catalog below is hand-authored. Dungeon bosses are pulled straight
 * from DUNGEONS.bossNames (see game.ts) so the codex can never disagree with
 * the fights the game actually rolls; arena regulars and a couple of tower /
 * world-boss celebrities round it out for flavour.
 *
 * Discovery is decided by substring-matching a catalog entry's `name` against
 * the hero's stored `opponentName`s — dungeon/tower fights bury the boss name
 * inside a decorated label ("🕳️ Snaggletooth — The Goblin Warren floor 3"),
 * arena fights store the opponent's name verbatim, so `includes` catches both.
 */

import { prisma } from "@/lib/db";
import { DUNGEONS } from "@/lib/game";

export interface BestiaryEntry {
  key: string;
  /** Substring hunted for inside stored opponent names. */
  name: string;
  emoji: string;
  category: string;
  lore: string;
}

export interface BestiaryFoe extends BestiaryEntry {
  discovered: boolean;
  /** Won fights whose opponent matched this entry. */
  kills: number;
}

export interface BestiaryResult {
  foes: BestiaryFoe[];
  discovered: number;
  total: number;
  /** discovered / total, as a whole-number percentage. */
  completion: number;
}

// --- Dungeon bosses: flavour keyed by the exact name in DUNGEONS.bossNames ---

const DUNGEON_FLAVOUR: Record<string, { emoji: string; lore: string }> = {
  // The Goblin Warren
  Snaggletooth: {
    emoji: "🦷",
    lore: "A goblin with precisely one impressive tooth and a wildly inflated sense of its own importance.",
  },
  "Grubby the Biter": {
    emoji: "🫦",
    lore: "Bites. That is the entire gimmick. Alarmingly, admirably committed to the bit.",
  },
  "Warboss Nix": {
    emoji: "🪖",
    lore: "Commands a fearsome warband of six goblins, two of whom are cardboard cut-outs of goblins.",
  },
  "The Big Goblin": {
    emoji: "🟢",
    lore: "Objectively a normal-sized goblin standing on another goblin's shoulders. Field notes confirm it. We measured twice.",
  },
  Mudfang: {
    emoji: "🐗",
    lore: "Reeks of the warren's very finest puddle. Fights dirty — and also literally covered in dirt.",
  },
  // The Whispering Crypt
  "Bonelord Achmet": {
    emoji: "☠️",
    lore: "Rules the crypt with an iron fist, an iron femur, and an iron everything-else. No soft tissue survived the promotion.",
  },
  "The Weeping Wraith": {
    emoji: "😭",
    lore: "Sobs uncontrollably for the duration of combat. Deeply distracting; leaves the flagstones mildly damp.",
  },
  "Countess Morlyn": {
    emoji: "🧛",
    lore: "Undead aristocrat who will not, under any circumstances, stop describing her ancestral portrait collection.",
  },
  "Skeleton King": {
    emoji: "💀",
    lore: "A skeleton wearing a crown — which is, frankly, the absolute bare minimum of qualification for the role.",
  },
  "The Lich's Errand-Boy": {
    emoji: "📜",
    lore: "Not a lich. Merely runs the lich's errands, and takes your victory over him extremely personally.",
  },
  // The Dragon's Keep
  Embermaw: {
    emoji: "🔥",
    lore: "A dragon whose devastating fire-breath is, on close inspection, just spectacularly aggressive heartburn.",
  },
  "Sir Cinderbane": {
    emoji: "⚔️",
    lore: "A knight of such volcanic temper that his own plate armour is permanently cooked to a fetching medium-rare.",
  },
  "The Ashen Knight": {
    emoji: "⚱️",
    lore: "Died once. Took it extremely badly. Came back grey, gritty, and in a foul mood about the whole affair.",
  },
  "Vyrmalax the Greedy": {
    emoji: "💰",
    lore: "Hoards gold, gems, and other people's unpaid invoices. Will not part with a single coin, alive or slain.",
  },
  "The Molten Warden": {
    emoji: "🌋",
    lore: "Stands eternal guard over the keep's furnace and regards the phrase 'room temperature' as a personal insult.",
  },
};

const dungeonEntries: BestiaryEntry[] = DUNGEONS.flatMap((d) =>
  d.bossNames.map((name) => {
    const f = DUNGEON_FLAVOUR[name] ?? {
      emoji: d.emoji,
      lore: "Field notes on this specimen are smudged beyond all legibility. Mostly stains.",
    };
    return {
      key: `${d.key}-${slug(name)}`,
      name,
      emoji: f.emoji,
      category: d.name,
      lore: f.lore,
    };
  }),
);

// --- Arena regulars, plus a couple of tower / world-boss celebrities ---

const OTHER_ENTRIES: BestiaryEntry[] = [
  {
    key: "arena-brenda",
    name: "Brenda from Accounting",
    emoji: "🧾",
    category: "Arena Regulars",
    lore: "Reconciles ledgers by day and reconciles skulls by night. Her spreadsheets, like her footwork, are immaculate.",
  },
  {
    key: "arena-kevin",
    name: "The Dread Pirate Kevin",
    emoji: "🏴‍☠️",
    category: "Arena Regulars",
    lore: "A fearsome title inherited down a long, unbroken line of Kevins. Impeccable sea legs; conspicuously no boat.",
  },
  {
    key: "arena-gary",
    name: "Gary, Destroyer of Worlds",
    emoji: "🌍",
    category: "Arena Regulars",
    lore: "Has to date destroyed zero (0) worlds, but remains genuinely optimistic about the quarter ahead.",
  },
  {
    key: "arena-badger",
    name: "A Very Large Badger",
    emoji: "🦡",
    category: "Arena Regulars",
    lore: "It is a badger. It is very large. There is no further lore to record — and somehow, no lore but this.",
  },
  {
    key: "arena-reginald",
    name: "Sir Reginald the Rusty",
    emoji: "⚙️",
    category: "Arena Regulars",
    lore: "A knight so seldom washed that he trips metal detectors and, on humid days, tetanus warnings.",
  },
  {
    key: "tower-floor-warden",
    name: "the Floor Warden",
    emoji: "🗼",
    category: "The Endless Tower",
    lore: "Guards a single landing of the Tower with the grim zeal of a man who has been overlooked for promotion for centuries.",
  },
  {
    key: "world-bureaucrax",
    name: "Bureaucrax",
    emoji: "📋",
    category: "World Bosses",
    lore: "A colossus woven entirely from red tape. Slaying it requires the whole realm and three notarised copies of form 27-B.",
  },
];

const CATALOG: BestiaryEntry[] = [...dungeonEntries, ...OTHER_ENTRIES];

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Annotate the foe catalog against a single hero's combat history. Reads that
 * hero's BattleLog rows once and matches everything in memory.
 */
export async function loadBestiary(characterId: string): Promise<BestiaryResult> {
  const logs = await prisma.battleLog.findMany({
    where: { characterId },
    select: { opponentName: true, won: true },
  });

  const foes: BestiaryFoe[] = CATALOG.map((entry) => {
    let seen = false;
    let kills = 0;
    for (const log of logs) {
      if (!log.opponentName.includes(entry.name)) continue;
      seen = true;
      if (log.won) kills += 1;
    }
    return { ...entry, discovered: seen, kills };
  });

  const discovered = foes.filter((f) => f.discovered).length;
  const total = foes.length;
  const completion = total === 0 ? 0 : Math.round((discovered / total) * 100);

  return { foes, discovered, total, completion };
}
