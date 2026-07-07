# 01 — Art Direction & UI/UX

> **Status:** ✅ Complete
> **Owner:** Senior Art Director / UX Lead · **Milestone focus:** M1–M5 · **Version:** 1.0
> **Depends on:** 02, 07, 08 · **Last updated:** 2026-07-07

**Module summary.** This document is the single source of visual and interaction
truth for **Quest & Cudgel**. It defines the art direction ("gilded grimoire" —
hand-illustrated fantasy with the restraint and cohesion of a AAA menu system),
the full design-token system (color, type, spacing, radius, elevation, motion)
expressed as Tailwind v4 CSS variables, a component library, and a
screen-by-screen wireframe spec with every state (empty, loading, error,
success). It inherits the Master Plan's five pillars — especially *"Every tap has
weight"* — and hands the audio/haptic half of that promise to
[`07-game-feel-audio-juice.md`](./07-game-feel-audio-juice.md), the words on every
screen to [`02-narrative-world-content.md`](./02-narrative-world-content.md), and
the FTUE/paywall surfaces to
[`08-onboarding-meta-monetization.md`](./08-onboarding-meta-monetization.md). The
goal: a browser/PWA game that looks and feels like it cost ten times what it did.

---

## Table of Contents

1. [Art Direction & Visual Identity](#1-art-direction--visual-identity)
2. [Design System](#2-design-system)
3. [Screen Inventory & Wireframes](#3-screen-inventory--wireframes)
4. [Motion & Animation Grammar](#4-motion--animation-grammar)
5. [Character & World Art](#5-character--world-art)
6. [Responsive, Mobile-First & PWA](#6-responsive-mobile-first--pwa)
7. [Accessibility](#7-accessibility)
8. [Art Production Pipeline](#8-art-production-pipeline)
9. [Milestone Phasing, Risks & KPIs](#9-milestone-phasing-risks--kpis)
10. [Appendix: Token Reference & Handoff](#10-appendix-token-reference--handoff)

---

## 1. Art Direction & Visual Identity

### 1.1 The concept: "Gilded Grimoire"

Quest & Cudgel looks like **an illuminated manuscript that a very talented,
slightly unhinged monk illustrated after too much mead** — then a modern studio
rebuilt as a taut, 60fps interface. Two forces in tension, held in balance:

- **Warm, hand-made, characterful** — parchment, tooled leather, gold leaf,
  ink-line creatures, wax seals, ribbon banners. The world is drawn, not
  rendered. It has a pulse and a sense of humor.
- **Precise, systematic, expensive** — a strict grid, one type scale, one motion
  grammar, generous negative space, and surgical use of gold. Nothing is
  cluttered. The chrome around the illustration is disciplined and quiet so the
  art and the numbers sing.

The joke of the game (see [`02`](./02-narrative-world-content.md)) lives in the
*content* — item names, boss taunts, empty-state copy — not in gimmicky chrome.
The frame stays elegant and lets the writing be funny. This is the Rockstar
trick: a hyper-polished container makes satire land harder.

### 1.2 Era & world tone

A **mythic-medieval Europe that never was** — think 14th-century marginalia
crossed with a Renaissance tavern signboard. Not grimdark, not cartoon-bright.
Candlelit. Gold catches the light; shadows are deep and brown, never black-black.
The absurdity is deadpan: the world takes itself *completely* seriously while
selling you a "+2 Cudgel of Mild Inconvenience."

### 1.3 Palette rationale

We **keep and formalize** the shipped tavern palette — deep browns, parchment,
gold, ember-red — because it already reads as warm, premium, and on-theme. The
work is to turn four ad-hoc hexes into a disciplined, tokenized system with a
full tonal ramp, accessible contrast, a light "Daylight" mode, and a rarity
language. Gold (`#E8B923`) remains the single hero accent: it means *value,
reward, currency, the good ending*. We ration it. If everything is gold, nothing
is.

### 1.4 References, in words

- The **loot-reveal drama** of Diablo/Hades — an item is an *event*, framed by
  light and a beat of anticipation.
- The **menu cohesion and readable data density** of a Blizzard launcher or FIFA
  Ultimate Team hub — busy, but never confusing.
- The **hand-drawn warmth and wit** of Shakes & Fidget and Cult of the Lamb —
  characterful line art, expressive faces, comedic timing.
- The **restraint and gold-on-dark luxury** of a premium banking or watch app —
  proof that "expensive" is mostly *space, alignment, and one accent used
  sparingly*.

### 1.5 What makes it feel expensive (the checklist)

Every screen is measured against this:

1. **One accent, rationed.** Gold only for reward/value/primary CTA. Never
   decorative.
2. **Consistent 4px rhythm.** Everything aligns to the spacing scale. No orphan
   pixels.
3. **Layered depth, not flat cards.** Elevation via soft shadow + a 1px inner
   top-highlight (the "gilded edge"), not heavy borders.
4. **Motion has follow-through.** Nothing snaps; everything eases and settles.
5. **Type does the hierarchy.** Weight and size, not boxes and lines, separate
   information.
6. **Never mute.** Every empty state, error, and idle moment has a voice
   (content from [`02`](./02-narrative-world-content.md)).
7. **Reward moments are cinematic.** Level-up and epic loot briefly take over the
   screen (coordinated with [`07`](./07-game-feel-audio-juice.md)).

---

## 2. Design System

Everything below ships as **CSS custom properties consumed by Tailwind v4's
`@theme inline`**, extending the existing `globals.css`. Tokens are the contract;
components never hardcode hex, px, or ms.

### 2.1 Color tokens

We define a **primitive ramp** (raw colors, never used directly in components)
and **semantic tokens** (what components reference). This is what lets us ship a
light mode and seasonal reskins by swapping ~30 semantic values, not thousands of
class names.

#### Primitive ramps

```css
/* Parchment / neutral warm (the paper) */
--parchment-50:  #faf3e6;
--parchment-100: #f3e5d0;  /* == shipped --foreground */
--parchment-200: #e6d2b0;
--parchment-300: #cbb088;
--parchment-400: #b99b78;  /* == shipped --muted */
--parchment-500: #94795a;

/* Umber / brown (the leather & wood) */
--umber-700: #5c3d21;  /* == shipped --border */
--umber-800: #3a2817;  /* == shipped --surface-2 */
--umber-900: #2b1d12;  /* == shipped --surface */
--umber-950: #1a120b;  /* == shipped --background */
--umber-975: #120c07;  /* deepest, for scrims */

/* Gold (the hero) */
--gold-300: #f6d97a;
--gold-400: #efc94c;
--gold-500: #e8b923;  /* == shipped --gold — the hero */
--gold-600: #c99a15;
--gold-700: #9c760f;

/* Ember (danger / attack / heat) */
--ember-400: #e0574a;
--ember-500: #c0392b;  /* == shipped --accent */
--ember-600: #9c2a1f;

/* Moss (success / heal / go) */
--moss-400: #7bc95c;
--moss-500: #6ab04c;  /* == shipped --good */
--moss-600: #4f8a37;

/* Sanguine warn / caution */
--amber-warn: #d98a2b;

/* Arcane (mana, magic accents, mushrooms/premium) */
--arcane-400: #9b7ede;
--arcane-500: #7c5cd6;
--arcane-600: #5f42ab;
```

#### Semantic tokens — Dark ("Candlelight", default)

```css
--bg:            var(--umber-950);
--bg-elevated:   var(--umber-900);
--surface:       var(--umber-900);
--surface-2:     var(--umber-800);
--surface-3:     #47331e;              /* hover/active raise */
--border:        var(--umber-700);
--border-subtle: #46301b;
--fg:            var(--parchment-100);
--fg-muted:      var(--parchment-400);
--fg-inverse:    var(--umber-950);

--accent:        var(--gold-500);      /* primary CTA / value */
--accent-hover:  var(--gold-400);
--accent-press:  var(--gold-600);
--on-accent:     var(--umber-975);     /* text on gold */

--danger:        var(--ember-500);
--success:       var(--moss-500);
--warn:          var(--amber-warn);
--info:          var(--arcane-500);
--premium:       var(--arcane-500);    /* mushrooms currency */

--focus-ring:    #ffe08a;              /* high-contrast, warm */
--scrim:         color-mix(in oklab, var(--umber-975) 72%, transparent);
```

#### Semantic tokens — Light ("Daylight")

A genuine second theme (sun-bleached parchment), toggled via
`:root[data-theme="light"]`. Same semantic names → components are theme-agnostic.

```css
--bg:            #f0e2c4;
--bg-elevated:   #f7ecd6;
--surface:       #fbf4e4;
--surface-2:     #f3e3c4;
--surface-3:     #ecd7ad;
--border:        #cbb088;
--border-subtle: #ddc9a1;
--fg:            #2b1d12;
--fg-muted:      #7a5f3f;
--fg-inverse:    #fbf4e4;

--accent:        var(--gold-600);      /* darker gold for AA on light */
--accent-hover:  var(--gold-500);
--accent-press:  var(--gold-700);
--on-accent:     #fbf4e4;

--danger:        #a52f22;
--success:       #4f8a37;
--warn:          #b06f18;
--info:          var(--arcane-600);
--focus-ring:    #7a5210;
--scrim:         color-mix(in oklab, #2b1d12 55%, transparent);
```

#### Rarity tokens (shared with Economy [`04`] & Combat [`03`])

Rarity is a first-class visual language — color **plus** a non-color cue (glyph +
motion) so it survives colorblindness (see [§7](#7-accessibility)).

| Rarity | Token | Hex (dark) | Non-color cue |
|---|---|---|---|
| Common | `--rarity-common` | `#b99b78` (parchment-400) | ◇ hollow diamond, no glow |
| Uncommon | `--rarity-uncommon` | `#6ab04c` (moss) | ◆ single, faint edge |
| Rare | `--rarity-rare` | `#4a90d9` | ◆◆ steady glow |
| Epic | `--rarity-epic` | `#a24bd6` | ✦ pulsing glow + corner filigree |
| Legendary | `--rarity-legendary` | `#e8b923` (gold) | ★ animated shimmer sweep |
| Mythic | `--rarity-mythic` | `#e0574a→#7c5cd6` gradient | ✸ animated aurora border |

> Rare uses blue (not more brown) to break out of the warm palette and read
> instantly against parchment. Legendary *is* the hero gold — the game's whole
> economy points toward the color of the primary CTA. That's intentional: the
> best loot feels like it's made of currency.

### 2.2 Type scale

**Two families**, both self-hosted (no external CDN — CSP + offline PWA):

- **Display / headings:** a warm humanist serif with character — target **"Cormorant Garamond"** or **"Spectral"** (weights 500/600/700). Used for screen titles, hero names, big numbers, reward callouts. This carries the "illuminated manuscript" feel.
- **UI / body / data:** the shipped **Geist Sans** (`--font-geist-sans`), plus **Geist Mono** for numbers that must align (gold counts, timers, stats). Tabular-nums on all counters.

Modular scale, **1.20 (minor third)**, 16px base, expressed as tokens:

```css
--text-xs:   0.75rem;   /* 12px — captions, timestamps, meta */
--text-sm:   0.875rem;  /* 14px — secondary body, labels */
--text-base: 1rem;      /* 16px — body, buttons */
--text-lg:   1.125rem;  /* 18px — emphasized body, list titles */
--text-xl:   1.375rem;  /* 22px — card/section headings (serif) */
--text-2xl:  1.75rem;   /* 28px — screen titles (serif) */
--text-3xl:  2.25rem;   /* 36px — hero numbers, level-up */
--text-4xl:  3rem;      /* 48px — celebratory takeovers */

--leading-tight: 1.15;  --leading-normal: 1.5;  --leading-loose: 1.7;
--tracking-caps: 0.08em; /* for small uppercase labels */
--weight-reg: 400; --weight-med: 500; --weight-semi: 600; --weight-bold: 700;
```

Rules: screen titles = serif `--text-2xl` semibold. Numbers players compare
(stats, prices) = mono, tabular. Body never below `--text-sm`. Small uppercase
labels ("EQUIPPED", "SOLD OUT") use `--tracking-caps`.

### 2.3 Spacing, radius, elevation

**4px base grid.** All margins, padding, gaps are multiples.

```css
--space-1: 0.25rem; --space-2: 0.5rem;  --space-3: 0.75rem; --space-4: 1rem;
--space-5: 1.25rem; --space-6: 1.5rem;  --space-8: 2rem;    --space-10: 2.5rem;
--space-12: 3rem;   --space-16: 4rem;

--radius-sm: 0.375rem;  /* chips, badges, inputs */
--radius-md: 0.625rem;  /* buttons */
--radius-lg: 0.75rem;   /* cards, panels (matches shipped .panel) */
--radius-xl: 1rem;      /* modals, hero cards */
--radius-full: 9999px;  /* pills, avatars */

/* Elevation = soft shadow + the "gilded edge" inner top-highlight */
--elev-0: none;
--elev-1: 0 1px 2px rgba(0,0,0,.30), inset 0 1px 0 rgba(255,255,255,.04);
--elev-2: 0 6px 16px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.05);
--elev-3: 0 12px 32px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.06);
--elev-gold: 0 0 0 1px var(--gold-600), 0 8px 24px rgba(232,185,35,.18);
```

Container widths: content column max **`--container: 60rem`** (960px) on desktop;
game canvas centers with generous gutters (the "expensive" negative space). Mobile
is edge-to-edge with `--space-4` gutters.

### 2.4 Iconography strategy

Three-tier, phased (see [§8](#8-art-production-pipeline)):

1. **Now (M1):** replace raw emoji with a **curated line-icon set** — one stroke
   weight (1.75px), rounded caps, drawn on a 24px grid. Source from a single
   consistent open set (Lucide/Phosphor style) themed to warm gold/parchment,
   self-hosted as an SVG sprite. Emoji stay *only* inside user/flavor content,
   never in chrome.
2. **M2–M3:** commission/AI-assist **~40 bespoke game glyphs** where generic
   icons fail the fantasy: the seven equipment slots, each class sigil, currency
   marks (gold coin, mushroom), stat runes (STR/INT/DEX), rarity glyphs.
3. **Ongoing:** an **icon token map** (`--icon-quest`, `--icon-arena`…) so a
   glyph can be reskinned per season without touching components.

All icons are **currentColor SVG** so they inherit semantic color tokens and
respond to hover/theme automatically.

### 2.5 Component library

Specs are token-driven; every interactive component defines **5 states**
(default, hover, active/press, focus-visible, disabled) and, where relevant,
loading and selected. Audio/haptic pairing for each is owned by
[`07`](./07-game-feel-audio-juice.md); we name the trigger, they own the sound.

#### Buttons

| Variant | Use | Fill | Text | Border |
|---|---|---|---|---|
| **Primary** | the one action that matters (Quest!, Buy, Fight) | `--accent` | `--on-accent` | none; `--elev-gold` on hover |
| **Secondary** | common alt actions | `--surface-2` | `--fg` | `1px --border` |
| **Ghost** | tertiary / nav | transparent | `--fg-muted`→`--fg` | none |
| **Danger** | destructive (leave guild, sell) | transparent→`--danger` on hover | `--danger`→`--on-accent` | `1px --danger` |
| **Premium** | mushroom spends | `--premium` | `#fff` | `--elev` arcane glow |

- Sizes: `sm` (h 32px), `md` (h 40px, default), `lg` (h 52px, primary CTAs).
- Radius `--radius-md`. Press: `translateY(1px)` + scale .98, 90ms. Focus:
  `2px --focus-ring` offset ring. Disabled: 40% opacity, no shadow, `cursor:
  not-allowed`.
- **Loading state:** label swaps to a 3-dot pulse or inline spinner; button keeps
  width (no layout shift); pointer disabled. Primary CTAs show optimistic state
  immediately, then reconcile with server (per Master Plan §6).

#### Cards & Panels

- **Panel** — extends the shipped `.panel` (gradient `--surface-2`→`--surface`,
  `1px --border`, `--radius-lg`, `--elev-2`). The base container everywhere.
- **Item card** — square-ish, rarity frame (2px border in rarity color + corner
  filigree for epic+), icon centered, name below, price/power chip. Hover: raise
  `--elev-3` + 1.02 scale + rarity glow. Selected: gold inset ring.
- **Hero/Rival card** — portrait crest, name (serif), level badge, power score,
  class sigil. Used in arena, guild roster, leaderboard.
- **Stat card** — label (caps, muted) + value (mono, `--text-xl`) + optional
  delta chip (green ▲ / red ▼ when gear changes preview stats).

#### Bars (progress / resource)

Track = `--surface-3`, inset shadow. Fill = semantic gradient. **XP bar**: gold
gradient, animates on gain with a leading shimmer + trailing "ghost" of prior
value. **HP**: moss→ember by threshold. **Quest timer**: radial or linear, fills
toward completion; last 10% pulses. All bars: `--radius-full`, height 8–12px,
`transition: width var(--dur-2) var(--ease-out)`.

#### Badges & Chips

- **Rarity badge**, **level badge** (gold ring), **NEW** dot (ember), **count
  chip** (mono, e.g. inventory qty), **currency chip** (icon + tabular number).
- **Notification dot** on nav items (guild activity, claimable quest) — 8px,
  `--accent` or `--danger`, gentle pulse.

#### Modals & Sheets

- Desktop: centered modal, `--radius-xl`, `--elev-3`, `--scrim` backdrop, max-w
  `28rem`–`40rem`. Enter: scrim fades (`--dur-2`), card scales 0.96→1 + fade
  (`--dur-3`, `--ease-spring`). Dismiss on scrim click / Esc / X.
- **Mobile:** modals become **bottom sheets** (slide up, drag-to-dismiss handle),
  respecting safe-area inset.
- **Confirm dialogs** (destructive) require explicit primary/danger buttons; no
  accidental-dismiss for irreversible actions.
- **Reward modal** (level-up, loot) is a special celebratory takeover — see
  [§4.4](#44-celebratory-moments).

#### Toasts

Top-center (desktop) / top under safe-area (mobile). Variants: success (moss),
info (parchment), warn (amber), error (ember). Auto-dismiss 4s (errors: sticky +
manual). Stack max 3, newest on top, older collapse. Enter slide+fade `--dur-2`.
Copy comes from [`02`](./02-narrative-world-content.md) — always in-voice ("The
merchant pockets your gold with a wink.").

#### Tabs & Navigation

- **Segmented tabs** (within a screen, e.g. Shop categories): pill track, active
  pill = `--surface-3` + gold underline, animated indicator slides `--dur-2`.
- **Primary nav** — see [§3.2](#32-navigation-shell). Bottom bar on mobile, side
  rail on desktop.

#### Inputs

Text inputs: `--surface`, `1px --border`, `--radius-sm`, focus ring
`--focus-ring`. Inline validation (error text ember, below field). Labels always
present (accessibility), never placeholder-only.

#### Empty / Loading / Error primitives

- **Empty state**: centered illustration slot + serif headline + one-line
  in-voice body + primary CTA. (Copy authored in [`02`](./02-narrative-world-content.md).)
- **Skeleton**: `--surface-2` blocks with a slow gold-tinted shimmer sweep
  (`--dur-shimmer`), matching final layout to avoid shift.
- **Error card**: ember-bordered panel, wry headline ("The realm hiccuped."),
  retry button, quiet technical detail behind a "details" disclosure.

---

## 3. Screen Inventory & Wireframes

Wireframes are described as **layout regions + hierarchy + states**. Notation:
`[ ]` = region, `→` = transition, ▸ = interactive. Every screen lists its
**player fantasy**, **information hierarchy** (what wins the eye), and
**feedback** (what confirms an action).

### 3.1 Screen inventory

| # | Screen | Route | Priority (milestone) |
|---|---|---|---|
| A | Auth (register/login) | `/` (logged-out) | M1 |
| B | Dashboard / Town Hub | `/` (logged-in) | M1 |
| C | Quest Board + Active Quest | `/quests` | M1 |
| D | Arena (PvP) | `/arena` | M1 |
| E | Dungeon | `/dungeons` | M1 |
| F | Magic Shop | `/shop` | M1 |
| G | Inventory / Equipment / Paper-doll | `/hero` | M1 |
| H | Guild Hall | `/guild` | M1 (basic) → M2 (hall) |
| I | Profile / Hero Sheet | `/hero/profile` | M1 |
| J | Leaderboard / Hall of Fame | `/leaderboard` | M1 |
| K | Settings | `/settings` | M1 |
| L | Reward / Level-up takeover (overlay) | — | M1 |
| M | Onboarding/FTUE (overlay flow) | — | M2, owned by [`08`] |

### 3.2 Navigation shell

The persistent frame all screens live inside.

- **Top bar (all viewports):** left = hero crest + name + level badge; center
  (desktop) = current screen title (serif); right = **currency cluster** (gold
  chip, mushroom chip — tap → shop), settings gear, notification bell.
- **Desktop (≥1024px):** left **side rail** with icon+label nav (Town, Quests,
  Arena, Dungeons, Shop, Hero, Guild, Ranks). Active item: gold left-edge marker
  + `--surface-3` fill. Content column centered at `--container`.
- **Mobile (<1024px):** **bottom tab bar**, 5 primary destinations (Town,
  Quests, Battle [Arena+Dungeon grouped], Hero, Guild); overflow (Shop, Ranks,
  Settings) reachable from Town hub tiles. Bottom bar respects
  `env(safe-area-inset-bottom)`. Active tab: gold icon + label + top-edge
  indicator. **Notification dots** on Quests (claimable) and Guild (activity).

### 3.3 A — Auth

- **Fantasy:** *cross the threshold into the tavern.* First impression must sell
  production value in 2 seconds.
- **Layout:** full-bleed candlelit tavern illustration (parallax on
  pointer/scroll, disabled under reduced-motion). Centered `--radius-xl` panel:
  logo lockup (serif wordmark + cudgel glyph), tagline, segmented Login/Register
  tabs, fields, primary gold CTA ("Enter the Tavern"). On register: inline
  class-pick teaser (Warrior/Mage/Scout sigils) — full class choice can defer to
  FTUE ([`08`]).
- **Hierarchy:** logo → primary CTA → fields → toggle.
- **States:** loading (CTA spinner, optimistic nothing — auth is server-gated);
  error (inline under field, in-voice: "The gatekeeper doesn't know that name.");
  success → dashboard with a warm wipe transition.
- **Empty first-run:** register tab default, one-line hook from [`02`].

### 3.4 B — Dashboard / Town Hub

- **Fantasy:** *this is my town, and it's alive.* The home you return to daily.
- **Layout (desktop):** hero banner row (crest, name, level, XP bar, power
  score) across top; below, a **grid of destination tiles** (Quest Board, Arena,
  Dungeons, Shop, Guild, Ranks) — each a rich card with icon, one-line status
  ("Quest ready to collect!", "3 challengers await"), and a **claimable/attention
  badge** where relevant. Right column: **daily objectives** (from [`08`]), news
  ribbon, and a "what's new/seasonal" banner slot ([`06`]).
- **Hierarchy:** any *claimable* reward tile wins (gold badge + gentle pulse) →
  hero banner → daily objectives → tiles.
- **Feedback:** collecting a ready quest directly from a tile fires the reward
  overlay without leaving the hub — reduces taps, respects session shape.
- **States:** loading = skeleton tiles; empty (brand-new hero) = tiles show
  "locked until level N" with teasing copy; error = per-tile retry, hub still
  renders.
- **Idle/away return:** on return after time away, a "While you were gone…"
  summary card (idle gains) animates in — the retention hook.

### 3.5 C — Quest Board & Active Quest

- **Fantasy:** *choose my next adventure and feel the clock tick.*
- **Quest Board:** list/grid of available quests, each card = illustrated vignette
  + title (serif, funny) + duration options (10m/1h/8h chips) + reward preview
  (gold/XP/loot chance). One primary "Embark" CTA per card. Filter/sort tabs
  (duration, reward type).
- **Active Quest:** replaces board when a quest runs. Big **radial timer**
  centered, hero silhouette walking a looping path, live countdown (mono),
  reward preview, and a **"speed up (mushrooms)"** honest option ([`08`]). When
  complete: timer fills gold, "Collect" primary CTA pulses.
- **Hierarchy:** active timer (when running) → collect CTA → reward preview.
- **Feedback:** embark = card lifts, hero animates off; collect = reward overlay
  ([§L](#310-l--reward--level-up-takeover)).
- **States:** empty ("The quest board is bare. Even the goblins are on holiday.")
  ; loading skeleton cards; error inline; **completed-while-away** → auto-surfaces
  collect on load.

### 3.6 D — Arena (PvP, async)

- **Fantasy:** *prove I'm better than a real person.*
- **Layout:** top = my rank/rating + season chip ([`06`]). Center = **opponent
  ladder**: rival cards (crest, name, level, power, win/loss) with "Challenge"
  CTA. Below = recent fight log (wins moss, losses ember, wry one-liners from
  [`02`]).
- **Fight resolution:** async → tap Challenge → **combat playback overlay**: two
  hero cards face off, HP bars, turn-by-turn hit numbers floating up (crit = gold
  burst), then victory/defeat banner. Server-authoritative; client only replays
  the returned log (per Master Plan §8, coordinate with [`03`]).
- **Hierarchy:** my rating → challengeable rivals (sorted by fair matchup) →
  rewards on win.
- **States:** empty ladder ("No rivals in range — you're terrifyingly average.");
  cooldown ("Catch your breath: next free fight in 12:00"); loss = defeat banner
  with in-voice consolation + rematch/retreat options.

### 3.7 E — Dungeon

- **Fantasy:** *descend into danger for real treasure.*
- **Layout:** dungeon select (3 biomes as illustrated portals with recommended
  power + best floor reached). Inside: **vertical floor-climb map** (nodes rising,
  current floor highlighted, boss floors marked with a skull sigil). Tap current
  floor → fight playback (as arena) → on win, floor advances with a climbing
  animation; loot drops surface via item-reveal.
- **Hierarchy:** current floor + "Descend" CTA → boss floor markers → loot.
- **Feedback:** floor clear = node lights gold, map scrolls up one; boss kill =
  bigger celebratory beat + boss death line ([`02`]) + guaranteed loot reveal.
- **States:** locked dungeon (power gate, teasing copy); wipe = "The dungeon keeps
  your dignity" defeat card, resume from checkpoint floor; empty (never — always
  a floor to try).

### 3.8 F — Magic Shop

- **Fantasy:** *spend my winnings, chase an upgrade, meet a character.*
- **Layout:** shopkeeper portrait + rotating banter ([`02`]) top-left; **timed
  stock grid** of item cards (rarity-framed) with price chips; category segmented
  tabs (Weapons/Armor/Trinkets/Consumables); **restock timer**. Tap item →
  **detail modal**: big item art, rarity, full stats with **equipped-vs-this delta
  preview** (green ▲/red ▼), price, Buy (gold) / Buy (mushrooms) where premium.
- **Hierarchy:** items I can afford + are upgrades (subtle "upgrade" tag) →
  restock timer → shopkeeper flavor.
- **Feedback:** buy = coin-spend animation, gold counter ticks down (mono roll),
  item flies to inventory, success toast. Can't afford = shake + ember hint,
  gold chip flashes.
- **States:** sold-out slot (grayed, "SOLD" stamp); empty restock ("The
  merchant's restocking. Bribery accepted."); loading skeleton grid.

### 3.9 G — Inventory / Equipment / Paper-doll

- **Fantasy:** *dress my hero and watch them get stronger.*
- **Layout (desktop, two-column):** **left = paper-doll** — hero portrait with 7
  equipment slots arranged around it (head, chest, hands, legs, feet, main-hand,
  off-hand/trinket), each slot showing its equipped item's icon + rarity frame,
  empty slots showing a ghost glyph. Center-bottom: **power score** + primary
  stats (mono), with live delta preview on hover. **Right = inventory grid**
  (paginated/scroll), filter tabs (slot, rarity), sort (power, newest, value).
- **Interaction:** tap inventory item → hover/preview shows stat delta on the
  paper-doll; tap Equip → item snaps into slot with a satisfying click + shimmer,
  displaced item returns to bag; stats animate to new values (mono roll, delta
  chips). Sell (gold) and lock (protect from bulk-sell) actions in item detail.
- **Hierarchy:** the hero (paper-doll) is the emotional center → power score →
  equippable upgrades (auto-tagged) → the rest of the bag.
- **Mobile:** paper-doll and bag are **two tabs**; equip preview shows delta chips
  inline.
- **States:** empty bag ("Your pack holds a lint ball and regret."); over-capacity
  warning; loading skeleton doll + grid; new items get a NEW dot until viewed.

### 3.10 H — Guild Hall

- **Fantasy:** *I belong to something bigger and we're winning together.*
- **M1 (basic):** guild name + crest, **roster** (member cards: name, level,
  power, contribution), guild leaderboard rank, join/leave/found CTAs, gold-perk
  indicator.
- **M2 (Hall):** an **illustrated hall interior** with upgradeable rooms
  (coordinate scope with [`05`]), guild goals/weekly objectives ([`06`]), chat
  entry ([`05`]), and a member-contribution board. Founder/officer controls
  gated by role.
- **Hierarchy:** guild identity (crest+name) → weekly goal progress → roster/your
  contribution.
- **States:** guildless (big "Join or Found" empty state with search + create,
  in-voice pitch); pending application; empty roster (founder just started).

### 3.11 I — Profile / Hero Sheet

- **Fantasy:** *this is who I am — show it off.*
- **Layout:** large hero portrait/crest, class sigil, level + title (from
  achievements, [`06`]), full **stat breakdown** (base + gear + talent
  contributions, [`03`]), lifetime achievements/badges wall, PvP record, dungeon
  progress. Shareable/public version for viewing rivals.
- **Hierarchy:** identity (portrait, name, title) → headline stats/power → badges.
- **States:** own profile (edit crest/title CTAs); viewing another player
  (Challenge CTA if in arena range, no edit); loading skeleton.

### 3.12 J — Leaderboard / Hall of Fame

- **Fantasy:** *where do I stand in the realm?*
- **Layout:** segmented tabs (Global Power / Arena Rating / Guild / Weekly
  Season). Ranked list rows: rank (gold for top 3, with laurel glyph), crest,
  name, key metric (mono). **Sticky "your rank" row** pinned at the bottom edge so
  you always see yourself. Top-3 get a special podium header treatment.
- **Hierarchy:** top 3 podium → your sticky rank → the list around you.
- **States:** loading skeleton rows; unranked ("Win a fight to enter the
  rankings"); season-reset banner ([`06`]).

### 3.13 K — Settings

- **Fantasy:** *the game respects me and my device.*
- **Sections:** Account (email, password, logout), **Display** (theme:
  Candlelight/Daylight/System, reduced motion, colorblind-safe rarity toggle,
  text size), **Audio** (master/SFX/music sliders, mute — [`07`]), **Haptics**
  toggle, **Notifications** (push opt-in, quest-ready alerts), **Language**,
  Legal/Privacy, "Restore purchases" ([`08`]), version + credits.
- **Hierarchy:** most-changed (theme, audio, notifications) first; account and
  legal last.
- **States:** each toggle gives immediate visual feedback; destructive (delete
  account) behind confirm dialog with typed confirmation.

### 3.14 L — Reward / Level-up Takeover

- **Fantasy:** *I earned this and the game is throwing me a party.*
- **Overlay** (not a route). Scrim dims the game, a beam of gold light,
  **item/level card scales in with anticipation beat**, particles, the number
  counts up (mono), rarity-appropriate flourish (legendary = screen-wide shimmer +
  stronger haptic + fanfare from [`07`]). Multi-reward = card stack you tap
  through. Dismiss = tap anywhere → card flies to its home (inventory/level
  badge). See [§4.4](#44-celebratory-moments) and [`07`] for the sensory spec.
- **Restraint:** takeover intensity scales with rarity/significance — common loot
  is a quiet toast, not a takeover. We don't cry wolf.

---

## 4. Motion & Animation Grammar

Motion is a **language with a small, strict vocabulary** so the whole game moves
like one object. All values are tokens; [`07`](./07-game-feel-audio-juice.md)
owns the paired audio/haptic and the `juice event` schema — this section owns the
*visual* timing and easing.

### 4.1 Easing tokens

```css
--ease-out:    cubic-bezier(0.22, 1, 0.36, 1);    /* default: enters, reveals */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);    /* moves, repositions */
--ease-in:     cubic-bezier(0.5, 0, 0.75, 0);     /* exits */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* playful settle, rewards */
```

### 4.2 Duration tokens

```css
--dur-1: 90ms;    /* button press, micro-feedback */
--dur-2: 180ms;   /* hovers, toggles, tab slide */
--dur-3: 280ms;   /* card/modal enter, page content */
--dur-4: 450ms;   /* screen transitions, reward card in */
--dur-5: 800ms;   /* celebratory beats, bar fills */
--dur-shimmer: 1600ms; /* skeleton/legendary shimmer loop */
```

Rule of thumb: **the more spatial distance / significance, the longer** — but
nothing interactive exceeds `--dur-4`; the player never waits on chrome.

### 4.3 Transition grammar

- **Enter:** fade + 8–12px rise or 0.96→1 scale, `--ease-out`, `--dur-3`.
- **Exit:** fade + slight fall, `--ease-in`, `--dur-2` (faster than enter).
- **Screen change:** content cross-fades + subtle directional slide matching nav
  order (going "deeper" slides left); shell (nav, currency) stays put.
- **Stagger:** list items enter with a 20–30ms cascade (cap total at ~300ms).
- **Number changes:** counters roll (tabular mono), never hard-swap; bars tween.
- **Optimistic UI:** action reflects instantly; if server disagrees, the value
  gently corrects with a brief highlight (no jarring snap) — trust-preserving.

### 4.4 Celebratory moments

Reserved, rationed intensity ladder (so the biggest moments still land):

1. **Micro** (buy, equip, quest embark): local scale-pop + particle tick +
   click. `--dur-1`/`--dur-2`.
2. **Notable** (quest collect, floor clear, uncommon/rare loot): toast or small
   card, `--ease-spring`, gold sparkle. `--dur-3`.
3. **Major** (level-up, epic loot, boss kill): **takeover overlay** — scrim,
   beam, particles, count-up, fanfare + strong haptic ([`07`]). `--dur-4`→`--dur-5`.
4. **Epochal** (legendary/mythic drop, season rank-up, prestige): screen-wide
   shimmer, aurora, held beat, distinct musical sting. Rare by design — maybe a
   handful per week of play.

### 4.5 Reduced motion

`prefers-reduced-motion: reduce` (and the Settings override) → all transforms and
parallax become **cross-fades only**; particles and shimmer disabled; celebratory
takeovers still show (content matters) but as a static, quick fade. Never remove
*information*, only *animation*. See [§7](#7-accessibility).

---

## 5. Character & World Art

### 5.1 How heroes are visualized

**Phased, from cheap-but-cohesive to bespoke** (pipeline in [§8](#8-art-production-pipeline)):

- **M1 — Procedural crest + class portrait.** Each hero gets a **generated
  heraldic crest** (deterministic from account id: shield shape + tincture from
  palette + charge from class + optional guild mark) rendered as **SVG** — zero
  art cost, infinitely unique, instantly on-brand, printable at any size. Plus one
  of **3 class portraits** (Warrior/Mage/Scout) as a hand-drawn bust with a few
  palette-swappable tint variants. This is the "hero identity" everywhere (nav,
  cards, profile).
- **M2 — Layered paper-doll.** A true **SVG/PNG layered paper-doll**: base body
  (per class) + equipment layers (helm, chest, weapon, etc.) drawn to a shared
  rig so any gear composites onto any hero. Equipping visibly changes the hero.
  Layers are z-ordered; rarity adds a glow layer. This is the big M2 art
  investment and the emotional payoff of the loot loop.
- **M3+ — Portrait polish & animation.** Idle breathing loop, equip flourishes,
  optional cosmetic-only skins (monetized honestly, [`08`]).

### 5.2 Gear visualization

- Each item = **icon (bag view)** + **paper-doll layer (worn)** + **detail art
  (modal)**. Rarity drives the frame, glow, and (epic+) animated filigree.
- Icon and worn-layer share silhouette so players learn to recognize gear.
- **Affix visual language** ([`04`]): affixes add small runic marks / tints to the
  item art, so a heavily-rolled item *looks* special, not just reads special.

### 5.3 Rarity visual language (canonical)

Beyond the color tokens ([§2.1](#21-color-tokens)): each rarity has **frame
weight + glow + motion + glyph** (colorblind-safe, [§7]):

| Rarity | Frame | Glow | Motion | Reveal beat |
|---|---|---|---|---|
| Common | 1px, muted | none | none | toast |
| Uncommon | 2px moss | faint | none | toast |
| Rare | 2px blue | steady soft | slow pulse | small card |
| Epic | 3px purple + corner filigree | medium | pulse + drifting motes | takeover |
| Legendary | gold, ornate corners | strong | shimmer sweep | takeover + fanfare |
| Mythic | animated aurora border | intense | aurora + rays | epochal takeover |

### 5.4 Biome / dungeon & world art

- **Three dungeon biomes** get distinct palettes-within-the-system (a cave =
  cooler umbers + arcane accents; a crypt = desaturated + ember torchlight; a
  wilds = mossy greens) — all still derived from the token ramps so they feel like
  one world.
- **Backgrounds** are illustrated, **parallax-layered** (disabled under reduced
  motion), reused across screens as ambient set-dressing so the world feels
  continuous. Town hub, quest board, and each biome share a visual family.
- **Weather/time-of-day tint** overlay (cheap, token-driven) gives seasonal/live
  variety ([§8.4](#84-seasonal-reskin-system), [`06`]).

---

## 6. Responsive, Mobile-First & PWA

### 6.1 Breakpoints (Tailwind v4 defaults, semantic use)

| Token | Min width | Layout |
|---|---|---|
| base | 0 | single column, bottom nav, edge-to-edge |
| `sm` | 640px | wider cards, 2-col grids |
| `md` | 768px | 2–3 col grids, sheets still bottom |
| `lg` | 1024px | **side rail nav**, centered content column, modals centered |
| `xl` | 1280px | max negative-space luxury, multi-column dashboards |

**Mobile-first**: every screen is designed at 360px first, then given room. The
paper-doll, shop, and inventory all have explicit mobile (tabbed) and desktop
(multi-column) layouts specified in [§3](#3-screen-inventory--wireframes).

### 6.2 PWA

- **Installable** (manifest: name, icons from the crest/wordmark set, theme-color
  = `--bg`, standalone display). Coordinate manifest/service-worker with
  [`09`](./09-technical-architecture-platform.md).
- **App-like chrome**: no browser UI in standalone; our top bar + bottom nav are
  the frame.
- **Offline shell**: cached shell renders instantly; a friendly "You're
  offline — the realm awaits reconnection" state for server-dependent actions
  (all game math is server-side per Master Plan).
- **Splash**: themed splash (wordmark on candlelit bg) matches auth screen for
  seamless cold-start.

### 6.3 Safe areas & touch

- Respect `env(safe-area-inset-*)` on bottom nav, top bar, bottom sheets, and
  celebratory overlays (no reward card under a notch).
- **Touch targets ≥ 44×44px** (iOS) / 48dp (Android). Primary CTAs are `lg`
  (52px) on mobile. Adequate spacing prevents mis-taps in dense grids.
- Gestures: bottom-sheet drag-to-dismiss, pull-to-refresh on lists (where server
  fetch applies), horizontal swipe between sibling tabs where natural — **never**
  the only way to do something (always a visible control too).

---

## 7. Accessibility

Accessibility is a **quality gate, not a phase**. WCAG **2.2 AA** is the floor.

### 7.1 Contrast

- Body text on its background ≥ **4.5:1**; large text/UI ≥ **3:1**. The dark theme
  parchment (`--fg` #f3e5d0) on umber (`--bg` #1a120b) ≈ 12:1 — comfortable. Gold
  text is used **only at large sizes / on dark**; on-gold text uses the deep umber
  `--on-accent` for AA. Light theme uses `--gold-600`/`700` to keep gold legible.
- We ship a **contrast audit** of every semantic pairing in the token appendix;
  any pairing failing AA is not allowed to ship.

### 7.2 Color independence (colorblind-safe rarities)

Rarity **never relies on color alone**: every rarity carries a **distinct glyph**
(◇ ◆ ◆◆ ✦ ★ ✸), frame weight, and motion signature ([§5.3](#53-rarity-visual-language-canonical)).
A **"colorblind-safe" Settings toggle** further boosts glyph prominence and shifts
Rare/Epic hues to a deuteranopia-safe pairing. Success/danger states always pair
color with an icon and text, never color alone.

### 7.3 Motion

`prefers-reduced-motion` respected globally + an explicit Settings toggle
([§4.5](#45-reduced-motion)). Parallax, shimmer, particles off; essential feedback
becomes instant/fade. No motion is ever the sole carrier of meaning.

### 7.4 Focus & keyboard

- Every interactive element is keyboard-reachable in logical order, with a
  visible **`--focus-ring`** (2px, high-contrast warm). No focus traps except
  intentional modals (which trap correctly and restore focus on close).
- Modals/sheets: Esc closes, focus moves in on open and returns on close.
- Skip-to-content link on each route.

### 7.5 Screen readers & semantics

- Semantic HTML first (buttons are `<button>`, nav is `<nav>`, headings ordered).
  ARIA only to fill gaps (live regions for toasts/timers, `aria-label` on
  icon-only buttons, `role="status"` for quest countdowns).
- Icons decorative-only get `aria-hidden`; meaningful ones get labels.
- Numbers that update (gold, timers) announce politely, not on every tick
  (debounced live regions) to avoid screen-reader spam.

### 7.6 Text & internationalization

- Adjustable text size (Settings) up to 130% without layout breakage (fluid
  layouts, no fixed-height text boxes).
- Copy from [`02`] authored for **localization** (no baked text in images; string
  keys; room for German/RU length ~+35%).

---

## 8. Art Production Pipeline

The honest constraint: **no dedicated artist today.** The strategy is a **ladder
from zero-cost systematic art to commissioned polish**, where nothing we build
now gets thrown away — the token system and component library are the permanent
scaffold; art assets slot into named, reskinnable holes.

### 8.1 Tier 0 — Now (M1): "systematic art"

Zero external art cost, maximum cohesion:

- **CSS/SVG generated art**: procedural heraldic crests, rarity frames, filigree,
  bars, gradients, biome tints — all code, all token-driven, all crisp at any DPI.
- **Curated line-icon set** ([§2.4](#24-iconography-strategy)) replacing chrome
  emoji; self-hosted SVG sprite.
- **Emoji retained only in flavor/user content**, never in UI chrome.
- **Illustrated backgrounds**: 3–5 key candlelit scenes (tavern, quest board, 3
  biomes) — the *one* place we spend early, because it sells the whole game. Can
  be AI-assisted (see 8.3) then hand-cleaned, or a small illustration commission.

### 8.2 Tier 1 — M2: bespoke game glyphs + paper-doll

- **~40 bespoke glyphs** (slots, sigils, currencies, stat runes).
- **Layered paper-doll rig** + a starter gear-art library (base tiers per slot,
  palette-swapped for rarity). This is the largest art line-item; budget for a
  contract illustrator or a rigorously art-directed AI-assisted pipeline.

### 8.3 Tier 2 — M3+: AI-assisted + commissioned polish

- **AI-assisted production, human-directed**: generate concept/base art to a
  strict style guide (this doc + a locked reference sheet), then a
  illustrator/retoucher cleans, unifies, and rigs. Every asset passes an
  **art-direction QA gate** (palette-conformant, silhouette-readable, on-tone)
  before shipping. We never ship raw generations.
- **Commissioned key art** for marketing, hero legendaries, boss portraits, and
  seasonal splashes — the highest-visibility surfaces.

### 8.4 Seasonal reskin system

Because everything is token-driven, a **season is a data payload, not a rebuild**:

- A **season theme** = an override map of semantic tokens (accent shifts,
  background swap, particle color) + a set of seasonal glyphs/frames + a splash.
  Applied via `:root[data-season="frostfall"]` scoping.
- Enables the LiveOps cadence ([`06`]) — Frostfall, Harvest, Emberfest — to reskin
  the whole game for cost of a token file + a few assets. Cosmetic season rewards
  ([`08`]) plug into the same slots.

### 8.5 Asset budget (rough, per milestone)

| Milestone | Art scope | Approx effort |
|---|---|---|
| M1 | Icon set curation, 5 bg scenes, crest/rarity SVG system, wordmark | ~2–3 wk, mostly design/eng |
| M2 | 40 glyphs, paper-doll rig + base gear tiers, guild-hall interior | ~contract illustrator, 4–6 wk |
| M3 | Biome polish, boss portraits, legendary art, 1st season kit | AI-assisted + retouch, ongoing |
| M4 | Store/marketing key art, PWA/store icons, splash set | commissioned burst |
| M5 | Per-season kits (quarterly), cosmetic cadence | ~1 kit / season, systematized |

### 8.6 Asset governance

- **One reference sheet** (the locked style bible: palette chips, line weight,
  silhouette rules, do/don't) that every artist/AI prompt derives from.
- **Naming + token map**: every asset maps to a semantic slot; no orphan art.
- **Perf budget**: SVG-first; raster assets ≤ target KB, served responsive
  (`srcset`), lazy-loaded below the fold; sprite atlases for icons. Coordinate
  delivery/caching with [`09`].

---

## 9. Milestone Phasing, Risks & KPIs

### 9.1 Phasing (M1 → M5)

**M1 — Foundation (design system v1 + first art pass).**
- Ship the full token system (color light+dark, type, spacing, radius, elevation,
  motion) in `globals.css` via `@theme`.
- Component library v1 (buttons, cards, panels, bars, badges, modals→sheets,
  toasts, tabs, inputs, empty/loading/error).
- Nav shell (side rail + bottom bar), currency cluster, notification dots.
- Reskin all M0 screens (auth, dashboard, quests, arena, dungeon, shop, hero,
  guild, leaderboard, settings) to the system; replace chrome emoji with icon set.
- Procedural crests + 3 class portraits; rarity visual language; 5 bg scenes.
- Motion grammar + reward takeover v1; reduced-motion + a11y baseline (AA, focus,
  SR labels). Light/Dark theme toggle.

**M2 — Depth.** Layered paper-doll + gear art; guild-hall interior; bespoke
glyphs; stat-delta previews everywhere; talent/skill UI surfaces ([`03`]); FTUE
visual support ([`08`]).

**M3 — Endgame.** Biome polish, boss portraits, legendary/mythic art & epochal
takeovers; season-theme reskin engine; raid/tower/event UI shells ([`06`]); chat
UI ([`05`]).

**M4 — Launch.** PWA polish (manifest, offline shell, splash, install), store/
marketing key art, monetization surfaces ([`08`]) held to the same bar, full a11y
audit + perf pass (60fps, <2s load).

**M5 — Live.** Seasonal reskin kits on cadence, cosmetic pipeline, tournament/
community UI, continuous polish backlog.

### 9.2 Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| No dedicated artist → inconsistent/thin art | Whole game feels cheap | Systematic SVG/CSS art now; strict reference sheet + QA gate; AI-assist under human art direction; concentrate spend on high-visibility surfaces |
| Token sprawl / drift as 9 designers build | Cohesion breaks | Tokens are the single contract; no hardcoded hex/px/ms in PRs; lint rule + design-review gate; this doc is canonical |
| Celebratory FX overused → nothing feels special | Reward fatigue | Rationed intensity ladder ([§4.4]); rarity gates takeover intensity; common loot = toast only |
| Motion/parallax hurts low-end mobile / a11y | Jank, exclusion | Reduced-motion path is first-class; particle/parallax budgets; test on low-end; perf is a feature (Master Plan §6) |
| Rarity color-only → colorblind exclusion | Unreadable loot | Glyph + frame + motion per rarity; colorblind toggle; audited in appendix |
| Light theme as afterthought | Broken/ugly second mode | Semantic tokens designed for both from day 1; contrast audit covers both |
| Illustrated bgs bloat load | Slow first paint | SVG-first, responsive raster, lazy-load, offline-cached shell; perf budget in [§8.6] |
| Optimistic UI diverges from server truth | Trust erosion | Gentle reconcile-correct pattern ([§4.3]); server authority respected; never fake a reward |

### 9.3 KPIs this module moves

Art/UX doesn't own retention alone, but it **directly moves**:

- **First-impression / activation**: register→first-quest conversion; time-to-
  first-meaningful-action (target < 30s). *Auth + dashboard clarity.*
- **Perceived performance**: interaction-to-feedback latency (target: instant/
  optimistic on 100% of primary actions); first-load < 2s; sustained 60fps.
- **Comprehension**: FTUE step completion & drop-off ([`08`]); % players who
  equip a better item when one exists (upgrade-tag effectiveness); support
  tickets tagged "confusing/couldn't find."
- **Reward resonance** (with [`07`]): % of reward takeovers watched to completion
  vs. skipped; session-continue rate after a level-up.
- **Accessibility reach**: % sessions with reduced-motion / larger-text / theme
  changed (adoption = we served real needs); zero AA-contrast defects shipped.
- **Cohesion proxy**: design-system component adoption (% of UI built from tokens/
  library vs. one-off) — internal health metric toward the "expensive" feel.

---

## 10. Appendix: Token Reference & Handoff

### 10.1 Implementation shape (Tailwind v4)

Extend the shipped `src/app/globals.css`. Primitives + dark semantics in
`:root`; light overrides in `:root[data-theme="light"]`; season overrides in
`:root[data-season="…"]`; then map semantics into Tailwind via `@theme inline`
(as the current file already does for the shipped four colors). Sketch:

```css
@import "tailwindcss";

:root {
  /* primitives (§2.1) … */
  /* dark semantic tokens (§2.1) … */
  /* type, space, radius, elevation, motion tokens (§2.2–2.3, §4) … */
}
:root[data-theme="light"] { /* light semantic overrides (§2.1) */ }
:root[data-season="frostfall"] { /* seasonal accent/bg overrides (§8.4) */ }

@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-accent: var(--accent);
  --color-fg: var(--fg);
  /* … one line per semantic token, so `bg-surface`, `text-fg`,
     `text-accent`, `ring-focus` etc. resolve to themeable vars … */
  --radius-lg: var(--radius-lg);
  --ease-out: var(--ease-out);
}

@media (prefers-reduced-motion: reduce) {
  * { animation-duration: .001ms !important; transition-duration: 1ms !important; }
  /* essential cross-fades preserved via utility opt-in (§4.5) */
}
```

The existing `.panel` helper stays and becomes one member of the component
library; new component classes/React components follow the same token-only rule.

### 10.2 Handoff checklist for engineering ([`09`]) & other modules

- **Tokens are law.** No literal hex/px/ms in components; reference tokens only.
- **Every component ships 5 states** (default/hover/press/focus/disabled) +
  loading/empty/error where relevant.
- **Copy is external.** All strings from [`02`]; no baked text in art (i18n).
- **Juice events** ([§4.4]) emit the shared schema for [`07`] to attach audio/
  haptic — this doc names the trigger, [`07`] owns the sound.
- **Monetization surfaces** ([`08`]) and **season kits** ([`06`]) reuse the
  library and token/reskin system — no bespoke one-off UI.
- **A11y gate**: AA contrast (both themes), keyboard path, reduced-motion, SR
  labels — checked per PR, not at the end.

### 10.3 Sample in-voice copy (for tone calibration; canonical set owned by [`02`])

- Empty inventory: *"Your pack holds a lint ball and regret. Go hit something."*
- Sold-out shop slot: *"SOLD. Someone had better timing and worse taste."*
- Arena no rivals: *"No rivals in range — you're terrifyingly average."*
- Quest board empty: *"The board is bare. Even the goblins are on holiday."*
- Offline: *"You're offline. The realm holds its breath."*
- Can't afford: *"Bold. But your purse disagrees."*
- Level-up banner: *"LEVEL {n}. The bards will exaggerate this."*
- Defeat (dungeon): *"The dungeon keeps your dignity. Try floor {n} again?"*

> These are **placeholders to lock tone**; [`02-narrative-world-content.md`] owns
> the shipping strings. The rule this module enforces: **no screen is ever mute.**

---

*End of Module 01 — Art Direction & UI/UX. Cohesion is the product. Tokens are
the contract. Every tap has weight.*
