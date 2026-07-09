// ---------------------------------------------------------------------------
// Universal game-art descriptor system.
//
// Every drawable thing in the game — an item, a monster, a pet, a coin — is
// described by a small, serializable `Sprite` object. A single renderer
// (<GameSprite/>) turns that descriptor into a framed, themed icon: a procedural
// SVG "plaque" with the content's motif (an emoji, for now) at its heart.
//
// This module is PURE and client-safe (no db / server imports). Panels build a
// Sprite with the tiny builder helpers below and hand it to <GameSprite/>.
//
// Swapping in real art later: drop a file under /public/art and register it in
// art/overrides.ts — the renderer prefers a registered asset and falls back to
// the procedural placeholder, so every entity has an image from day one.
// ---------------------------------------------------------------------------

import {
  pickItemMotif,
  pickClassMotif,
  pickMonsterMotif,
  pickCurrencyMotif,
  pickFoeMotif,
  pickPetMotif,
} from "@/lib/art/motifs";

/** Frame silhouette. Different content families read at a glance by shape. */
export type FrameShape =
  | "rounded" // items, gear, generic catalog entries — a beveled plaque
  | "round" //   monsters, heroes, pets, currency — a medallion / coin
  | "shield"; //  classes & defensive things — a heater shield

/** Ring treatment drawn around the frame. */
export type RingStyle = "plain" | "ornate" | "danger" | "none";

export interface Sprite {
  /** The recognizable motif at the center (an emoji today; real art later). */
  glyph: string;
  /** Primary color — usually rarity / tier / class driven. */
  tint: string;
  /** Secondary accent for the ring / flourishes. */
  accent: string;
  shape: FrameShape;
  ring: RingStyle;
  /** 0..1 outer-glow strength; higher rarities shine harder. */
  glow: number;
  /** Deterministic seed (hashed from the entity id) → per-instance flourishes. */
  seed: number;
  /** Namespace for the real-asset override lookup (e.g. "item", "monster"). */
  kind: string;
  /** Stable id within the kind for the override lookup + variation. */
  id: string;
  /** Optional tiny corner tag (rarity initial, level, "★"). */
  badge?: string;
  /** Optional drawn vector motif key (see art/motifs). Overrides the glyph. */
  motif?: string;
}

// --- palettes ---------------------------------------------------------------

/** Rarity / tier colors, matching the values used across the game's catalogs. */
const TIER_COLORS: Record<string, string> = {
  // item + title + fish rarities
  common: "#b99b78",
  rare: "#4aa3df",
  epic: "#a55eea",
  legendary: "#e8b923",
  premium: "#ff6ab5",
  uncommon: "#6ab04c",
  junk: "#8a7862",
  // achievement tiers
  bronze: "#b87333",
  silver: "#c8d0d8",
  gold: "#e8b923",
};

/** Class colors — warm, distinct, theme-consistent. */
const CLASS_COLORS: Record<string, string> = {
  WARRIOR: "#c0392b",
  MAGE: "#7b6cf6",
  SCOUT: "#6ab04c",
};

/** Class motif emoji (fallback when a fighter has no explicit glyph). */
const CLASS_GLYPH: Record<string, string> = {
  WARRIOR: "⚔️",
  MAGE: "🪄",
  SCOUT: "🏹",
};

/** The three currencies, unified here so their icons never drift again. */
export const CURRENCY_ART: Record<
  "GOLD" | "MUSHROOMS" | "DUST",
  { glyph: string; tint: string; accent: string }
> = {
  GOLD: { glyph: "🪙", tint: "#e8b923", accent: "#fff4c2" },
  MUSHROOMS: { glyph: "🍄", tint: "#d64b4b", accent: "#ffd2c2" },
  DUST: { glyph: "✨", tint: "#a55eea", accent: "#e7d2ff" },
};

const DEFAULT_TINT = "#b99b78";
const DEFAULT_ACCENT = "#f3e5d0";

/** Resolve a rarity/tier label (any casing) to a color. */
export function tierColor(label: string | null | undefined): string {
  if (!label) return DEFAULT_TINT;
  return TIER_COLORS[label.toLowerCase()] ?? DEFAULT_TINT;
}

// --- deterministic hashing (self-contained; no rng.ts coupling) -------------

