/**
 * The Lore Codex — a collectable book of world-building and satirical history
 * that fills in as a hero makes their way through the realm.
 *
 * Pure content + meta: this module is strictly READ-ONLY (no writes, no new
 * tables). Every unlock is DERIVED from existing hero data — level, arena
 * record, quest history, dungeon depth, guild membership, tower climb — so the
 * Codex can never claim credit for something the hero hasn't actually done.
 *
 * The world's voice lives here. The premise: the Dark Lord already lost. The
 * age of Chosen Ones is over. What remains is a realm in its comedic,
 * post-heroic aftermath, and you — a freelancer picking up the odd jobs that
 * saving the world left lying around.
 *
 * Dungeon names come straight from DUNGEONS (see game.ts) so the lore can never
 * disagree with the places the game actually sends you.
 */

import { prisma } from "@/lib/db";
import { DUNGEONS, getDungeon } from "@/lib/game";

// ---------------------------------------------------------------------------
// The context every unlock predicate reads
// ---------------------------------------------------------------------------

export interface LoreContext {
  level: number;
  arenaWins: number;
  /** Rows in QuestLog — how many quests have paid out. */
  questsCompleted: number;
  hasGuild: boolean;
  /** Best floor ever cleared in the Infinite Tower (0 if never climbed). */
  towerHighestFloor: number;
  /** Floors cleared per dungeon, keyed by dungeon key (floor - 1, min 0). */
  floorsClearedByDungeon: Record<string, number>;
  /** Dungeons the hero has fully conquered (clearedAt stamped). */
  dungeonsFullyCleared: number;
}

/** Floors the hero has cleared in one specific dungeon. */
function floorsIn(ctx: LoreContext, key: string): number {
  return ctx.floorsClearedByDungeon[key] ?? 0;
}

// Convenience references so bodies + hints stay in sync with game.ts.
const WARREN = getDungeon("warren")?.name ?? "The Goblin Warren";
const CRYPT = getDungeon("crypt")?.name ?? "The Whispering Crypt";
const KEEP = getDungeon("keep")?.name ?? "The Dragon's Keep";

// ---------------------------------------------------------------------------
// Entry + chapter shape
// ---------------------------------------------------------------------------

export interface LoreEntry {
  key: string;
  title: string;
  /** True once the hero has done enough to earn this page. */
  unlock: (ctx: LoreContext) => boolean;
  /** Shown while the page is still sealed — a nudge, never a spoiler. */
  hint: string;
  /** The lore itself. 60–120 words in the house voice. */
  body: string;
}

export interface LoreChapter {
  key: string;
  name: string;
  /** One-line chapter dedication, illuminated-manuscript style. */
  blurb: string;
  entries: LoreEntry[];
}

// ---------------------------------------------------------------------------
// The Codex. ~16 pages across five chapters.
// ---------------------------------------------------------------------------

