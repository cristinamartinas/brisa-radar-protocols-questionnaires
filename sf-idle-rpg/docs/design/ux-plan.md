# Quest & Cudgel — UX Redesign Plan

A plan to level the interface up from "tabbed panels" to a cohesive, game-feel UI
anchored by a dedicated **Character screen** (Shakes & Fidget–style paper-doll),
built on a small **reusable pattern library** so every screen looks and behaves
like one system.

Three parts:
1. **Principles** — the rules everything follows.
2. **The Pattern Library** — the ~15 reusable building blocks. "Make patterns on
   everything" = compose screens out of *these*, never one-off markup.
3. **Screen plans** — the flagship Character screen in full, then every other
   screen mapped to the patterns, with a phased roadmap.

---

## 1. Principles

- **One system.** Every screen is assembled from the Pattern Library below. If a
  screen needs something new, it becomes a pattern first, then gets used.
- **Server-authoritative, client-juicy.** All state/math stays server-side
  (already true). The client's job is presentation + feedback: hover, tooltips,
  animation, optimistic transitions.
- **Every entity has art.** Reuse the existing `GameSprite` system (drawn motifs
  + rarity frames) everywhere an item/foe/hero/currency appears.
- **Decisions are legible.** Any choice (equip this? buy that? fight who?) shows
  its consequence inline — deltas, previews, comparisons — before you commit.
  Extend the existing `GearCompare` idea into a universal tooltip.
- **Reads on any width.** Desktop = multi-column paper-doll; mobile = the same
  panels stacked. No separate mobile layout, just responsive patterns.
- **Accessible + reduced-motion.** Keyboard-reachable controls, `aria` labels on
  sprites, animations degrade to fades (already the `.juice-*` / `.bt-*`
  convention).

---

## 2. The Pattern Library

Formalize what already exists, add the few missing pieces. Each pattern is a
single component with defined props, states, and a home in `src/components/ui/`.

### Existing → formalize
| Pattern | Component | Purpose | States |
|---|---|---|---|
| **Panel** | `.panel` / `<Panel>` | The parchment card every section sits in | flat / raised / bordered-by-rarity |
| **Sprite** | `GameSprite` | Framed, themed art for any entity | rarity tint, glow, boss ring, badge |
| **ActionButton** | `ActionButton` | Runs a server action, shows result + celebration | idle / pending / result |
| **BattleReport** | `BattleReport` | Animated duel overlay | intro / playing / finished |
| **TimerBar** | from `QuestTimer`/`ExpeditionTimer` | Countdown + progress for timed activities | ticking / ready / claimed |
| **CompareBadge** | `GearCompare` | ▲/▼/= stat delta vs equipped | upgrade / downgrade / sidegrade / new |
| **TierBadge** | (inline today) | Rarity/tier chip (color + label) | per rarity/tier |
| **ProgressRing** | from `TrophyRoom` | Circular % completion | 0–100 |
| **RewardChip** | (inline strings today) | "+120 🪙 · +40 XP" reward line | gold / xp / dust / mushrooms / item |
| **Celebration** | `juice/Celebration` | Pop/confetti on notable results | small / big / epic |

### New patterns to add
| Pattern | Component | Purpose | Notes |
|---|---|---|---|
| **StatBar** | `ui/StatBar` | Labeled bar: XP, HP, boss HP, tier progress | value/max, color token, optional ticks |
| **StatRow** | `ui/StatRow` | One attribute/derived stat: icon, label, base (+bonus) | primary-stat highlight, tooltip on the source of the bonus |
| **ItemChip** | `ui/ItemChip` | Compact item: sprite + rarity-colored name + bonuses | the atom of every shop/bag/slot list |
| **ItemTooltip** | `ui/ItemTooltip` | Hover/tap popover: full stats, value, **CompareBadge**, actions | the universal "what is this + what would it do" — extends GearCompare |
| **SlotFrame** | `ui/SlotFrame` | A single equipment socket (filled or empty ghost icon) | drop target; opens ItemTooltip on hover |
| **PaperDoll** | `ui/PaperDoll` | Hero portrait + equipment slots arranged around it | the heart of the Character screen |
| **Backpack** | `ui/Backpack` | Fixed grid of inventory slots (ItemChips) | empty cells rendered, so it reads as a bag |
| **StatBlock** | `ui/StatBlock` | Attribute list + derived stats (HP/damage/crit/armor) | consumes StatRow; one source of truth for "your numbers" |
| **RewardChip** | `ui/RewardChip` | (promote to shared) render any reward tuple with sprites | replaces the ad-hoc reward strings/helpers |
| **ModalOverlay** | `ui/ModalOverlay` | Backdrop + centered card + a11y focus trap | extracted from BattleReport; reused by tooltips-on-mobile, confirmations |
| **EmptyState** | `ui/EmptyState` | Friendly "nothing here yet" with an icon + nudge | bag empty, no quests, etc. |
| **TabBar** | `ui/TabBar` | The sticky category nav (already in page) | promote to a pattern; add the Character entry |

