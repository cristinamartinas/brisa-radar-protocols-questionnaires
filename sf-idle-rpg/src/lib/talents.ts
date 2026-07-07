/**
 * The Talent Tree — spend the talent points you accrue with every level on
 * nodes that grant flat, permanent attribute bonuses. Purely additive on top
 * of base stats and equipped gear.
 *
 * The tree itself is defined here in code (the DB only stores which node is at
 * which rank), so balance changes are a code review, not a migration. All the
 * validation — points available, ranks, prerequisites — happens server-side;
 * the client can ask nicely but never decides.
 *
 * Points are DERIVED, never stored: you earn one per level after the first, so
 * `available = level - 1 - Σ(ranks already spent)`.
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { loadCharacter } from "@/lib/data";
import { currencyLedgerOps } from "@/lib/ledger";
import type { Attributes } from "@/lib/game";
import type { ActionResult } from "@/lib/actions";

// ---------------------------------------------------------------------------
// The tree (code-defined)
// ---------------------------------------------------------------------------

export interface TalentNode {
  key: string;
  label: string;
  emoji: string;
  description: string;
  maxRank: number;
  /** Flat attribute bonus granted PER RANK. */
  bonus: Partial<Attributes>;
  /** Optional gate: another node must be at least this deep first. */
  requires?: { node: string; minRank: number };
}

/**
 * Roughly two tiers per attribute plus a capstone. Tier-two nodes are gated
 * behind a few ranks of their tier-one feeder so builds have to commit.
 */
export const TALENT_NODES: TalentNode[] = [
  // -- Tier 1: the foundations, freely available ----------------------------
  {
    key: "might",
    label: "Might",
    emoji: "💪",
    description: "Lift heavier things, hit softer things. +2 Strength per rank.",
    maxRank: 5,
    bonus: { strength: 2 },
  },
  {
    key: "toughness",
    label: "Toughness",
    emoji: "🪨",
    description:
      "Become measurably harder to kill. +2 Constitution per rank (and thus more HP).",
    maxRank: 5,
    bonus: { constitution: 2 },
  },
  {
    key: "precision",
    label: "Precision",
    emoji: "🎯",
    description: "Aim for the squishy bits. +2 Dexterity per rank.",
    maxRank: 5,
    bonus: { dexterity: 2 },
  },
  {
    key: "wisdom",
    label: "Wisdom",
    emoji: "📖",
    description: "Read the long words in the spellbook. +2 Intelligence per rank.",
    maxRank: 5,
    bonus: { intelligence: 2 },
  },
  {
    key: "fortune",
    label: "Fortune",
    emoji: "🍀",
    description: "The universe owes you one. +1 Luck per rank.",
    maxRank: 5,
    bonus: { luck: 1 },
  },

  // -- Tier 2: specialisations, gated behind their feeder --------------------
  {
    key: "berserker",
    label: "Berserker's Fury",
    emoji: "🪓",
    description:
      "Anger management, weaponised. +3 Strength and +1 Constitution per rank.",
    maxRank: 3,
    bonus: { strength: 3, constitution: 1 },
    requires: { node: "might", minRank: 3 },
  },
  {
    key: "bulwark",
    label: "Bulwark",
    emoji: "🛡️",
    description: "An immovable object with a pulse. +3 Constitution per rank.",
    maxRank: 3,
    bonus: { constitution: 3 },
    requires: { node: "toughness", minRank: 3 },
  },
  {
    key: "deadeye",
    label: "Deadeye",
    emoji: "🏹",
    description:
      "Never miss, occasionally show off. +2 Dexterity and +1 Luck per rank.",
    maxRank: 3,
    bonus: { dexterity: 2, luck: 1 },
    requires: { node: "precision", minRank: 3 },
  },
  {
    key: "arcana",
    label: "Deep Arcana",
    emoji: "🔮",
    description: "Dangerously well-read. +3 Intelligence per rank.",
    maxRank: 3,
    bonus: { intelligence: 3 },
    requires: { node: "wisdom", minRank: 3 },
  },

  // -- Capstone: a little of everything, earned the hard way -----------------
  {
    key: "paragon",
    label: "Paragon",
    emoji: "👑",
    description:
      "Insufferably well-rounded. +1 to every attribute. There can be only one rank.",
    maxRank: 1,
    bonus: {
      strength: 1,
      dexterity: 1,
      intelligence: 1,
      constitution: 1,
      luck: 1,
    },
    requires: { node: "fortune", minRank: 3 },
  },
];

