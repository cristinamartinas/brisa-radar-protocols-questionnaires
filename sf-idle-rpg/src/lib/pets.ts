/**
 * Pets & Companions — adopt collectable critters, send them foraging on a
 * cooldown for gold, and watch them level up.
 *
 * The species catalog and all the maths (xp curves, cooldowns, reward rolls)
 * are pure, exported helpers so the UI can preview them and unit tests can pin
 * them down. The two server actions (`adoptPet`, `foragePet`) are the only
 * things that touch the database, and they follow the same discipline as the
 * rest of the game: currency moves through the ledger, rolls flow through the
 * seeded `Rng` (never Math.random), and every cooldown/ready-check is decided
 * from server time — the browser never gets a vote.
 *
 * NOTE: this module deliberately has NO file-level "use server" directive — it
 * exports the catalog and pure helpers too. The server actions each carry their
 * own inline directive.
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { loadCharacter } from "@/lib/data";
import { currencyLedgerOps } from "@/lib/ledger";
import { makeRng, randomSeed, pick, randInt, type Rng } from "@/lib/rng";
import type { ActionResult } from "@/lib/actions";

// ---------------------------------------------------------------------------
// Species catalog
// ---------------------------------------------------------------------------

export interface PetSpecies {
  key: string;
  name: string;
  emoji: string;
  /** Dry one-liner shown in the adopt shelf. */
  description: string;
  /** One-off adoption fee, in gold. */
  adoptCost: number;
  /** Base gold hauled home per forage, per pet level. */
  yieldPerLevel: number;
  /** Flavour lines rolled when this critter comes back from a forage. */
  forageFlavour: readonly string[];
}

export const PET_SPECIES: readonly PetSpecies[] = [
  {
    key: "battle_chicken",
    name: "Battle Chicken",
    emoji: "🐔",
    description: "Surprisingly fierce; forages for loose change and grudges.",
    adoptCost: 120,
    yieldPerLevel: 6,
    forageFlavour: [
      "pecked a bandit until he simply gave up his coin purse",
      "returned with lint, a button, and — improbably — gold",
      "intimidated a merchant using only eye contact",
    ],
  },
  {
    key: "warp_snail",
    name: "Warp Snail",
    emoji: "🐌",
    description: "Moves at the speed of plot; eventually returns with treasure.",
    adoptCost: 80,
    yieldPerLevel: 5,
    forageFlavour: [
      "arrived three business days later, glistening and rich",
      "left a shimmering trail that people paid to see",
      "was very slow but weirdly thorough about it",
    ],
  },
  {
    key: "trash_panda",
    name: "Trash Panda",
    emoji: "🦝",
    description: "A raccoon with a business degree; audits bins for valuables.",
    adoptCost: 210,
    yieldPerLevel: 8,
    forageFlavour: [
      "unionised the local strays and skimmed the proceeds",
      "found a monocle, wore it, then sold it back to you",
      "reconciled the town's rubbish into pure profit",
    ],
  },
  {
    key: "tax_toad",
    name: "Tax Toad",
    emoji: "🐸",
    description: "Collects tolls from smaller amphibians; deeply unlicensed.",
    adoptCost: 180,
    yieldPerLevel: 7,
    forageFlavour: [
      "levied a fee on every lily pad in the district",
      "audited a heron and, astonishingly, won",
      "croaked something about 'fiscal quarters' and left with gold",
    ],
  },
  {
    key: "judgemental_owl",
    name: "Judgemental Owl",
    emoji: "🦉",
    description: "Hoots disapprovingly, then hoards shiny things out of spite.",
    adoptCost: 300,
    yieldPerLevel: 10,
    forageFlavour: [
      "silently judged three villagers into dropping their purses",
      "hoarded a small fortune purely to feel superior",
      "asked 'who?' until someone paid it to stop",
    ],
  },
  {
    key: "union_beaver",
    name: "Union Beaver",
    emoji: "🦫",
    description: "Builds, complains, invoices; brings back timber and gold.",
    adoptCost: 260,
    yieldPerLevel: 9,
    forageFlavour: [
      "dammed a stream, charged tolls, then filed for overtime",
      "invoiced the forest for 'structural improvements'",
      "gnawed through a bandit's cudgel and billed him for it",
    ],
  },
];

