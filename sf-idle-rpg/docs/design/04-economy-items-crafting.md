# 04 — Economy, Items & Crafting

> **Status:** ✅ Complete
> **Owner:** Senior Economy Designer · **Milestone focus:** M1–M5 · **Version:** 1.0
> **Depends on:** 03, 06, 08 · **Last updated:** 2026-07-07

**Module summary.** This module owns the canonical currency list, the entire loot
pipeline, item generation, and every gold/premium sink in *Quest & Cudgel*. It
turns the shipped slice — flat-stat items in a per-hero Magic Shop — into a
Diablo/PoE-grade itemization stack: item levels, base types, an affix system
with tiered prefix/suffix pools, set items, hand-authored uniques, smart-loot,
pity protection, and a crafting/forge economy (reroll, upgrade, socket, salvage,
reforge). It is the studio's primary lever on retention *and* the primary risk
surface for inflation, mudflation, and RMT. Everything here is
server-authoritative and every schema change is additive. Combat consumes the
stats we mint (see `03-combat-character-progression.md`); seasons consume our
season currency (`06-endgame-liveops-events.md`); real money never buys power —
that boundary is defined here and honored in `08-onboarding-meta-monetization.md`.

---

## Table of Contents

1. [Canonical Currency System](#1-canonical-currency-system)
2. [Itemization Deep-Dive](#2-itemization-deep-dive)
3. [Loot System](#3-loot-system)
4. [Crafting, Enchanting & Forge](#4-crafting-enchanting--forge)
5. [Shops](#5-shops)
6. [Trading Philosophy: Bind-on-Equip](#6-trading-philosophy-bind-on-equip)
7. [Economy Balance & Health](#7-economy-balance--health)
8. [Progression Pacing](#8-progression-pacing)
9. [Proposed Prisma Models & Server Actions](#9-proposed-prisma-models--server-actions)
10. [Milestone Phasing, Risks & KPIs](#10-milestone-phasing-risks--kpis)

---

## 1. Canonical Currency System

Economy owns the canonical currency list (Master Plan §8). Any module that mints
or burns a currency does it through the wallet contract in §9. There are **four**
tradable-value currencies plus one non-wallet "resource" (sockets/gems are items,
not currency).

### 1.1 The canonical list

| Currency | Key | Tier | Cap | Role | Persistence |
|---|---|---|---|---|---|
| **Gold** | `gold` | Soft | none (BigInt) | Core sink loop: buy/reroll/craft/repair | Permanent |
| **Mushrooms** | `mushrooms` | Premium (honest) | none | Time-skip, convenience, cosmetics, stash | Permanent |
| **Glimmerdust** | `dust` | Crafting (fungible) | 99,999 | Reroll/reforge/upgrade fuel from salvage | Permanent |
| **Runeshards** | `shards` | Crafting (rare) | 9,999 | High-tier reforge, socketing, unique upgrades | Permanent |
| **Crowns** | `season` | Season (soft, resets) | 99,999 | Season-track & season-shop purchases | **Resets each season** |

Design rationale for splitting crafting into two currencies: **Glimmerdust** is
the high-volume "every salvage gives some" fuel that keeps low/mid crafting
frictionless; **Runeshards** are the scarce gate that keeps end-game crafting
*meaningful* and prevents a dust flood from trivializing best-in-slot rolls. This
is the classic ARPG two-tier reagent split (cf. PoE chaos vs. divine, D3
forgotten-souls vs. death's-breath).

Mushrooms are **never** required to obtain or improve power. They buy time and
comfort only — the honest-premium pillar (Master Plan §2.5). Season currency
(**Crowns**) resets at each season rollover; carry-over policy is owned by
`06-endgame-liveops-events.md`. Our contract: Economy exposes `wallet.season` and
a `seasonEpoch` stamp; Live-Ops decides the reset/convert rule (recommended:
unspent Crowns convert to a token of prestige, not to gold, to avoid an
end-of-season gold spike).

### 1.2 Faucets & sinks per currency

**Gold — faucets**

| Faucet | Source | Approx yield (lvl 20 hero) | Cadence |
|---|---|---|---|
| Quest collect | timed quests | 60–420 g/quest (× length mult) | 3–6/day |
| Arena win | PvP duel | 30–90 g | ~throttled by energy |
| Dungeon floor clear | dungeons | 80–300 g + loot | push-limited |
| Item salvage/sell | Magic Shop sell | 50% of item price | per drop |
| Guild vault stipend | guild perk | +2%/member on quest gold, cap +20% | passive |

**Gold — sinks**

| Sink | Cost model | Notes |
|---|---|---|
| Shop purchase | item `price` (see §2.6) | primary early sink |
| Shop reroll | escalating (§5.1) | repeatable, throttled |
| Forge: reroll affix | `f(ilvl, tier)` (§4) | mid/late sink |
| Forge: upgrade (+N) | escalating per plus | late sink, mudflation brake |
| Repair (M3+) | durability model (§7.3) | optional trickle sink |
| Guild founding / hall | 500 g → tiered | social sink |
| Stash tab (gold variant) | escalating | convenience |
| Gamble (Black Market) | fixed per roll | vanity sink |

**Mushrooms — faucets:** rare quest bonus (~3% × length mult), first-clear
dungeon rewards, daily login streak, season-track free lane, achievement payouts.
**Mushroom sinks:** instant-finish quests, shop instant-refresh, extra stash,
loadout slots, cosmetic dyes/skins (all in `08`). No power SKUs.

**Glimmerdust — faucets:** salvage of unwanted items (primary), dungeon caches,
duplicate-unique dust-back. **Sinks:** all low/mid forge operations, socket
carving.

**Runeshards — faucets:** boss first-kills, tower milestones, season-track,
salvaging Epic+/uniques (small amount). **Sinks:** tier-locking a reforge,
re-socketing, unique-tier upgrades, master-work upgrades (+7 and above).

**Crowns — faucets/sinks:** owned by season track (`06`); Economy only provides
the wallet slot and the season shop price list.

### 1.3 Faucet/sink balance table (target model)

The health target is a **faucet/sink ratio near 1.0** for a *mid-core* player at
steady state, drifting slightly >1 for new players (so early progress feels
generous) and slightly <1 for whales-of-time end-gamers (so gold retains value).

| Segment | Daily gold faucet | Daily gold sink (engaged) | Ratio | Intended feel |
|---|---|---|---|---|
| New (lvl 1–15) | ~1,200 g | ~900 g | 1.33 | "I can always afford the next upgrade." |
| Mid (lvl 16–40) | ~6,500 g | ~6,200 g | 1.05 | Tight; choices matter. |
| Late (lvl 41–70) | ~28,000 g | ~30,000 g | 0.93 | Gold is a real constraint; forge is hungry. |
| End (70+ / tower) | ~90,000 g | ~110,000 g | 0.82 | Deep sinks; prestige to reset. |

We deliberately let the **late/end ratio dip below 1** because the forge (§4) is
an elastic, always-available sink whose cost scales super-linearly with item
level. That is the primary anti-inflation valve; §7 details the control loop.

---

## 2. Itemization Deep-Dive

The shipped item is a flat five-stat bag (`strength/dexterity/intelligence/
constitution/luck` + `price`, one of four rarities, one of three slots). We keep
100% backward compatibility: legacy items map to a **base type with zero rolled
affixes**. Everything below is additive.

### 2.1 Item level (ilvl)

Every item carries an **item level** independent of the hero's level. ilvl gates
which affix tiers can roll and scales base stats.

```
ilvl(drop) = clamp( round( sourceLevel + variance ), 1, 100 )
  variance ~ triangular(-2, +3)   // slight upward bias
```

`sourceLevel` = hero level for quests/shop; = `dungeonBaseLevel + floor` for
dungeons; = fixed authored ilvl for boss/season drops. Higher-ilvl bases unlock
higher affix tiers (§2.5). This is the core "chase" axis — a lvl 40 hero still
hunts higher-ilvl versions of the same slot.

### 2.2 Base types per slot

We expand the three shipped slots (`WEAPON`, `ARMOR`, `AMULET`) with **base
types** — the noun already exists in `SLOTS[].nouns`; we promote it to a
first-class `baseType` with an implicit-stat identity. Base types set the item's
*implicit* (guaranteed) stat and its affix-pool bias.

| Slot | Base type | Implicit | Favored stats | Class lean |
|---|---|---|---|---|
| Weapon | Cudgel | +Attack, +STR | STR | Warrior |
| Weapon | War Staff | +Attack, +INT | INT | Mage |
| Weapon | Bow / Dagger | +Attack, +DEX | DEX | Scout |
| Weapon | Sword / Axe / Mace | +Attack, +STR/DEX | STR, DEX | Warrior |
| Armor | Plate / Cuirass | +Armor, +CON | CON, STR | Warrior |
| Armor | Chainmail / Leather | +Armor, +DEX | DEX, CON | Scout |
| Armor | Robe | +Armor, +INT | INT | Mage |
| Amulet | Amulet / Pendant | +% one core stat | LUCK, INT | any |
| Amulet | Ring / Charm | +LUCK | LUCK, DEX | any |

Attack/Armor are combat-derived numbers owned by `03`; Economy stores the
implicit as a typed affix so Combat reads one contract.

**Future slots (M2+, additive):** `HELM`, `GLOVES`, `BOOTS`, `RING2`, `OFFHAND`.
Each adds an `Item.slot` enum value and a `Character` equip mapping row — no
destructive migration.

### 2.3 Rarity tiers

We keep the four shipped rarities and their weights/mults intact, then add two
**item classes** that sit *orthogonal* to rarity (an item is a rarity AND may be
a set/unique). This avoids rarity-tier inflation while giving chase depth.

| Rarity | Mult | Base weight | Affix count (pre+suf) | Color |
|---|---|---|---|---|
| Common | 1.0 | 55 | 0 | `#b99b78` |
| Rare | 1.7 | 30 | 1–2 (max 1+1) | `#4aa3df` |
| Epic | 2.6 | 12 | 2–4 (max 2+2) | `#a55eea` |
| Legendary | 4.0 | 3 | 4–6 (max 3+3) | `#e8b923` |
| *Set* (class) | — | authored | fixed template + set bonus | `#1abc9c` |
| *Unique* (class) | — | authored | hand-tuned + special effect | `#e67e22` |

Weights are the *base* table; smart-loot and magic-find modify them (§3). Note
the shipped code uses these exact mults — we reuse them so the price/budget
formula is unchanged for legacy items.

### 2.4 The affix system

An item's power = **implicit (from base) + rolled affixes**. Affixes are
**prefixes** (offensive/utility) and **suffixes** (defensive/utility), drawn from
slot-appropriate pools. Each affix has a **family** (so we never roll two of the
same family), a **tier** (T1 best → T7 worst), and a rolled value inside the
tier's range.

**Roll procedure (server, deterministic from seed):**

1. Determine rarity → target prefix count `p` and suffix count `s`.
2. For each, weighted-pick an affix family eligible for `slot` and `ilvl`, with
   no family repeats.
3. For the chosen family, pick a **tier** by weight, gated by `ilvl` (higher
   tiers require higher ilvl). Then roll a value uniformly in the tier range,
   quantized to the stat's step.
4. Apply rarity multiplier as a final scalar on flat rolls (keeps legacy budget
   math coherent).

**Tier gating (ilvl → max tier available):**

| ilvl range | Max prefix/suffix tier unlocked |
|---|---|
| 1–9 | T7–T6 |
| 10–24 | T6–T5 |
| 25–44 | T5–T3 |
| 45–69 | T3–T2 |
| 70–100 | T2–T1 |

#### Prefix pool (offensive/utility) — example families

| Family | Affix text | Stat | T7 | T5 | T3 | T1 |
|---|---|---|---|---|---|---|
| Might | "of Might" → *Brutal* | +STR (flat) | 1–2 | 4–7 | 12–18 | 30–44 |
| Precision | *Keen* | +DEX (flat) | 1–2 | 4–7 | 12–18 | 30–44 |
| Sorcery | *Runed* | +INT (flat) | 1–2 | 4–7 | 12–18 | 30–44 |
| Savagery | *Vicious* | +% Attack | 2–4% | 6–9% | 12–16% | 22–30% |
| Fortune | *Lucky* | +LUCK (flat) | 1 | 3–4 | 7–10 | 16–22 |
| Piercing | *Cruel* | +Crit chance | 1% | 2–3% | 4–5% | 7–9% |
| Ferocity | *Wrathful* | +Crit damage | 4–6% | 10–14% | 20–28% | 40–55% |
| Alacrity | *Swift* | +Attack speed | 2% | 4–5% | 7–9% | 12–15% |

#### Suffix pool (defensive/utility) — example families

| Family | Affix text | Stat | T7 | T5 | T3 | T1 |
|---|---|---|---|---|---|---|
| Vigor | "of Vigor" | +CON (flat) | 1–2 | 4–7 | 12–18 | 30–44 |
| Warding | "of Warding" | +Armor % | 2–4% | 6–9% | 12–16% | 22–30% |
| Vitality | "of the Bear" | +Max HP % | 2–3% | 5–7% | 10–13% | 18–24% |
| Aegis | "of Aegis" | +Block/Dodge | 1% | 2–3% | 4–5% | 7–9% |
| Greed | "of Greed" | +% Gold find | 3–5% | 8–12% | 16–22% | 28–38% |
| Insight | "of Insight" | +% XP | 2–3% | 5–7% | 9–12% | 15–20% |
| Fortune | "of Fortune" | +Magic find | 2–3% | 5–7% | 9–12% | 14–18% |
| Recovery | "of Mending" | +HP regen | 1–2 | 4–6 | 9–13 | 18–26 |

**Roll weighting.** Within a family, tiers are weighted so that even at high ilvl
top tiers stay rare — the chase lives in the *tail*.

| Tier | Relative weight (when unlocked) |
|---|---|
| T7 | 40 |
| T6 | 30 |
| T5 | 20 |
| T4 | 14 |
| T3 | 9 |
| T2 | 4 |
| T1 | 1.5 |

A "perfect" item — max affix count, all T1, all high-in-range — is a
~1-in-hundreds-of-thousands event, and *that* is the theorycrafter's endgame
(pillar §2.3). Affix-family selection is also weighted per slot so a Robe leans
INT and a Plate leans CON, matching §2.2.

### 2.5 Named uniques / legendaries (8+ examples)

Uniques are **hand-authored**, fixed-identity items with a **special effect** that
changes how you play, not just a bigger number. They roll inside authored ranges
(so two copies differ slightly, rewarding re-drops) and each carries flavor text
(narrative saturation, Master Plan §6). Special effects are declared as typed
`effectKey`s that Combat (`03`) resolves — Economy owns the item, Combat owns the
math.

| # | Name | Slot | Rolled stats (range) | Special effect (`effectKey`) | Flavor |
|---|---|---|---|---|---|
| 1 | **The Emergency Cudgel** | Weapon (Cudgel) | +STR 20–28, +% Attack 15–22% | `low_hp_crit`: +100% crit chance while below 25% HP | "It only works when you're panicking. So, always." |
| 2 | **Grudgebringer** | Weapon (Axe) | +STR 18–26, +Crit dmg 40–55% | `stacking_rage`: +3% dmg per consecutive round won, resets on loss | "Holds grudges. Settles them alphabetically." |
| 3 | **The Accountant's Ledger** | Amulet (Charm) | +LUCK 14–20, +Gold find 28–38% | `interest`: +1% gold find per 10k unspent gold (cap +25%) | "Wealth attracts wealth. And audits." |
| 4 | **Whisperthread Robe** | Armor (Robe) | +INT 24–34, +Max HP 10–14% | `overflow_int`: 20% of INT also counts as Armor | "Woven from arguments the mage always won." |
| 5 | **Boots of Unfinished Errands** | Boots (M2) | +DEX 16–22, +Attack speed 9–12% | `haste_on_flee`: +50% quest-timer speed after any arena loss (10 min) | "Made for running away with dignity." |
| 6 | **The Coward's Aegis** | Armor (Plate) | +CON 22–30, +Block 6–8% | `turtle`: take 30% less dmg while you haven't attacked this round | "Best defense is a good excuse." |
| 7 | **Pocketful of Spores** | Amulet (Pendant) | +LUCK 10–16 | `mushroom_luck`: +2% chance any faucet also drops 1 🍄 | "Squishy. Lucky. Do not eat." |
| 8 | **Dungeoneer's Bad Map** | Ring (M2) | +DEX 12–18, +Magic find 12–16% | `deeper`: first dungeon floor each day drops as if +3 floors | "You are definitely lost, but profitably." |
| 9 | **The Understudy's Blade** | Weapon (Sword) | +STR/DEX 14–20 | `mimic`: copies the implicit of your equipped Amulet | "Never got the lead role. Learned every line anyway." |
| 10 | **Hangover of the Ancients** | Helm (M2) | +CON 18–26, +HP regen 18–26 | `slow_burn`: -10% XP, +25% gold find | "Legendary night. Regrettable morning." |

**Set items** (M2). Sets are 2–4 pieces sharing a theme; wearing N pieces grants
escalating **set bonuses** resolved by Combat. Sets are the "mid-game aspirational
build" between random rares and chase uniques.

| Set | Pieces | 2-pc bonus | 3-pc bonus | 4-pc bonus |
|---|---|---|---|---|
| **Rat King's Regalia** | Crown, Robe, Ring, Charm | +10% Gold find | +5% all stats | Killing a floor boss spawns a "tax collector" bonus-gold event |
| **Cudgel & Board** | Cudgel, Plate | +8% Attack | — | +15% dmg while at full HP |
| **Spore Symbiote** | Amulet, Ring, Boots | +5% Magic find | +8% Magic find | Every 10th drop is upgraded one rarity |

Set bonuses use the same `effectKey` registry as uniques, so Combat resolves one
contract and Economy stays pure inventory/data.

### 2.6 Price formula (unchanged core, extended)

We keep the shipped price math and extend it for affixes so legacy items reprice
identically:

```
price = round( (8 + totalStatBudget * 9) * rarityMult ) + ilvl * 3
        + affixPremium
affixPremium = Σ over affixes of  tierWeightInverse * 6
sellValue    = max(1, round(price * 0.5))     // shipped 50% rule kept
salvageDust  = round( ilvl * rarityMult * 0.8 ) + affixCount * 2
```

`totalStatBudget` for a rolled item is the sum of flat-stat affix values (percent
affixes convert via a fixed coefficient table so they price fairly). The 50% sell
rule and `ilvl*3` term are inherited verbatim from `game.ts` so no repricing
migration is needed.

---

## 3. Loot System

### 3.1 Drop sources

| Source | Frequency | ilvl basis | Rarity bias | Notes |
|---|---|---|---|---|
| Magic Shop stock | 4 items, on reroll | hero level | base table | deterministic per-hero seed |
| Quest reward | 1 roll on collect | hero level | base + length mult | longer quests = better bias |
| Dungeon floor | 1 guaranteed + boss bonus | dungeon+floor | +floor magic-find | main power faucet |
| Boss first-kill | authored | fixed | guaranteed Epic+ | pity-immune, one-time |
| Arena win streak | milestone | hero level | small bias | anti-farm capped |
| Season track | authored | scaling | authored | owned by `06` |
| Black Market gamble | on purchase | hero+random | flat high-variance | vanity sink (§5.3) |

### 3.2 Drop-rate tables

**Base rarity by content difficulty** (before magic-find):

| Content | Common | Rare | Epic | Legendary |
|---|---|---|---|---|
| Shop / early quest | 55% | 30% | 12% | 3% |
| Dungeon floor 1–5 | 45% | 35% | 16% | 4% |
| Dungeon floor 6–10 | 30% | 40% | 24% | 6% |
| Floor boss | 10% | 40% | 40% | 10% |
| Tower (M3, per 5 floors) | 5% | 35% | 45% | 15% |
| Boss first-kill | — | — | 70% | 30% |

**Unique/set drop chance** (independent roll on any Epic+ drop):

| Content | P(item is Unique) | P(item is Set) |
|---|---|---|
| Dungeon floor | 0.4% | 1.2% |
| Floor boss | 2.5% | 5% |
| Tower milestone | 4% | 8% |
| Season boss | authored guaranteed on first clear | — |

**Magic-find (MF) math.** MF (from `Fortune`/`Greed` affixes, LUCK stat, and
consumables) shifts the *rarity roll upward*, never adds items:

```
adjustedWeight[r] = baseWeight[r] * (1 + MF * rarityShiftCoeff[r])
rarityShiftCoeff = { Common: -0.4, Rare: +0.1, Epic: +0.6, Legendary: +1.4 }
MF = 0.01 * (luck + Σ magicFindAffixes)      // soft-capped at MF = 3.0
```

LUCK therefore has a real, legible loot role (pillar §2.3: "chase" stat) without
letting stacked MF trivialize Legendaries — the soft cap and the Common penalty
keep the tail rare.

### 3.3 Smart-loot vs pure RNG

Fully random loot in a class-based game produces a river of useless drops
(mudflation of *attention*, not power). We use **hybrid smart-loot**:

- **Shop & gamble:** pure RNG (the shop is where you *choose*; randomness is the
  product). Reroll gives agency.
- **Quest & dungeon drops:** **smart-loot** — the affix-family selection is
  weighted 65% toward the hero's class-favored stats (STR for Warrior, INT for
  Mage, DEX for Scout) and toward slots the hero hasn't upgraded recently. The
  remaining 35% stays open so off-class and experimental drops still happen (keeps
  trading-free economy from feeling deterministic; see §6).
- **Boss/season:** authored tables (designer-controlled pacing).

Smart-loot bias is a server constant `SMARTLOOT_CLASS_BIAS = 0.65`; tuning it is a
live lever.

### 3.4 Pity / bad-luck protection

Two independent pity systems, both server-side counters on the character:

**A. Epic+ pity (dungeon/quest).** A counter increments on every drop that is not
Epic-or-better and resets when one drops. At counter ≥ threshold, the next drop's
Epic+ chance ramps:

| Drops since last Epic+ | Bonus Epic+ chance |
|---|---|
| 0–19 | +0% |
| 20–34 | +2% per drop over 20 |
| 35–49 | +5% per drop over 35 |
| 50 (hard pity) | next drop is guaranteed Epic+ |

**B. Unique pity (boss/tower).** A "shard meter" fills on each eligible boss/tower
reward; at 100% the next such reward is a *guaranteed* Unique (rolled from the
content-appropriate pool). Meter fills faster on higher difficulty. This gives
the theorycrafter a *worst-case bound* on a target unique's grind (~40–60 boss
kills) without removing the joy of an early lucky drop.

Both counters are stored fields (§9), never client-visible as exact numbers early
(readable-depth, Master Plan §6) — surfaced as a "luck is turning…" hint in
mid-game and as an exact meter for uniques in end-game.

---

## 4. Crafting, Enchanting & Forge

The **Forge** is the elastic sink that keeps gold and dust valuable at every level
and lets players *fix* a great base with a bad roll — closing the frustration gap
that pure-RNG ARPGs suffer. All operations are server-transactions, additive to
the schema, and deterministic from a stored seed for auditability.

### 4.1 Operation menu

| Operation | Inputs | Effect | Reversible? |
|---|---|---|---|
| **Reroll affix** | gold + dust | reroll ONE affix's value within its current tier | no |
| **Reforge** | gold + dust + (shards for tier-lock) | reroll all affixes (rarity-appropriate count) | no |
| **Upgrade (+N)** | gold + dust (+shards ≥+7) | +2% all rolled stats per plus, up to +10 | no |
| **Socket** | shards | carve 1 socket (max 2 wpn/armor, 1 amulet) | no |
| **Gem in/out** | dust to insert, shards to extract intact | slot a gem for a flat/`%` bonus | extract w/ shards |
| **Salvage** | item | destroy → dust (+shards if Epic+) | n/a |
| **Transmute** | 3 same-rarity items + dust | 1 item of next rarity up (random base) | n/a |
| **Imbue affix** | shards + gold | add ONE affix to an item below its rarity cap | no |
| **Master-work (+7…+10)** | shards + gold (steep) | high-plus upgrade, small brick risk (§4.4) | no |

### 4.2 Cost formulas

Costs scale with ilvl and target tier so the forge stays hungry into the endgame
(the §1.3 anti-inflation valve):

```
rerollAffixGold  = round( 25 * ilvl * (1 + tierIndexInverse * 0.4) )
rerollAffixDust  = round(  4 * ilvl^0.9 )

reforgeGold      = round( 90 * ilvl * rarityMult )
reforgeDust      = round( 12 * ilvl )
reforgeShards    = tierLocked ? ceil(ilvl / 12) : 0     // lock keeps min tier

upgradeGold(n)   = round( 40 * ilvl * (1.6 ^ (n-1)) )   // n = target plus
upgradeDust(n)   = round(  8 * ilvl * (1.35 ^ (n-1)) )
upgradeShards(n) = n >= 7 ? (n - 6) * ceil(ilvl / 10) : 0

socketShards     = 2 + floor(ilvl / 20)
imbueShards      = 3 + floor(ilvl / 15)
```

**Worked example (ilvl 45 Epic, rarityMult 2.6):**
- Reforge (no lock): `90*45*2.6 ≈ 10,530 g` + `540 dust`.
- Upgrade +1: `40*45 ≈ 1,800 g` + `360 dust`; +5 target: `40*45*1.6^4 ≈ 11,800 g`
  + `~1,200 dust`; +8: adds `2*ceil(45/10)=10 shards`.

The `1.6^n` upgrade curve means going +5→+10 costs an order of magnitude more than
+1→+5 — a deep late sink that's *optional*, so it never gates progression, it just
absorbs surplus gold from the whales-of-time (§7).

### 4.3 Gems

Gems are craftable/droppable items (not currency) that slot into sockets. Three
families × five grades; combine 3-of-a-grade + dust → next grade (a mini dust
sink).

| Gem | Bonus (Grade 1 → 5) | Slot pref |
|---|---|---|
| **Ruby** | +STR/Attack: +3 → +30 | weapon |
| **Sapphire** | +CON/Armor%: +2% → +14% | armor |
| **Topaz** | +LUCK/Magic-find: +2 → +18 | amulet |

### 4.4 Outcome design & brick protection

- Reroll/reforge outcomes are **always valid items** — no "bricking" below +7.
- **Master-work (+7…+10)** carries a small failure chance (**8%/12%/18%/25%** at
  +7/+8/+9/+10). On failure the item is *not* destroyed — it drops to `+`(N-1) and
  refunds 50% shards. This preserves the high-stakes forge fantasy without the
  rage-quit of a total brick (respect-the-player pillar, Master Plan §2.5).
- A cheap **Forge Insurance** consumable (mushrooms, from `08`) can waive one
  failure — a *convenience* purchase, not power. That's the exact premium boundary.

### 4.5 Salvage → dust economy

Salvage is the loop that funds crafting and clears inventory. Dust-per-salvage
(from §2.6) is tuned so that a mid player who salvages ~70% of drops earns enough
dust to reroll ~1 affix/day and reforge ~1 item/week — dust is *plentiful*, shards
are *precious*. Duplicate uniques salvage into a chunk of shards + a "unique
essence" used to reroll that unique's rolls (turns the pity re-drop into an
upgrade, not a dead item).

---

## 5. Shops

### 5.1 Magic Shop (per-hero) — reroll economics

The shipped Magic Shop rerolls **free**. That is an inflation leak (free
re-rolls = free access to the best RNG). We convert it to a **throttled + priced**
reroll:

- **Free daily rerolls:** 3/day (generous, new-player friendly).
- **Beyond free:** escalating gold cost, resets daily.

```
rerollCost(k) = 0                       for k <= 3   (free)
              = round(50 * 1.7^(k-4))   for k > 3    // k = today's reroll index
```

| Reroll # today | Cost |
|---|---|
| 1–3 | free |
| 4 | 50 g |
| 5 | 85 g |
| 6 | 145 g |
| 7 | 245 g |
| 8 | 415 g |

- **Instant-refresh (premium):** 1 mushroom skips the throttle (convenience, from
  `08`) — never better odds, just faster.
- Shop **guarantees** at least one item ≥ Rare and one item of the hero's class
  slot after level 5 (smart-loot floor), so a reroll always feels worth it.

### 5.2 Guild Shop (M2)

Unlocked by guild hall tier (social sink loop with `05`). Stocks items priced in
**gold + a guild contribution token** (earned by donating to the guild vault).
Guild shop stock is **shared and rotating** (weekly), higher average ilvl than the
personal shop, and includes exclusive guild **set pieces** (Rat King's Regalia,
§2.5). This gives guilds an economic reason to exist beyond the leaderboard.

### 5.3 Black Market / Wandering Merchant (M2)

A **time-limited** merchant that appears on a schedule (owned by `06`'s event
calendar; Economy provides the stock generator). Two functions:

1. **Gamble stall:** buy an *unidentified* item for a fixed gold price scaled to
   hero level; rarity/affixes revealed on purchase (pure RNG, high variance). A
   pure vanity gold sink with a dopamine spike — capped at N buys/visit to bound
   the sink and prevent gold-laundering exploits.
2. **Curiosities:** rotating stock of dust/shard bundles (gold→crafting-currency
   conversion at a *deliberately poor* rate, so it's a convenience, not the
   primary shard faucet), and cosmetic-only vanity items.

### 5.4 Premium store boundary

The premium store (mushroom SKUs) is **owned by `08-onboarding-meta-monetization
.md`**. Economy defines the hard boundary:

> **Mushrooms may buy: time (instant finish/refresh), space (stash/loadouts),
> comfort (forge insurance, auto-salvage filters), and cosmetics (skins, dyes,
> pet, name flair). Mushrooms may NEVER buy: items with rolled power, gold
> directly, dust, shards, affix rerolls, magic-find, or drop-rate boosts.**

Any SKU proposal from `08` is validated against this list. This is the honest-
monetization pillar rendered as an enforceable rule, and it is the single most
important line in this document for long-term trust and revenue health.

---

## 6. Trading Philosophy: Bind-on-Equip

**Decision: no player-to-player trading and no auction house. All dropped/crafted
gear is Bind-on-Equip (BoE); anything you improve at the Forge or equip becomes
Bind-on-Account (BoA).**

### 6.1 Why (justification)

1. **RMT & dupe surface collapses to near-zero.** No trade = no gold-selling
   market, no item-selling market, no dupe-laundering path. The single biggest
   economy-integrity risk in F2P ARPGs is removed by construction, not by
   policing.
2. **The game is async and solo-first** (Master Plan §2.4). An AH would create a
   "check the market" meta-loop that competes with the 2–5 min session shape and
   punishes non-market players — the opposite of respect-the-player.
3. **Loot stays personal and meaningful.** Smart-loot (§3.3) + pity (§3.4) +
   forge (§4) already guarantee reliable self-progression, so BoE doesn't create a
   feels-bad wall — every player can *craft* their way to a target, which is more
   satisfying than *buying* it.
4. **Deflationary pressure is controllable.** With no secondary market, the only
   gold sinks are the ones we design (§1.2), so the §7 control loop actually works
   — an AH would inject an uncontrollable player-driven price layer.

### 6.2 What we allow instead (social value without trade)

- **Guild vault:** members donate *gold and dust* (fungible, not items) to fund
  the guild shop and hall — social generosity without item-trade abuse (with `05`).
- **Gifting cosmetics:** mushroom-store cosmetics can be gifted (revenue-positive,
  power-neutral, from `08`).
- **Loot ghosts:** you see *what* rivals dropped (bragging), never trade for it.

### 6.3 Residual anti-abuse (even without trade)

Because there's no trade, most vectors vanish, but we still enforce:
- **Server-authoritative everything** (Master Plan §8; every roll seeded & logged).
- **Idempotent, transactional currency ops** (§9) — no double-spend/double-grant.
- **Rate limits** on reroll/forge/gamble to bound bot value extraction.
- **Anomaly telemetry** (§7.4): flag accounts whose faucet/sink profile is
  statistically impossible (bot/exploit detection), handed to Tech (`09`).
- **Reversible ledger:** every mint/burn is an append-only `LedgerEntry` (§9) so
  an exploit can be *unwound* by replay, not by guesswork.

---

## 7. Economy Balance & Health

### 7.1 Sink design principles

1. **Always-available elastic sink.** The Forge (§4) has no cap and super-linear
   cost — it absorbs any amount of surplus gold/dust from the most engaged
   players. This is the primary inflation valve.
2. **Recurring small sinks** (shop reroll beyond free, gamble, repair) catch the
   mid-core trickle.
3. **One-time large sinks** (guild hall, stash, high-plus master-work) catch
   burst wealth.
4. **Every faucet has a matched sink at the same segment** (§1.3 table) so no
   currency is a dead-end hoard.

### 7.2 Inflation control

Sources of inflation and the brake on each:

| Inflation source | Brake |
|---|---|
| Gold faucets scale with level | Forge/upgrade costs scale super-linearly with ilvl (§4.2) |
| Free shop rerolls (shipped) | Converted to throttled + priced (§5.1) |
| Sell-back of drops | 50% sell + salvage-to-dust diverts value out of gold |
| Season currency carry-over | Crowns reset each season (§1.1) |
| Whale-of-time gold hoards | Prestige reset (`03`/`06`) drains gold for permanent bonuses |
| Guild vault accumulation | Guild shop/hall priced to consume it |

Target: **realm-wide gold supply per active player stays within a ±15% band
quarter-over-quarter** (after excluding new-player onboarding grants). If it
drifts up, we widen forge costs / narrow faucets via server constants (no client
patch).

### 7.3 Mudflation control (gear staying relevant)

Mudflation (new gear trivializing old, making the whole loot river feel pointless)
is fought with:
- **ilvl chase within a slot** (§2.1): you always want a *higher-ilvl* version of
  your current item, not a different item — every drop is a potential incremental
  upgrade.
- **Forge investment lock-in:** upgrading/socketing an item makes replacing it a
  *cost decision*, so gear churns deliberately, not on every drop.
- **Set/unique build anchors** (§2.5): builds are defined by chase pieces you keep
  and *improve*, not replace.
- **Durability trickle sink (M3, optional):** high-ilvl gear loses durability in
  content and needs gold repair — a soft recurring gold sink that also gates
  infinite no-cost farming. Kept gentle (never a "your gear broke" wall).

Target KPI: **% of a player's equipped gear replaced per week** should sit around
**15–30%** mid-game (healthy churn) and taper to **<10%** late-game (investment
matters). Too high = drops feel disposable; too low = no chase.

### 7.4 Gold ↔ mushroom exchange stance

**No gold→mushroom or mushroom→gold exchange, ever.** A one-way premium→soft pump
is a disguised P2W power buy (mushrooms → gold → forge power) and violates the §5.4
boundary. A soft→premium exchange devalues honest premium purchases and invites
gold-farming RMT. The currencies stay **hermetically separate**; the only bridge
is *time* (mushrooms skip timers that would have earned gold — which the player
could always have earned by waiting). This is a firm design line, not a tuning
knob.

### 7.5 Live economy dashboards & telemetry

Economy ships an internal telemetry contract (data owned by Tech `09`,
definitions owned here). Every mint/burn writes a `LedgerEntry` (§9) tagged with
`reason`; dashboards aggregate:

| Dashboard | Metric | Alert threshold |
|---|---|---|
| Faucet/Sink | gold in vs out per segment, rolling 7d | ratio outside 0.8–1.35 for a segment |
| Supply | median & p90 gold per active player | ±15% QoQ drift |
| Sink participation | % DAU using each sink | any core sink <20% DAU |
| Gear churn | % equipped gear replaced/week | outside 10–30% band |
| Forge health | forge ops/DAU, gold+dust+shard burn | shard faucet/sink imbalance |
| Loot integrity | rarity distribution vs. target table | >2σ deviation → exploit flag |
| MF distribution | MF stat spread across population | runaway MF stacking |
| Anomaly | per-account faucet/sink z-score | bot/exploit detection → `09` |

All aggregations run off the append-only ledger, so numbers are auditable and any
exploit is replay-reversible (§6.3).

---

## 8. Progression Pacing

### 8.1 Time-to-upgrade curves

"Time-to-upgrade" = expected active time to meaningfully improve one equipped
slot (a drop or craft that beats current by >5% slot power).

| Segment | Level | Slot power ≈ | Time-to-upgrade (per slot) | Primary route |
|---|---|---|---|---|
| Early | 1–15 | 10–80 | 5–15 min | shop buy, quest drop |
| Mid | 16–40 | 80–500 | 1–3 hrs active | dungeon farm + reroll |
| Late | 41–70 | 500–3,000 | 1–3 days | boss farm + reforge/upgrade |
| End | 70+ / tower | 3,000+ | 1–2 weeks / prestige cycle | tower, pity uniques, master-work |

The curve is intentionally **exponential** in required effort and **logarithmic**
in felt power gain — the S&F/idle contract: fast, juicy early wins that stretch
into deep, deliberate late-game chases (pillars §2.3, §2.5). Every segment always
has a *purchasable* incremental upgrade (shop/forge) so a player is never fully
blocked on RNG.

### 8.2 How gear churns

- **Early:** near-total churn — you replace items every session, everything is an
  upgrade. Loot river feels like a firehose (dopamine onboarding).
- **Mid:** selective churn (~15–30%/week). You keep good bases and *reroll* them;
  you replace on a higher-ilvl or better-affix drop. Smart-loot keeps drops
  relevant.
- **Late:** investment churn. You've forged/socketed key pieces; replacing one is
  a gold+shard decision. You chase T1 affixes and set/unique completions.
- **End/prestige:** deliberate rebuild. Prestige (owned by `03`/`06`) resets level
  and drains gold for permanent multipliers, restarting the churn at a higher
  power floor — the "reasons to stay" engine (Master Plan §7, M3).

### 8.3 Sample "first two weeks" pacing (retention spine)

| Day | Milestone | Economy beat |
|---|---|---|
| 1 | first Rare | shop buy with starting gold; first salvage |
| 2 | first dungeon clear | first Epic drop; unlock salvage→dust |
| 3–4 | first reroll | teach the forge on a Rare |
| 5–7 | first Legendary or Set piece | pity nudge; guild shop teaser |
| 8–14 | first +5 upgrade / first Unique | forge becomes the daily loop; season track intro (`06`) |

---

## 9. Proposed Prisma Models & Server Actions

All additive. Existing `Item` gains nullable columns (legacy rows read as
zero-affix, unsocketed, unbound). A `Wallet` is introduced without touching the
`Character.gold/mushrooms` columns (they become the source-of-truth mirror the
wallet writes through, so no destructive migration).

### 9.1 Schema (Prisma 7, additive)

```prisma
/// Canonical multi-currency wallet. One per character. The wallet is the ONLY
/// writer of currency; gold/mushrooms mirror Character columns during migration.
model Wallet {
  id          String   @id @default(cuid())
  character   Character @relation(fields: [characterId], references: [id], onDelete: Cascade)
  characterId String   @unique
  gold        BigInt   @default(0)
  mushrooms   Int      @default(0)
  dust        Int      @default(0)   // Glimmerdust
  shards      Int      @default(0)   // Runeshards
  season      Int      @default(0)   // Crowns
  seasonEpoch Int      @default(0)   // stamp for reset detection (owned by 06)
  updatedAt   DateTime @updatedAt
}

/// Append-only economic ledger: every mint/burn. Enables auditing, anomaly
/// detection, and exploit reversal by replay. Never updated, only inserted.
model LedgerEntry {
  id          String   @id @default(cuid())
  characterId String
  currency    String   // gold | mushrooms | dust | shards | season
  delta       BigInt   // +mint / -burn
  reason      String   // QUEST_REWARD | SHOP_BUY | FORGE_REFORGE | SALVAGE ...
  balanceAfter BigInt
  refId       String?  // idempotency key (action id) — unique per logical op
  createdAt   DateTime @default(now())
  @@index([characterId, currency, createdAt])
  @@unique([refId])   // idempotency guard: an op can post its ledger once
}

/// Additive columns on the existing Item model.
model Item {
  // ... existing fields unchanged ...
  ilvl        Int      @default(1)
  baseType    String?  // "Cudgel" | "Robe" | ...
  uniqueKey   String?  // set for named uniques (links effect + flavor)
  setKey      String?  // set membership
  plus        Int      @default(0)     // upgrade level 0..10
  bound       String   @default("NONE") // NONE | BOE | BOA
  sockets     Int      @default(0)
  affixes     ItemAffix[]
  socketedGems Gem[]
}

/// One rolled affix on an item. Family+tier+value; percent stored as basis pts.
model ItemAffix {
  id        String  @id @default(cuid())
  item      Item    @relation(fields: [itemId], references: [id], onDelete: Cascade)
  itemId    String
  kind      String  // PREFIX | SUFFIX | IMPLICIT
  family    String  // MIGHT | WARDING | GREED ...
  tier      Int     // 1(best)..7
  value     Int     // flat value, or basis points for % affixes
  isPercent Boolean @default(false)
  @@index([itemId])
}

model Gem {
  id      String @id @default(cuid())
  itemId  String?  // null = in inventory
  family  String   // RUBY | SAPPHIRE | TOPAZ
  grade   Int      // 1..5
}

/// Pity counters (server-only, additive on Character via 1:1).
model LootPity {
  id            String @id @default(cuid())
  characterId   String @unique
  sinceEpicPlus Int    @default(0)
  uniqueMeter   Int    @default(0)  // 0..100
}
```

### 9.2 Server action shapes

All actions are server-only, wrapped in `prisma.$transaction`, idempotent via a
`refId`, and return a discriminated result. Currency mutation goes through a
single `applyWalletDelta` helper that also writes the `LedgerEntry` atomically.

```ts
type EconResult<T> =
  | { ok: true; data: T; wallet: WalletSnapshot }
  | { ok: false; code: 'INSUFFICIENT_FUNDS' | 'RATE_LIMITED' | 'INVALID' | 'BOUND'; message: string };

// Core wallet primitive — the ONLY currency writer. Atomic mint/burn + ledger.
applyWalletDelta(tx, characterId, deltas: Partial<Record<Currency, bigint>>, reason: string, refId: string): void

// Loot
rollLoot(source: LootSource, ctx): EconResult<ItemDraft>          // seeded, applies smart-loot + pity
salvageItem(itemId): EconResult<{ dust: number; shards: number }>

// Shop
refreshShop(): EconResult<ItemDraft[]>                            // throttled + priced (§5.1)
buyItem(itemId): EconResult<{ item: Item }>                       // BoE assign
sellItem(itemId): EconResult<{ gold: number }>                    // 50% (shipped)

// Forge
rerollAffix(itemId, affixId): EconResult<{ item: Item }>
reforgeItem(itemId, opts:{tierLock?:boolean}): EconResult<{ item: Item }>
upgradeItem(itemId, targetPlus): EconResult<{ item: Item; bricked?: boolean }>
socketItem(itemId): EconResult<{ item: Item }>
setGem(itemId, gemId, action:'IN'|'OUT'): EconResult<{ item: Item }>
transmute(itemIds:[string,string,string]): EconResult<{ item: Item }>
imbueAffix(itemId, family): EconResult<{ item: Item }>
```

Every action: (1) re-reads authoritative state in-tx, (2) checks funds/bounds/rate
limit, (3) mutates + posts ledger via `applyWalletDelta`, (4) returns a fresh
`WalletSnapshot`. The client renders optimistically and reconciles (Master Plan
§6, performance). Item bind flips to `BOE` on assign and `BOA` on equip/forge.

---

## 10. Milestone Phasing, Risks & KPIs

### 10.1 Phasing (M1 → M5)

| Milestone | Economy deliverables |
|---|---|
| **M1 — Foundation** | Postgres migration of Item/Character; introduce `Wallet` + `LedgerEntry` (mirror gold/mushrooms); add `ilvl` + `baseType` to items; convert shop reroll to throttled+priced (§5.1); telemetry ledger live. **No new player-facing systems** — just durable, auditable foundations. |
| **M2 — Depth** | Ship the affix system (`ItemAffix`, pools, tiers); the Forge (reroll/reforge/upgrade/salvage→dust); Glimmerdust; smart-loot + Epic pity; Guild Shop; gems/sockets; sets. This is the module's headline milestone. |
| **M3 — Endgame** | Runeshards + high-tier reforge/master-work; Unique pity meter; tower loot tables & season currency (Crowns) wallet slot; Black Market/Wandering Merchant; durability sink; prestige gold drain hook. |
| **M4 — Launch** | Anti-abuse hardening (rate limits, anomaly z-scores to `09`); full economy dashboards; premium-store boundary enforcement gate for `08` SKUs; balance pass against live M3 telemetry. |
| **M5 — Live** | Seasonal affix/unique rotations; economy tuning cadence via server constants; new base types/sets as content; ongoing inflation-band defense. |

### 10.2 Dependencies

- **`03` Combat:** consumes stats/implicits and resolves every `effectKey`
  (uniques, sets, gems). Economy mints, Combat computes. Progression curves in §8
  must stay aligned with `03`'s stat→power curve (shared spine, Master Plan §8).
- **`06` Live-Ops:** owns season currency reset/carry-over, event schedule for the
  Wandering Merchant, tower/season loot table authoring cadence.
- **`08` Monetization:** all mushroom SKUs; validated against the §5.4 boundary.
- **`09` Tech:** owns migrations, hosts the ledger/telemetry pipeline, receives
  anomaly flags.

### 10.3 Risks & mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **Gold inflation** (faucets outrun sinks) | High | Elastic super-linear Forge sink (§4.2); ±15% supply band alerting (§7.2); server-constant tuning, no client patch |
| **Mudflation** (loot feels pointless) | High | ilvl chase + forge lock-in + set/unique anchors (§7.3); churn KPI band |
| **RMT / dupes** | High | BoE/BoA removes the market entirely (§6); append-only reversible ledger; idempotent tx |
| **Premium-power creep** | High | Hard §5.4 boundary; SKU validation gate at M4 |
| **Crafting-currency flood** (dust trivializes chase) | Med | Two-tier dust/shard split (§1.1); shards gate top rolls |
| **Pity gaming** (bots farm hard-pity) | Med | Rate limits; pity thresholds tuned for humans; anomaly telemetry |
| **Reforge frustration** (feels-bad rolls) | Med | Tier-lock reforge; no brick <+7; 50% shard refund on master-work fail (§4.4) |
| **Complexity overwhelm** (readable depth) | Med | Progressive disclosure: FTUE hides affixes/pity numbers; forge unlocks at first Epic (Master Plan §6) |

### 10.4 KPIs (what this module moves)

**Primary (economy health):**
- **Faucet/sink gold ratio** per segment — target bands in §1.3 (0.8–1.35).
- **Gold supply drift** — within ±15% QoQ per active player (§7.2).
- **% equipped gear replaced/week** — 15–30% mid, <10% late (§7.3).
- **Sink participation** — ≥20% DAU using the Forge; ≥40% DAU using the shop.

**Secondary (depth & engagement):**
- Time-to-first-Epic (target < day 2), time-to-first-forge (< day 3).
- Forge ops per DAU; dust/shard faucet-sink balance.
- Loot rarity distribution within 2σ of target tables (integrity).
- Unique/set completion rate across the population (chase engagement).

**Guardrail (trust & business):**
- Zero power-for-mushroom SKUs shipped (boundary compliance).
- RMT/dupe incident count at ~0 (BoE structural guarantee).
- Refund/complaint rate near zero on economy-related purchases (Master Plan §9).

---

*End of Module 04. Economy owns the canonical currency list and every sink; it
cross-references `03` for stat resolution, `06` for seasons/events, and `08` for
premium SKUs. Server-authoritative, additive-only, auditable by ledger replay.*