/** The bribe extracted by the Guild Bureaucracy to wipe your talent slate. */
export const RESPEC_COST = 250;

export function getTalentNode(key: string): TalentNode | undefined {
  return TALENT_NODES.find((n) => n.key === key);
}

// ---------------------------------------------------------------------------
// Pure helpers (safe to import anywhere; no server-only deps)
// ---------------------------------------------------------------------------

function zeroAttributes(): Attributes {
  return { strength: 0, dexterity: 0, intelligence: 0, constitution: 0, luck: 0 };
}

/** Sum the per-rank bonuses of every allocated talent into flat attributes. */
export function talentBonuses(
  talents: { node: string; rank: number }[],
): Attributes {
  const total = zeroAttributes();
  for (const t of talents) {
    const def = getTalentNode(t.node);
    if (!def || t.rank <= 0) continue;
    const b = def.bonus;
    total.strength += (b.strength ?? 0) * t.rank;
    total.dexterity += (b.dexterity ?? 0) * t.rank;
    total.intelligence += (b.intelligence ?? 0) * t.rank;
    total.constitution += (b.constitution ?? 0) * t.rank;
    total.luck += (b.luck ?? 0) * t.rank;
  }
  return total;
}

/** Points earned (1 per level after 1) minus points already spent. */
export function availablePoints(
  level: number,
  talents: { rank: number }[],
): number {
  const spent = talents.reduce((s, t) => s + t.rank, 0);
  return Math.max(0, level - 1 - spent);
}

// ---------------------------------------------------------------------------
// Server actions
// ---------------------------------------------------------------------------

/** Sink one talent point into `node`, validating every gate server-side. */
export async function allocateTalent(node: string): Promise<ActionResult> {
  "use server";
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const def = getTalentNode(node);
  if (!def) return { ok: false, message: "That talent doesn't exist." };

  const talents = character.talents ?? [];
  const current = talents.find((t) => t.node === node)?.rank ?? 0;

  if (current >= def.maxRank) {
    return { ok: false, message: `${def.label} is already maxed out.` };
  }

  if (def.requires) {
    const gateRank =
      talents.find((t) => t.node === def.requires!.node)?.rank ?? 0;
    if (gateRank < def.requires.minRank) {
      const gate = getTalentNode(def.requires.node);
      return {
        ok: false,
        message: `${def.label} demands ${def.requires.minRank} rank(s) of ${
          gate?.label ?? def.requires.node
        } first.`,
      };
    }
  }

  if (availablePoints(character.level, talents) <= 0) {
    return { ok: false, message: "No talent points to spend. Go level up." };
  }

  await prisma.talent.upsert({
    where: { characterId_node: { characterId: character.id, node } },
    create: { characterId: character.id, node, rank: 1 },
    update: { rank: { increment: 1 } },
  });

  revalidatePath("/");
  return {
    ok: true,
    message: `${def.emoji} ${def.label} is now rank ${current + 1}.`,
  };
}

/** Wipe every allocated talent, for the going rate of 250 gold. */
export async function respecTalents(): Promise<ActionResult> {
  "use server";
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  if ((character.talents ?? []).length === 0) {
    return { ok: false, message: "You have no talents to un-learn. Impressive." };
  }
  if (character.gold < RESPEC_COST) {
    return {
      ok: false,
      message: `A respec costs ${RESPEC_COST} gold. Your purse disagrees.`,
    };
  }

  await prisma.$transaction([
    prisma.character.update({
      where: { id: character.id },
      data: { gold: character.gold - RESPEC_COST },
    }),
    prisma.talent.deleteMany({ where: { characterId: character.id } }),
    ...currencyLedgerOps(
      character.id,
      { gold: character.gold, mushrooms: character.mushrooms },
      { gold: -RESPEC_COST },
      "TALENT_RESPEC",
    ),
  ]);

  revalidatePath("/");
  return {
    ok: true,
    message: `Slate wiped for ${RESPEC_COST} gold. All ${
      character.level - 1
    } point(s) refunded — spend them wisely this time.`,
  };
}
