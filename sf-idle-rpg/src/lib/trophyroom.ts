/**
 * The Trophy Room — a single prestige showcase that unifies everything a hero
 * has collected and accomplished: titles unlocked, cosmetics owned, pets in the
 * menagerie, bestiary completion, achievements earned, their best Tower floor,
 * and their guild.
 *
 * Strictly READ-ONLY (no "use server", no writes, no new tables). It owns no
 * data of its own — it simply reuses the existing read-only catalog loaders
 * (titles / cosmetics / bestiary / achievements) and a couple of direct Prisma
 * counts, aggregating them into one tidy { sections / highlights } shape for the
 * cabinet UI. Every sub-loader is guarded so one odd shape can never blank the
 * whole room.
 */

import { prisma } from "@/lib/db";
import { loadTitles } from "@/lib/titles";
import { loadCosmetics } from "@/lib/cosmetics";
import { loadBestiary } from "@/lib/bestiary";
import { evaluateAchievements } from "@/lib/achievements";
import { PET_SPECIES } from "@/lib/pets";

/** A single trophy cabinet tile: a collection with earned / total progress. */
export interface TrophySection {
  key: string;
  label: string;
  emoji: string;
  earned: number;
  total: number;
  /** earned / total as a whole-number percentage (0 when total is 0). */
  pct: number;
  /** Proud one-liner shown under the tile. */
  caption: string;
}

/** A headline stat displayed above the cabinet (not a progress ring). */
export interface TrophyHighlight {
  key: string;
  label: string;
  emoji: string;
  value: string;
}

export interface TrophyRoom {
  sections: TrophySection[];
  highlights: TrophyHighlight[];
  /** Sum of earned across every collectible section. */
  totalEarned: number;
  /** Sum of total across every collectible section. */
  totalPossible: number;
  /** totalEarned / totalPossible as a whole-number percentage. */
  overallPct: number;
}

const pct = (earned: number, total: number): number =>
  total <= 0 ? 0 : Math.round((earned / total) * 100);

/**
 * Gather a hero's headline collection stats. Batches every source with
 * Promise.all and defends each one with a fallback so a single failing loader
 * degrades that tile gracefully instead of throwing the whole room away.
 */
export async function loadTrophyRoom(characterId: string): Promise<TrophyRoom> {
  const [titles, cosmetics, bestiary, achievements, petCount, tower, character] =
    await Promise.all([
      loadTitles(characterId).catch(() => []),
      loadCosmetics(characterId).catch(() => ({
        avatars: [],
        frames: [],
        banners: [],
      })),
      loadBestiary(characterId).catch(() => ({
        foes: [],
        discovered: 0,
        total: 0,
        completion: 0,
      })),
      evaluateAchievements(characterId).catch(() => []),
      prisma.pet.count({ where: { characterId } }).catch(() => 0),
      prisma.towerState
        .findUnique({
          where: { characterId },
          select: { highestFloor: true },
        })
        .catch(() => null),
      prisma.character
        .findUnique({
          where: { id: characterId },
          select: { guild: { select: { name: true, tag: true } } },
        })
        .catch(() => null),
    ]);

  // — Titles ————————————————————————————————————————————————
  const titlesEarned = titles.filter((t) => t.unlocked).length;
  const titlesTotal = titles.length;

  // — Cosmetics (avatars + frames + banners folded together) ——
  const allCosmetics = [
    ...cosmetics.avatars,
    ...cosmetics.frames,
    ...cosmetics.banners,
  ];
  const cosmeticsEarned = allCosmetics.filter((c) => c.unlocked).length;
  const cosmeticsTotal = allCosmetics.length;

  // — Pets (owned menagerie vs. the whole species catalog) ——
  const petsTotal = PET_SPECIES.length;

  // — Achievements ————————————————————————————————————————
  const achievementsEarned = achievements.filter((a) => a.unlocked).length;
  const achievementsTotal = achievements.length;

  const sections: TrophySection[] = [
    {
      key: "titles",
      label: "Titles",
      emoji: "🎖️",
      earned: titlesEarned,
      total: titlesTotal,
      pct: pct(titlesEarned, titlesTotal),
      caption: "Epithets earned and worn with a straight face.",
    },
    {
      key: "cosmetics",
      label: "Cosmetics",
      emoji: "🎨",
      earned: cosmeticsEarned,
      total: cosmeticsTotal,
      pct: pct(cosmeticsEarned, cosmeticsTotal),
      caption: "Avatars, frames and banners in the wardrobe.",
    },
    {
      key: "pets",
      label: "Menagerie",
      emoji: "🐾",
      earned: petCount,
      total: petsTotal,
      pct: pct(petCount, petsTotal),
      caption: "Companions adopted and unconditionally spoiled.",
    },
    {
      key: "bestiary",
      label: "Bestiary",
      emoji: "📖",
      earned: bestiary.discovered,
      total: bestiary.total,
      pct: pct(bestiary.discovered, bestiary.total),
      caption: "Specimens catalogued, mostly by defeating them.",
    },
    {
      key: "achievements",
      label: "Achievements",
      emoji: "🏅",
      earned: achievementsEarned,
      total: achievementsTotal,
      pct: pct(achievementsEarned, achievementsTotal),
      caption: "Milestones the mantelpiece can barely hold.",
    },
  ];

  const totalEarned = sections.reduce((s, x) => s + x.earned, 0);
  const totalPossible = sections.reduce((s, x) => s + x.total, 0);

  const towerBest = tower?.highestFloor ?? 0;
  const guild = character?.guild ?? null;

  const highlights: TrophyHighlight[] = [
    {
      key: "trophies",
      label: "Trophies Amassed",
      emoji: "🏆",
      value: totalEarned.toLocaleString(),
    },
    {
      key: "tower",
      label: "Tower Best",
      emoji: "🗼",
      value: towerBest > 0 ? `Floor ${towerBest.toLocaleString()}` : "Unclimbed",
    },
    {
      key: "guild",
      label: "Guild",
      emoji: "🏰",
      value: guild ? `${guild.name} [${guild.tag}]` : "Unaffiliated",
    },
  ];

  return {
    sections,
    highlights,
    totalEarned,
    totalPossible,
    overallPct: pct(totalEarned, totalPossible),
  };
}