export const LORE_CHAPTERS: LoreChapter[] = [
  {
    key: "realm",
    name: "The Realm",
    blurb: "What the world looks like once the world has already been saved.",
    entries: [
      {
        key: "realm-dawn",
        title: "The Morning After the Apocalypse",
        unlock: () => true,
        hint: "Simply arrive. You already have.",
        body: "They swore the Dark Lord would reign a thousand years. He managed eleven, then lost — not to a Chosen One, exactly, but to a coalition of ordinary people who had quietly, collectively, had enough. The dread banners came down. The prophecies were recycled into kindling. And the realm woke to learn that saved and sorted out are two very different words. There is still work here: rats in cellars, geese with opinions, cabbages that refuse to deliver themselves. It is not glorious. But it is honest, and it is yours. Welcome, freelancer, to the long unheroic dawn.",
      },
      {
        key: "realm-darklord",
        title: "Whatever Happened to the Dark Lord",
        unlock: (c) => c.level >= 3,
        hint: "Reach level 3 — old rumours travel slowly.",
        body: "He was not slain. Slaying required a hero, and by the end nobody could be bothered to become one. So he signed a settlement, surrendered the Obsidian Throne, and — last anyone heard — opened a modest cheese shop three towns over. Reviews are mixed. The cheddar is described, generously, as aggressively fine, and a faint dread aura still clings to the brie. Old soldiers lower their voices at his name, more from habit than terror. He waves at them across the market square. It is awkward for everyone. The lesson, such as it is: even ultimate evil eventually needs a day job.",
      },
      {
        key: "realm-freelance",
        title: "The Freelancer's Charter",
        unlock: (c) => c.questsCompleted >= 3,
        hint: "Complete 3 quests to be issued your charter.",
        body: "With no empire left to threaten it, the realm no longer employs heroes. It engages contractors. You are one: unsalaried, unpensioned, gloriously self-directed. The Charter guarantees you the right to accept any errand posted at any tavern, to keep whatever you can carry, and to invoice no one for the emotional toll of escorting a talkative goat. There are no benefits. There is no manager. There is only the road, the odd job, and the deep and slightly baffling satisfaction of a rolling pin returned to a grateful baker. Nobody writes ballads about this. That is rather the point.",
      },
      {
        key: "realm-guilds",
        title: "On Guilds and Their Newsletters",
        unlock: (c) => c.hasGuild,
        hint: "Join or found a guild to read the fine print.",
        body: "Guilds once marshalled armies against the Dark. Peacetime has been unkind to their sense of scale. Today a guild is chiefly a shared roster, a modest cut of everyone's quest gold, and a monthly newsletter nobody admits to reading. The war-councils have become potlucks. The oaths of blood have become a rota for who brings the good mead. And yet — when your errand goes sideways and a stranger with the same tag appears at your shoulder, unasked, you understand at last why anyone joined. It was never the armies. It was the not-being-alone in a world that no longer needs saving.",
      },
    ],
  },
  {
    key: "classes",
    name: "The Classes",
    blurb: "Three vocations, and the peacetime that came for them all.",
    entries: [
      {
        key: "classes-three",
        title: "The Three Remaining Vocations",
        unlock: (c) => c.level >= 2,
        hint: "Reach level 2 to learn your trade's history.",
        body: "The old academies taught forty disciplines. Forty. Post-heroic economics whittled that to three that still pay. The Warrior, who hits things until they stop moving and is refreshingly honest about it. The Mage, an enormous quantity of damage wrapped in an alarmingly small amount of survivability. And the Scout, fast and lucky, who arrives first, leaves first, and pockets something on the way out. The Necromancers unionised and went into composting. The Bards, mercifully, went quiet. Whatever you chose, choose it fully — a realm this ordinary has precious little patience for a dabbler.",
      },
      {
        key: "classes-arena",
        title: "The Arena, Now With Waivers",
        unlock: (c) => c.arenaWins >= 1,
        hint: "Win a single arena bout to be handed the paperwork.",
        body: "The Arena used to be to the death. Then an actuary got involved, and now it is to the mild inconvenience. Combatants sign a waiver, agree to a healer on standby, and duel until one of them concedes with dignity or falls over without it. Nobody truly dies here anymore; they merely lose gold and a portion of their afternoon's composure. Purists grumble that it has gone soft. The purists, notably, are all still alive to grumble. Your first win goes in the ledger regardless — a small, refereed, fully-insured slice of glory. Enjoy it. The paperwork was extensive.",
      },
      {
        key: "classes-tower",
        title: "The Tower That Refused to End",
        unlock: (c) => c.towerHighestFloor >= 1,
        hint: "Clear a single floor of the Infinite Tower.",
        body: "No one commissioned the Tower. No one recalls it being built. It was simply there one morning, one floor taller than the surveyors remembered, and it has been quietly adding floors ever since — patient, endless, faintly smug. Each landing holds a Warden who has waited centuries for someone, anyone, to climb high enough to notice them. They are lonely more than they are cruel. You will never reach the top; there is no top; that was never the arrangement. You climb because the climbing means something, even when the destination has, politely and permanently, declined to exist.",
      },
    ],
  },
  {
    key: "dungeons",
    name: "The Dungeons",
    blurb: "Places that never got the memo that the war was over.",
    entries: [
      {
        key: "dungeon-warren",
        title: `Field Report: ${WARREN}`,
        unlock: (c) => floorsIn(c, "warren") >= 1,
        hint: `Clear a floor of ${WARREN}.`,
        body: `${WARREN} is less a lair than a very committed neighbourhood association. Its goblins never received word that the Dark Lord lost, and would frankly rather not — the losing side had excellent dental and a generous banner allowance. So they carry on, ambushing travellers with the earnest amateurism of people who read the villainy manual once and lost their place. The traps are optimistic. The signage is misspelled. Somewhere below, a self-appointed warboss commands a garrison that is, on inspection, mostly enthusiasm. It is genuinely dangerous, in the way an over-serious pub quiz is genuinely dangerous. Descend carefully, and try not to laugh.`,
      },
      {
        key: "dungeon-crypt",
        title: `Field Report: ${CRYPT}`,
        unlock: (c) => floorsIn(c, "crypt") >= 1,
        hint: `Descend one floor into ${CRYPT}.`,
        body: `The trouble with ${CRYPT} is that the dead here are not resting so much as sulking. They were promised eternal dread service to a Dark Lord who has since gone into artisanal cheese, and no one has had the heart, or the standing, to tell them the arrangement lapsed. So they moan. They rattle. A countess recites her ancestral portrait collection to anyone whose ribcage wanders past. It is grief, mostly, wearing a skeleton's coat. Bring a good weapon and a little patience: you are not merely fighting the crypt's residents, you are, in a very real sense, delivering some extremely overdue news.`,
      },
      {
        key: "dungeon-keep",
        title: `Field Report: ${KEEP}`,
        unlock: (c) => floorsIn(c, "keep") >= 1,
        hint: `Set foot on a floor of ${KEEP}.`,
        body: `${KEEP} is the realm's last true holdout of the old grandeur, and it is exhausting for everyone involved. The dragons here still hoard, still smoulder, still deliver monologues rich in the word doom — but the audience has thinned to nothing, and it shows. Embermaw's legendary fire-breath is, up close, spectacular heartburn. Its guardians polish their menace daily and have no one left to menace. There is something almost tender in it: a keep full of magnificent creatures performing an apocalypse that already came and went. Slaying them is a mercy, a robbery, and a retirement notice, delivered simultaneously and at considerable personal risk.`,
      },
    ],
  },
  {
    key: "bestiary",
    name: "Bestiary Notes",
    blurb: "Marginalia from a naturalist with poor survival instincts.",
    entries: [
      {
        key: "bestiary-goblins",
        title: "On Goblins, and Their Feelings",
        unlock: (c) => floorsIn(c, "warren") >= 1,
        hint: `Meet the locals — clear a floor of ${WARREN}.`,
        body: "Contrary to the old bestiaries, the goblin is not evil. The goblin is aspirational. It has seen power, admired its aesthetic, and reconstructed it from memory using mud, spite, and whatever the last adventurer dropped. A goblin will defend a cardboard warband to the death because to it the cardboard is real, the same way a title on a door is real. Field observation confirms they mourn their fallen, name their rats, and hold grudges with a tenderness that would shame most kings. Do not underestimate them. Do not, whatever the manual advises, pity them out loud. They can hear you.",
      },
      {
        key: "bestiary-undead",
        title: "On the Undead, and Poor Endings",
        unlock: (c) => floorsIn(c, "crypt") >= 1,
        hint: `Study a specimen — descend into ${CRYPT}.`,
        body: "The undead are, taxonomically, a filing error. Each is a person who reached the end of their story, disliked the ending, and lodged a complaint that has been pending ever since. Wraiths weep because grief is the only paperwork they still know how to submit. Skeletons soldier on out of sheer procedural inertia — a crown was placed on a skull, and so, technically, there is a king. They are less monsters than unresolved business. The compassionate adventurer remembers this while removing their heads: you are not committing violence so much as, at long last, closing the ticket.",
      },
      {
        key: "bestiary-dragons",
        title: "On Dragons, and Their Debts",
        unlock: (c) => floorsIn(c, "keep") >= 1 || c.level >= 12,
        hint: `Reach level 12, or brave a floor of ${KEEP}.`,
        body: "A dragon is a creature built entirely for an age that has ended. It hoards against a scarcity nobody remembers, guards against a siege nobody is mounting, and rehearses terror for a public that has moved on to worrying about grain prices. Vyrmalax the Greedy famously hoards not gold alone but other people's unpaid invoices, which may be the single most accurate portrait of the species ever recorded. Beneath the scales and the smoke is something achingly out of time — magnificent, obsolete, and furious about both. Approach with respect. Leave with the treasure. It genuinely will not be needing it.",
      },
    ],
  },
  {
    key: "economy",
    name: "The Economy of Adventuring",
    blurb: "Where the gold comes from, and where it insists on going.",
    entries: [
      {
        key: "economy-gold",
        title: "A Brief History of the Coin",
        unlock: (c) => c.questsCompleted >= 1 || c.level >= 1,
        hint: "Finish a single quest and get paid.",
        body: "In the war years, gold meant swords, walls, and the desperate purchase of one more day. In peacetime it means, mostly, boots. The realm runs now on the small economy of errands: a coin for the rats, three for the cabbages, a fat purse for anything with the word cursed in the posting. It is not a fortune. It was never going to be. But there is a clean and underrated pleasure in a fair day's pay for a fair day's absurdity — in watching a modest pile of coins grow, one recovered rolling pin at a time, into something that looks almost like a future.",
      },
      {
        key: "economy-mushrooms",
        title: "The Curious Case of the Mushroom",
        unlock: (c) => c.level >= 5,
        hint: "Reach level 5 — the shrooms find you.",
        body: "No one can quite explain the mushroom. It grows nowhere, drops from everything, and is accepted as currency by merchants who will not, under any circumstances, accept your perfectly good gold. Scholars suspect it is a leftover of the Dark Lord's economy — he paid his legions in the things, apparently, and the habit outlived the empire. It buys what coin cannot: the rare, the premium, the frankly unnecessary. Hoard them. Spend them wisely, or at least memorably. And do not, the alchemist begs, attempt to eat one. That is not, and has never been, what they are for.",
      },
      {
        key: "economy-mastery",
        title: "The Great Loot Glut",
        unlock: (c) => c.dungeonsFullyCleared >= 1,
        hint: "Fully conquer a dungeon, top floor and all.",
        body: "Here is the open secret of the post-heroic age: with the Dark Lord gone, the realm is absolutely drowning in loot nobody is guarding anymore. Every conquered dungeon coughs up another hoard of godforged, dragonbone, cataclysmically-named gear that was forged for a final battle that got cancelled. You clear a keep and inherit an armoury built for the apocalypse. It is, economists agree, a catastrophe for the price of swords and a triumph for you personally. Wear the legendary blade to fetch a baker's rolling pin. Nobody will stop you. Overqualification, in this age, is simply what victory left lying around.",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Annotated views returned to the UI
// ---------------------------------------------------------------------------

export interface LoreEntryView {
  key: string;
  title: string;
  unlocked: boolean;
  /** Present only once unlocked — the lore itself. */
  body?: string;
  /** Present only while locked — how to earn the page. */
  hint?: string;
}

export interface LoreChapterView {
  key: string;
  name: string;
  blurb: string;
  entries: LoreEntryView[];
  unlocked: number;
  total: number;
}

export interface LoreResult {
  chapters: LoreChapterView[];
  unlocked: number;
  total: number;
}

/**
 * Assemble the unlock context for one hero from existing data, then annotate
 * the whole Codex against it. Strictly read-only.
 */
export async function loadLore(characterId: string): Promise<LoreResult> {
  const [character, questsCompleted, dungeons, tower] = await Promise.all([
    prisma.character.findUnique({
      where: { id: characterId },
      select: { level: true, arenaWins: true, guildId: true },
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
  ]);

  // `floor` is the *next* floor to attempt, so floors cleared = floor - 1.
  const floorsClearedByDungeon: Record<string, number> = {};
  for (const d of DUNGEONS) floorsClearedByDungeon[d.key] = 0;
  let dungeonsFullyCleared = 0;
  for (const d of dungeons) {
    floorsClearedByDungeon[d.dungeonKey] = Math.max(0, d.floor - 1);
    if (d.clearedAt) dungeonsFullyCleared += 1;
  }

  const ctx: LoreContext = {
    level: character?.level ?? 1,
    arenaWins: character?.arenaWins ?? 0,
    questsCompleted,
    hasGuild: !!character?.guildId,
    towerHighestFloor: tower?.highestFloor ?? 0,
    floorsClearedByDungeon,
    dungeonsFullyCleared,
  };

  let unlocked = 0;
  let total = 0;

  const chapters: LoreChapterView[] = LORE_CHAPTERS.map((chapter) => {
    let chapterUnlocked = 0;

    const entries: LoreEntryView[] = chapter.entries.map((entry) => {
      const isUnlocked = entry.unlock(ctx);
      total += 1;
      if (isUnlocked) {
        unlocked += 1;
        chapterUnlocked += 1;
      }
      return isUnlocked
        ? { key: entry.key, title: entry.title, unlocked: true, body: entry.body }
        : { key: entry.key, title: entry.title, unlocked: false, hint: entry.hint };
    });

    return {
      key: chapter.key,
      name: chapter.name,
      blurb: chapter.blurb,
      entries,
      unlocked: chapterUnlocked,
      total: chapter.entries.length,
    };
  });

  return { chapters, unlocked, total };
}