**Rule of thumb:** a screen file should read as *composition of patterns* — e.g.
the Character screen is `PaperDoll + StatBlock + Backpack + ItemTooltip`, nothing
bespoke.

---

## 3. Flagship — the Character screen

A dedicated tab (`?tab=character`, 🛡️) that replaces the cramped hero column on
Overview with a real character sheet.

### Layout
```
┌───────────────────────────────────────────────────────────────┐
│  🛡️ SirRunsALot            Lv 12 Warrior   ⚔️ Champion  [guild] │  ← Identity header
│  ██████████████░░░  XP 1,240 / 1,800                            │
├──────────────────────┬────────────────────────────────────────┤
│                      │  ATTRIBUTES                              │
│   [Weapon slot]      │  💪 Strength   45 (+8)  ← class primary  │
│        ╱╲            │  🗡️ Dexterity  22 (+3)                   │
│      ( HERO )        │  📖 Intelligence 14                      │
│     paper-doll       │  🪨 Constitution 30 (+5)                 │
│      portrait        │  🍀 Luck        12 (+2)                  │
│        ╲╱            │  ───────────────────────────────────    │
│  [Armor]   [Amulet]  │  DERIVED                                 │
│                      │  ❤️ Life 806    ⚔️ Damage 27–63          │
│                      │  🎯 Crit 11%    🛡️ Mitigation 9/hit      │
│                      │  ⚡ Strikes first if DEX ≥ foe           │
├──────────────────────┴────────────────────────────────────────┤
│  🎒 Backpack        ⭐ Auto-equip best   [sort: value ▾]        │
│  [▦][▦][▦][▦][▦]  ← ItemChips; hover = ItemTooltip w/ compare  │
│  [▦][▦][ ][ ][ ]                                                │
└───────────────────────────────────────────────────────────────┘
```