/** Look up a species definition by key (undefined if unknown). */
export function getSpecies(key: string): PetSpecies | undefined {
  return PET_SPECIES.find((s) => s.key === key);
}

// ---------------------------------------------------------------------------
// Pure maths: xp curve, cooldown, reward rolls
// ---------------------------------------------------------------------------

/** How long a pet must rest between forages (30 minutes), in milliseconds. */
export const forageCooldownMs = 30 * 60 * 1000;

/**
 * XP required to advance FROM `level` to `level + 1`. A gentle quadratic so
 * early levels come quick and later ones ask for a few more forages.
 */
export function xpForPetLevel(level: number): number {
  const l = Math.max(1, level);
  return Math.round(30 + l * 20 + l * l * 4);
}

export interface ForageReward {
  gold: number;
  xp: number;
  flavour: string;
}

/**
 * Roll a forage haul. Pure in `(species, level, rng)` so it is reproducible
 * from a stored seed and previewable by the UI. Gold scales with the species'
 * base yield and the pet's level, with a modest ±25% seeded wobble.
 */
export function forageReward(
  species: string,
  level: number,
  rng: Rng,
): ForageReward {
  const def = getSpecies(species) ?? PET_SPECIES[0];
  const base = def.yieldPerLevel * Math.max(1, level);
  const wobble = 0.75 + rng() * 0.5; // 0.75 .. 1.25
  const gold = Math.max(1, Math.round(base * wobble));
  const xp = randInt(rng, 8, 16);
  const flavour = pick(rng, def.forageFlavour);
  return { gold, xp, flavour };
}

/**
 * Apply forage XP to a pet, rolling level-ups while the threshold is crossed.
 * Pure helper shared by the action and unit tests.
 */
export function applyPetXp(
  level: number,
  xp: number,
  gainedXp: number,
): { level: number; xp: number; levelsGained: number } {
  let lvl = level;
  let cur = xp + gainedXp;
  let gained = 0;
  while (cur >= xpForPetLevel(lvl)) {
    cur -= xpForPetLevel(lvl);
    lvl += 1;
    gained += 1;
  }
  return { level: lvl, xp: cur, levelsGained: gained };
}

// ---------------------------------------------------------------------------
// Read model for the UI
// ---------------------------------------------------------------------------

export interface OwnedPet {
  id: string;
  species: PetSpecies;
  name: string;
  level: number;
  xp: number;
  xpNeeded: number;
  xpPct: number;
  canForage: boolean;
  cooldownRemainingMs: number;
  cooldownRemainingSec: number;
}

export interface AdoptableSpecies {
  species: PetSpecies;
  affordable: boolean;
}

export interface PetsView {
  gold: number;
  owned: OwnedPet[];
  adoptable: AdoptableSpecies[];
}

/**
 * Load a hero's menagerie for display: owned pets annotated with their
 * cooldown/ready state (computed from server time), plus the adopt shelf with
 * per-species affordability. Safe to call from a render — writes nothing.
 */
export async function loadPets(characterId: string): Promise<PetsView> {
  const [character, pets] = await Promise.all([
    prisma.character.findUnique({
      where: { id: characterId },
      select: { gold: true },
    }),
    prisma.pet.findMany({
      where: { characterId },
      orderBy: { adoptedAt: "asc" },
    }),
  ]);

  const gold = character?.gold ?? 0;
  const now = Date.now();

  const owned: OwnedPet[] = pets.map((p) => {
    const species = getSpecies(p.species) ?? PET_SPECIES[0];
    const readyAt = p.lastForaged
      ? p.lastForaged.getTime() + forageCooldownMs
      : 0;
    const remaining = Math.max(0, readyAt - now);
    const xpNeeded = xpForPetLevel(p.level);
    return {
      id: p.id,
      species,
      name: p.name,
      level: p.level,
      xp: p.xp,
      xpNeeded,
      xpPct: Math.min(100, Math.round((p.xp / xpNeeded) * 100)),
      canForage: remaining <= 0,
      cooldownRemainingMs: remaining,
      cooldownRemainingSec: Math.ceil(remaining / 1000),
    };
  });

  const adoptable: AdoptableSpecies[] = PET_SPECIES.map((species) => ({
    species,
    affordable: gold >= species.adoptCost,
  }));

  return { gold, owned, adoptable };
}

