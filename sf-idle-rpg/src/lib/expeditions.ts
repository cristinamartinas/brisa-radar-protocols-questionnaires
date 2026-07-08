"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { loadCharacter } from "@/lib/data";
import { currencyLedgerOps } from "@/lib/ledger";
import { applyLevelUps, type CharClass, type Progression } from "@/lib/game";
import { makeRng, randomSeed, pick, randInt } from "@/lib/rng";
import type { ActionResult } from "@/lib/actions";

/**
 * Expeditions — long, high-stakes timed missions. Bigger and slower than a
 * tavern quest: one active at a time, the reward is rolled and locked in the
 * moment you set out, and it is only paid once the server clock passes the
 * deadline (a client can never collect early). Rewards flow through the same
 * seeded-RNG + currency-ledger + level-up machinery as the rest of the game, so
 * an expedition payout is a pure function of `(hero level, tier, seed)` and is
 * fully auditable after the fact.
 *
 * NOTE: every export in a `"use server"` module must be an async function, so
 * the tier table lives as a private const and is surfaced through the async
 * `listExpeditionTiers()` helper.
 */

interface ExpeditionTier {
  tier: number;
  label: string;
  emoji: string;
  blurb: string;
  durationSec: number;
  goldMult: number;
  xpMult: number;
  dustMin: number;
  dustMax: number;
}

// Escalating risk/reward: each rung is far slower but pays far more than its
// duration alone would suggest — that's the "high-stakes" part.
const EXPEDITION_TIERS: readonly ExpeditionTier[] = [
  {
    tier: 1,
    label: "Scouting Foray",
    emoji: "🗺️",
    blurb: "A brisk survey of the nearer marches.",
    durationSec: 60,
    goldMult: 1,
    xpMult: 1,
    dustMin: 0,
    dustMax: 1,
  },
  {
    tier: 2,
    label: "Campaign",
    emoji: "⚔️",
    blurb: "A season in the field against a real foe.",
    durationSec: 300,
    goldMult: 7,
    xpMult: 6,
    dustMin: 2,
    dustMax: 5,
  },
  {
    tier: 3,
    label: "Grand Crusade",
    emoji: "🏰",
    blurb: "A legend-making march to the world's edge.",
    durationSec: 900,
    goldMult: 26,
    xpMult: 22,
    dustMin: 6,
    dustMax: 14,
  },
];

// Themed name pool — one is drawn (seeded) at launch for flavour.
const EXPEDITION_NAMES: readonly string[] = [
  "The Long March to Groan Peak",
  "Voyage of the Leaky Galleon",
  "Into the Whispering Fens",
  "The Salt-Road Reckoning",
  "Siege of the Perpetually Locked Gate",
  "Pilgrimage of Questionable Necessity",
  "The Cartographer's Last Errand",
  "Descent through the Bramblewild",
  "The Tithe-Collector's Grand Tour",
  "Expedition to the Rumoured Treasure",
  "The Frostbitten Overland",
  "Crusade Against the Middle Management of Doom",
];

function getTier(tier: number): ExpeditionTier | undefined {
  return EXPEDITION_TIERS.find((t) => t.tier === tier);
}

/**
 * Deterministic reward roll for an expedition. Base payouts scale with hero
 * level, are multiplied by the tier, then jittered by the seeded RNG. When
 * `jitter` is false a stable midpoint is returned — used for the UI preview so
 * the numbers a player sees before launching are honest.
 */
function rollRewards(
  rng: () => number,
  t: ExpeditionTier,
  level: number,
  jitter = true,
): { gold: number; xp: number; dust: number } {
  const goldBase = 40 + level * 12;
  const xpBase = 20 + level * 8;
  const wobble = jitter ? 0.85 + rng() * 0.3 : 1; // ±15%
  const gold = Math.round(goldBase * t.goldMult * wobble);
  const xp = Math.round(xpBase * t.xpMult * wobble);
  const dust = jitter
    ? randInt(rng, t.dustMin, t.dustMax)
    : Math.round((t.dustMin + t.dustMax) / 2);
  return { gold, xp, dust };
}

/** Tier metadata plus an honest reward preview for the given hero level. */
export async function listExpeditionTiers(level: number) {
  return EXPEDITION_TIERS.map((t) => ({
    tier: t.tier,
    label: t.label,
    emoji: t.emoji,
    blurb: t.blurb,
    durationSec: t.durationSec,
    preview: rollRewards(() => 0, t, level, false),
  }));
}