### Elements (all from patterns)
- **Identity header** — `GameSprite` class portrait, name, level, class, arena
  `TierBadge`, guild, `StatBar` for XP. (Reuses ProfilePanel's data.)
- **PaperDoll** — the hero portrait centered, the **3 slots framed around it**
  (Weapon top, Armor bottom-left, Amulet bottom-right). Each is a `SlotFrame`:
  filled shows the item `GameSprite`; empty shows a ghosted slot icon.
  *Expansion path:* when we add slots (Head, Hands, Feet, Offhand, Ring, Trinket —
  a schema change), they slot into the same frame with zero layout rework.
- **StatBlock** — attributes (base + gear bonus, class primary highlighted) and
  derived stats from the real formulas:
  - **Life** = `CON × (level+1) × classHpFactor` (`maxHp`)
  - **Damage** = `primaryStat × 0.6 … × 1.4` (from `strike`)
  - **Crit** = `min(50%, 5% + LCK/200)`
  - **Mitigation** = `round(CON × 0.3)` damage soaked per hit
  - **Initiative** = strikes first when `DEX ≥ foe DEX`
  Each `StatRow` gets a tooltip explaining what the stat does.
- **Backpack** — a `Backpack` grid of `ItemChip`s, with the **Auto-equip** button
  (already built) and a **sort** control (by value / by upgrade / by slot).

### Interactions (the "all these interactions" part)
- **Hover any item** (slot or bag) → `ItemTooltip`: full stat lines, sell value,
  a `CompareBadge` vs what's equipped in that slot, and action buttons.
- **Equip** — click an ItemChip's Equip (or drag it onto its SlotFrame). Uses the
  existing `equipItem`; the paper-doll updates and the StatBlock re-computes.
- **Unequip / Sell** — from the tooltip; existing `unequipItem` / `sellItem`.
- **Compare-on-hover in the bag** — every bag item already knows its slot, so the
  tooltip shows the delta immediately (extends today's `GearCompare`).
- **Auto-equip best** — one click, best-in-slot (already shipped).
- **Optional drag-and-drop** (phase 2) — HTML5 DnD from bag → slot; falls back to
  the click Equip everywhere (accessibility + mobile).
- **Celebration** on a meaningful upgrade (equipping a higher-tier piece).

### Data / model notes
- Everything above works with **today's 3-slot model** — no migration needed for
  v1.
- **More slots** (to feel fully S&F) = a follow-up: extend `SLOTS`, add columns to
  `Item.slot`'s allowed values, tune `generateItem`. The PaperDoll/SlotFrame
  patterns are built to absorb this.
- **Potions/consumables & mount/pet buffs** (S&F has these) map onto our existing
  **Pets** and could add a small **consumables** system later — planned, not v1.

---

## 4. Screen plans (all tabs)

Each screen becomes: `Panel`s composed of the patterns above. Priority: **P0**
now, **P1** next, **P2** later.

### 🛡️ Character *(new — P0)*
The flagship above. Extracts the hero/equipment/inventory out of Overview into a
real sheet. New: `PaperDoll`, `StatBlock`, `Backpack`, `ItemTooltip`.

### 🧭 Overview *(P0 — slim it down)*
Becomes a true **dashboard/home**: identity strip, "what to do now" (active quest
`TimerBar`, daily deeds, onboarding checklist), and quick-jump cards to each
screen. The heavy hero panel moves to Character. Patterns: `StatBar`, `TimerBar`,
`RewardChip`, quick-nav cards.

### 🪄 Market & Crafting *(P1)*
Shop + Daily Deal + Forge as a unified store. Every item is an `ItemChip` with the
`ItemTooltip` (compare + buy). Forge uses the same tooltip with reforge/upgrade
actions. Patterns: `ItemChip`, `ItemTooltip`, `RewardChip`, `EmptyState`.

### ⚔️ Battle & Dungeons *(P1)*
Arena + Dungeons + Tower + World Boss. Each foe/boss is a `GameSprite` medallion;
fights already open `BattleReport`. Add an **opponent preview card** (their
paper-doll + power estimate) before you commit. Patterns: `PaperDoll` (compact),
`StatBar` (boss HP), `BattleReport`.

### 🌟 Build *(P1)*
Talents + Skills + Ascension. Talent tree as a node graph of `GameSprite`s with
`ItemTooltip`-style hover explaining each node's effect and cost. Skill loadout as
drag-into-slot (reuse `SlotFrame`). Patterns: `SlotFrame`, `ItemTooltip`,
`ProgressRing`.

### 🏆 Progress *(P2)*
Achievements + Bestiary + Trophies + Rankings + Records + Lore. Grid of
`GameSprite` cards with `ProgressRing`s and completion %. Mostly a pattern reskin
of what's there. Patterns: `ProgressRing`, `TierBadge`, `EmptyState`.

### 🏰 Guild *(P2)*
Guild + Guild Hall + directory. Member rows use the hero `GameSprite` + a mini
`StatBlock` on hover. Hall rooms as upgradeable `Panel`s with `RewardChip` perks.

### 📅 Daily & ⛏️ Idle *(P2)*
Dailies, Season Pass, Bounties / Pit, Wheel, Dice, Fishing, Expeditions. These are
already pattern-friendly; standardize each on `TimerBar` + `RewardChip` +
`GameSprite` and they're done.

---

## 5. Implementation roadmap

**Phase 0 — Pattern foundation** *(enables everything)*
- Extract `ui/ModalOverlay` from BattleReport; add `ui/StatBar`, `ui/StatRow`,
  `ui/ItemChip`, `ui/RewardChip`, `ui/EmptyState`.
- Add derived-stat helpers to `game.ts` (`damageRange`, `critChance`, `mitigation`)
  so the numbers have one source of truth (+ unit tests).

**Phase 1 — Character screen v1** *(the flagship)*
- `ui/SlotFrame`, `ui/PaperDoll`, `ui/StatBlock`, `ui/Backpack`, `ui/ItemTooltip`.
- New `?tab=character` route + tab entry; move hero/equipment/inventory there.
- Hover tooltip w/ compare; equip/unequip/sell from tooltip; auto-equip + sort.
- Verify in-browser, ship.

**Phase 2 — Roll patterns outward**
- Market/Forge → `ItemChip`/`ItemTooltip`. Battle → opponent preview. Build →
  node tooltips + skill slots. One screen per increment, each verified.

**Phase 3 — Depth**
- Optional drag-and-drop. More equipment slots (schema change). Consumables/potions.

**Phase 4 — Polish**
- Motion pass, empty states, a11y audit, mobile spot-checks.

---

## 6. What changes in the codebase

- **New:** `src/components/ui/*` (the pattern library), `src/app` character route
  or a `CharacterScreen` panel, derived-stat helpers + tests in `game.ts`.
- **Refactor (mechanical):** existing panels adopt `ItemChip`/`ItemTooltip`/
  `RewardChip` instead of inline markup — no behavior change, just consistency.
- **No breaking data changes for v1.** Slot expansion / consumables are additive
  migrations in later phases.

**Guiding invariant:** after this, adding a screen means *composing patterns*, and
every item everywhere shows its art + its consequences. That's the whole point.