/** xmur3-style string hash → uint32. Stable across runs and platforms. */
export function hashStr(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

// --- builders: domain shape → Sprite ----------------------------------------
//
// Each helper takes the *minimal* identifying fields. Panels that already hold
// a catalog `emoji` pass it as `glyph`; item/fighter builders infer the motif.

const SLOT_GLYPH: Record<string, string> = {
  WEAPON: "🗡️",
  ARMOR: "🛡️",
  AMULET: "📿",
};

const RARITY_INITIAL: Record<string, string> = {
  COMMON: "C",
  RARE: "R",
  EPIC: "E",
  LEGENDARY: "L",
};

/** A piece of equipment: framed plaque, colored + glowing by rarity. */
export function itemSprite(item: {
  name: string;
  slot: string;
  rarity: string;
  id?: string | number;
}): Sprite {
  const rarity = (item.rarity ?? "COMMON").toUpperCase();
  const tint = tierColor(rarity);
  return {
    glyph: SLOT_GLYPH[item.slot?.toUpperCase()] ?? "🎁",
    tint,
    accent: DEFAULT_ACCENT,
    shape: "rounded",
    ring: rarity === "LEGENDARY" || rarity === "EPIC" ? "ornate" : "plain",
    glow: rarity === "LEGENDARY" ? 0.9 : rarity === "EPIC" ? 0.55 : rarity === "RARE" ? 0.3 : 0.12,
    seed: hashStr(`item:${item.name}:${item.slot}:${item.rarity}`),
    kind: "item",
    id: String(item.id ?? item.name),
    badge: RARITY_INITIAL[rarity],
    motif: pickItemMotif(item.name, item.slot) ?? undefined,
  };
}

/** A hero or NPC fighter, colored by class. `boss` adds a danger ring + glow. */
export function fighterSprite(f: {
  name: string;
  class?: string | null;
  glyph?: string | null;
  boss?: boolean;
}): Sprite {
  const cls = (f.class ?? "WARRIOR").toUpperCase();
  const tint = CLASS_COLORS[cls] ?? DEFAULT_TINT;
  return {
    glyph: f.glyph || CLASS_GLYPH[cls] || "🧑",
    tint: f.boss ? "#c0392b" : tint,
    accent: f.boss ? "#ffce54" : DEFAULT_ACCENT,
    shape: "round",
    ring: f.boss ? "danger" : "plain",
    glow: f.boss ? 0.8 : 0.2,
    seed: hashStr(`fighter:${f.name}`),
    kind: f.boss ? "boss" : "fighter",
    id: f.name,
    // Bosses draw a monster archetype; ordinary fighters draw their class crest.
    motif: f.boss
      ? pickMonsterMotif(f.name, f.glyph ?? "")
      : pickClassMotif(cls) ?? undefined,
  };
}

/** A hero portrait keyed purely by class (for the character panel). */
export function classSprite(cls: string, glyph?: string): Sprite {
  const c = (cls ?? "WARRIOR").toUpperCase();
  return {
    glyph: glyph || CLASS_GLYPH[c] || "🧑",
    tint: CLASS_COLORS[c] ?? DEFAULT_TINT,
    accent: "#f3e5d0",
    shape: "shield",
    ring: "ornate",
    glow: 0.35,
    seed: hashStr(`class:${c}`),
    kind: "class",
    id: c,
    motif: pickClassMotif(c) ?? undefined,
  };
}

/**
 * A pet / companion critter. Drawn on a round medallion (like the bestiary
 * foes) with a species-specific vector motif, falling back to its emoji.
 */
export function petSprite(species: { key: string; emoji: string }): Sprite {
  return catalogSprite({
    kind: "pet",
    id: species.key,
    glyph: species.emoji,
    shape: "round",
    ring: "plain",
    motif: pickPetMotif(species.key, species.emoji),
  });
}

/** Currency chip (gold / mushrooms / dust). */
export function currencySprite(kind: "GOLD" | "MUSHROOMS" | "DUST"): Sprite {
  const c = CURRENCY_ART[kind];
  return {
    glyph: c.glyph,
    tint: c.tint,
    accent: c.accent,
    shape: "round",
    ring: "ornate",
    glow: 0.4,
    seed: hashStr(`currency:${kind}`),
    kind: "currency",
    id: kind,
    motif: pickCurrencyMotif(kind),
  };
}

/**
 * Generic catalog entry that already carries its own emoji + optional
 * rarity/tier — pets, cosmetics, talents, skills, guild rooms, quests,
 * expeditions, achievements, titles, fish, bounties, wheel prizes, etc.
 */
export function catalogSprite(opts: {
  kind: string;
  id: string;
  glyph: string;
  tier?: string | null;
  tint?: string | null;
  shape?: FrameShape;
  ring?: RingStyle;
  glow?: number;
  motif?: string | null;
}): Sprite {
  const tint = opts.tint || tierColor(opts.tier) || DEFAULT_TINT;
  const strong = opts.tier
    ? ["legendary", "epic", "premium", "gold"].includes(opts.tier.toLowerCase())
    : false;
  return {
    // Preserve an explicit empty glyph (e.g. cosmetic frames, which are pure
    // color) — only fall back for a missing one.
    glyph: opts.glyph ?? "❔",
    tint,
    accent: DEFAULT_ACCENT,
    shape: opts.shape ?? "rounded",
    ring: opts.ring ?? (strong ? "ornate" : "plain"),
    glow: opts.glow ?? (strong ? 0.55 : 0.18),
    seed: hashStr(`${opts.kind}:${opts.id}:${opts.glyph}`),
    kind: opts.kind,
    id: opts.id,
    motif: opts.motif ?? undefined,
  };
}

/**
 * A bestiary foe. Themed foes (dungeon/tower/world-boss) draw a monster
 * archetype; the joke Arena Regulars keep their expressive emoji. Undiscovered
 * foes render as a muted silhouette.
 */
export function foeSprite(foe: {
  name: string;
  emoji: string;
  category?: string;
  discovered?: boolean;
}): Sprite {
  if (foe.discovered === false) {
    return catalogSprite({ kind: "foe", id: "unknown", glyph: "👤", shape: "round", ring: "plain" });
  }
  return catalogSprite({
    kind: "foe",
    id: foe.name,
    glyph: foe.emoji,
    shape: "round",
    ring: "plain",
    motif: pickFoeMotif(foe.name, foe.emoji, foe.category ?? ""),
  });
}

/** Last-resort placeholder for anything without a builder. */
export function genericSprite(kind: string, id: string, glyph = "❔"): Sprite {
  return catalogSprite({ kind, id, glyph });
}