// ---------------------------------------------------------------------------
// Server actions
// ---------------------------------------------------------------------------

/**
 * Adopt a critter of the given species. Charges the one-off adoption fee
 * through the ledger and creates the Pet — all in one transaction so the
 * cached gold balance and the ledger can never drift.
 */
export async function adoptPet(
  species: string,
  name?: string,
): Promise<ActionResult> {
  "use server";

  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const def = getSpecies(species);
  if (!def) return { ok: false, message: "No such critter at the shelter." };

  if (character.gold < def.adoptCost) {
    return {
      ok: false,
      message: `${def.emoji} ${def.name} costs ${def.adoptCost}🪙 to adopt — you're a little short.`,
    };
  }

  const petName = (name ?? "").trim().slice(0, 24) || def.name;

  await prisma.$transaction([
    prisma.character.update({
      where: { id: character.id },
      data: {
        gold: character.gold - def.adoptCost,
        pets: {
          create: {
            species: def.key,
            name: petName,
          },
        },
      },
    }),
    ...currencyLedgerOps(
      character.id,
      { gold: character.gold, mushrooms: character.mushrooms },
      { gold: -def.adoptCost },
      "PET_ADOPT",
    ),
  ]);

  revalidatePath("/");

  return {
    ok: true,
    message: `${def.emoji} You adopted ${petName}! They headbutt your shin affectionately. (−${def.adoptCost}🪙)`,
  };
}

/**
 * Send an owned pet foraging. Enforces ownership + the cooldown against server
 * time, banks a seeded gold haul through the ledger, feeds the pet its forage
 * XP (levelling it up when the curve is crossed), and stamps `lastForaged`.
 */
export async function foragePet(petId: string): Promise<ActionResult> {
  "use server";

  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const pet = await prisma.pet.findFirst({
    where: { id: petId, characterId: character.id },
  });
  if (!pet) return { ok: false, message: "That critter isn't yours." };

  const def = getSpecies(pet.species) ?? PET_SPECIES[0];

  // Server-authoritative cooldown check — no foraging early.
  const now = Date.now();
  if (pet.lastForaged) {
    const readyAt = pet.lastForaged.getTime() + forageCooldownMs;
    if (now < readyAt) {
      const mins = Math.ceil((readyAt - now) / 60000);
      return {
        ok: false,
        message: `${def.emoji} ${pet.name} is napping — ready to forage in ~${mins} min.`,
      };
    }
  }

  const seed = randomSeed();
  const reward = forageReward(pet.species, pet.level, makeRng(seed));
  const grown = applyPetXp(pet.level, pet.xp, reward.xp);

  await prisma.$transaction([
    prisma.character.update({
      where: { id: character.id },
      data: { gold: character.gold + reward.gold },
    }),
    prisma.pet.update({
      where: { id: pet.id },
      data: {
        level: grown.level,
        xp: grown.xp,
        lastForaged: new Date(now),
      },
    }),
    ...currencyLedgerOps(
      character.id,
      { gold: character.gold, mushrooms: character.mushrooms },
      { gold: reward.gold },
      "PET_FORAGE",
    ),
  ]);

  revalidatePath("/");

  let message = `${def.emoji} ${pet.name} ${reward.flavour} — +${reward.gold}🪙, +${reward.xp} XP`;
  if (grown.levelsGained > 0) {
    message += ` — LEVEL UP! ${pet.name} is now level ${grown.level}. ✨`;
  }
  return { ok: true, message };
}