/** The hero's active expedition, if any (loadCharacter omits this relation). */
export async function loadActiveExpedition(characterId: string) {
  return prisma.expedition.findUnique({ where: { characterId } });
}

/**
 * Set out on an expedition. Refuses if one is already underway; otherwise rolls
 * the reward with a fresh seed scaled by tier + hero level and stores it with a
 * server-computed deadline.
 */
export async function startExpedition(
  tier: number,
  _formData?: FormData,
): Promise<ActionResult> {
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const existing = await loadActiveExpedition(character.id);
  if (existing) {
    return { ok: false, message: "An expedition is already underway." };
  }

  const t = getTier(tier);
  if (!t) return { ok: false, message: "Unknown expedition." };

  const seed = randomSeed();
  const rng = makeRng(seed);
  const name = pick(rng, EXPEDITION_NAMES);
  const reward = rollRewards(rng, t, character.level);
  const endsAt = new Date(Date.now() + t.durationSec * 1000);

  await prisma.expedition.create({
    data: {
      characterId: character.id,
      name,
      tier: t.tier,
      rewardGold: reward.gold,
      rewardXp: reward.xp,
      rewardDust: reward.dust,
      seed,
      endsAt,
    },
  });

  revalidatePath("/");
  return { ok: true, message: `Set out: "${name}" (${t.label}). 🚩` };
}

/**
 * Collect a finished expedition. Server-authoritative: refuses (with the time
 * remaining) until the deadline has passed. Grants gold/XP/dust and applies any
 * level-ups in a single transaction, records a quest-log entry, then clears the
 * expedition.
 */
export async function collectExpedition(): Promise<ActionResult> {
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const expedition = await loadActiveExpedition(character.id);
  if (!expedition) return { ok: false, message: "No expedition in progress." };

  // You cannot collect early — the client clock is not trusted.
  if (Date.now() < expedition.endsAt.getTime()) {
    const secs = Math.ceil((expedition.endsAt.getTime() - Date.now()) / 1000);
    return { ok: false, message: `Still on the march — ${secs}s to go.` };
  }

  const progression: Progression = {
    class: character.class as CharClass,
    level: character.level,
    experience: character.experience + expedition.rewardXp,
    strength: character.strength,
    dexterity: character.dexterity,
    intelligence: character.intelligence,
    constitution: character.constitution,
    luck: character.luck,
  };
  const levels = applyLevelUps(progression);

  await prisma.$transaction([
    prisma.character.update({
      where: { id: character.id },
      data: {
        gold: character.gold + expedition.rewardGold,
        dust: character.dust + expedition.rewardDust,
        experience: progression.experience,
        level: progression.level,
        strength: progression.strength,
        dexterity: progression.dexterity,
        intelligence: progression.intelligence,
        constitution: progression.constitution,
        luck: progression.luck,
        questLogs: {
          create: {
            title: expedition.name,
            goldReward: expedition.rewardGold,
            xpReward: expedition.rewardXp,
          },
        },
      },
    }),
    prisma.expedition.delete({ where: { id: expedition.id } }),
    ...currencyLedgerOps(
      character.id,
      {
        gold: character.gold,
        mushrooms: character.mushrooms,
        dust: character.dust,
      },
      { gold: expedition.rewardGold, dust: expedition.rewardDust },
      "EXPEDITION_REWARD",
    ),
  ]);

  revalidatePath("/");

  let message = `"${expedition.name}" complete! +${expedition.rewardGold}🪙, +${expedition.rewardXp} XP`;
  if (expedition.rewardDust) message += `, +${expedition.rewardDust} ✨ dust`;
  if (levels > 0) {
    message += ` — LEVEL UP! You are now level ${progression.level}. 🎖️`;
  }
  return { ok: true, message };
}

/** Abandon the active expedition. No reward — the march was for nothing. */
export async function cancelExpedition(): Promise<ActionResult> {
  const character = await loadCharacter();
  if (!character) return { ok: false, message: "No hero found." };

  const expedition = await loadActiveExpedition(character.id);
  if (!expedition) return { ok: false, message: "No expedition to abandon." };

  await prisma.expedition.delete({ where: { id: expedition.id } });
  revalidatePath("/");
  return { ok: true, message: "The expedition turns back, empty-handed." };
}
