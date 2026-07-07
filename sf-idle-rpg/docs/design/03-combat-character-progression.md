# 03 — Combat & Character Progression

> **Status:** ✅ Complete
> **Owner:** Senior Systems Designer · **Milestone focus:** M1–M5 · **Version:** 1.0
> **Depends on:** 04, 05, 06 · **Last updated:** 2026-07-07

**Module summary.** This module owns the beating heart of *Quest & Cudgel*: how a
hero fights, how they grow, and how those two loops feed each other for hundreds
of hours. It evolves the shipped `resolveBattle` coin-flip into a deterministic,
seeded, server-authoritative turn engine — initiative, a two-term damage model,
crit tiers, armor and resistances, hit/evasion, and RNG bands — then layers class
identity, auto-resolved active skills, talent trees, and an infinite ascension
spine on top. Every number here is a real formula a TS/Prisma engineer can ship,
every curve has a worked table, and every knob is tuned so a five-minute tapper
and a 3 a.m. theorycrafter play the *same* game at different depths. Economy (04)
owns affixes and gear budgets, PvP/matchmaking (05) owns ladders and fairness,
Endgame (06) owns the season/paragon meta — this doc defines the math they all
plug into and is careful to hand off cleanly rather than duplicate.

---

## Table of Contents

1. [Design goals, constraints & the progression spine](#1-design-goals-constraints--the-progression-spine)
2. [Combat model deep-dive: the turn engine](#2-combat-model-deep-dive-the-turn-engine)
3. [Class identity, fantasy & subclasses](#3-class-identity-fantasy--subclasses)
4. [Active abilities & skills in async combat](#4-active-abilities--skills-in-async-combat)
5. [Talent / skill trees](#5-talent--skill-trees)
6. [Progression curves: XP, levels, stat growth](#6-progression-curves-xp-levels-stat-growth)
7. [Prestige, ascension & paragon endgame](#7-prestige-ascension--paragon-endgame)
8. [Companions & pets](#8-companions--pets)
9. [Power budget & balance framework](#9-power-budget--balance-framework)
10. [Proposed Prisma models & server action shapes](#10-proposed-prisma-models--server-action-shapes)
11. [Milestone phasing, risks & KPIs](#11-milestone-phasing-risks--kpis)
12. [Appendix: constants & tuning tables](#12-appendix-constants--tuning-tables)

---

## 1. Design goals, constraints & the progression spine

### 1.1 What "good combat" means for an async idle-RPG

We never take real-time input during a fight. A battle is a **pure function** the
server evaluates in microseconds and streams back as a log the client *replays*
with juice (see 07). That constraint is a feature: it makes combat perfectly
fair, perfectly reproducible, and perfectly cheat-proof. Our design job is to
make the *inputs* to that function — the build a player assembles between fights —
carry all the drama that a real-time game gets from twitch execution.

Three non-negotiable properties:

- **Deterministic & seeded.** Given `(attacker snapshot, defender snapshot, seed)`
  the outcome is identical on every machine, forever. This enables replays,
  spectating, dispute resolution, and regression-testing balance changes.
- **Server-authoritative.** The client sends *intent* (fight this foe, equip this
  loadout). The server owns every RNG draw, every stat, every result. Matches the
  Master Plan cross-cutting contract.
- **Legible depth.** The FTUE fight uses three numbers (power, HP, crit). By level
  50 the same engine exposes eight interacting systems. Complexity is *revealed*,
  never *front-loaded* (Pillar 3).

### 1.2 The progression spine (this module's slice)

The Master Plan spine is `level → stats → gear → talents → prestige`. This module
owns the **combat-facing** half of every link:

| Link | Player-facing verb | This doc defines | Owned elsewhere |
|------|-------------------|------------------|-----------------|
| Level | "I dinged!" | XP curve, stat growth, level cap | — |
| Stats | "STR or crit?" | stat→combat conversions | — |
| Gear | "upgrade!" | how gear stats enter the engine | affixes, budgets, crafting → **04** |
| Talents | "my build" | trees, nodes, respec | — |
| Skills | "my rotation" | loadouts, cooldowns, triggers | — |
| Prestige | "reborn stronger" | ascension math, paragon | season meta, tower → **06** |

### 1.3 Backwards-compatibility contract

Everything below is **additive**. The shipped `Character` columns
(`strength…luck`, `level`, `experience`) remain the source of truth for base
stats. New systems attach via new tables and new *derived* fields; no destructive
migrations, ever (Master Plan §8). Where a v1.0 formula changes an existing one
(e.g. mitigation), we ship it behind a `combatVersion` integer on the fight
record so old replays still resolve under their original rules.

---

## 2. Combat model deep-dive: the turn engine

### 2.1 Where we start (shipped code)

`resolveBattle` in `src/lib/game.ts` today:

- turn order by raw `dexterity`;
- `strike` = `primary × U(0.6,1.4)`, crit `min(0.5, 0.05 + luck/200)` for ×2,
  then `− defender.constitution × 0.3`, floored at 1;
- 60-turn cap; **winner = whoever has more HP** (a timeout/tie quirk — a slow tank
  can "win" on remaining HP without landing a kill).

It's a fine coin-flip. It has three fatal depth problems: (1) only the primary
stat matters offensively, so gear is a scalar; (2) `Math.random()` is
non-deterministic — no replays, no seeded tests; (3) mitigation is a flat
subtraction that inverts weirdly at scale (a 300-con boss soaks 90 flat, trivial
vs. a 4,000 hit). We replace it with a layered model that keeps the *shape* (fast
to compute, log-friendly, tank-vs-glass-cannon fantasy intact).

### 2.2 The derived-stat layer

Fights never read raw attributes. A **`CombatProfile`** is compiled once per
fighter from `base attributes + gear (04) + talents (§5) + skills (§4) + buffs`,
then frozen for the duration of the battle. This is the single seam where every
system in the spine converges — and the single place to audit power.

```ts
interface CombatProfile {
  name: string; class: CharClass; subclass: SubclassId; level: number;
  maxHp: number;
  attackPower: number;     // scales the damage formula
  spellPower: number;      // for magic-tagged skills; Mage's main lever
  speed: number;           // initiative & extra-turn threshold
  critChance: number;      // 0..0.75 (hard cap)
  critMult: number;        // default 1.5, talent/gear can raise
  armor: number;           // physical mitigation, diminishing
  resist: { fire: number; frost: number; shock: number; poison: number };
  accuracy: number;        // vs. evasion
  evasion: number;         // vs. accuracy
  block: number;           // 0..0.5 flat chance to halve a hit (Warrior lever)
  lifesteal: number;       // 0..0.4 fraction of damage healed
  resources: ResourceState;   // §4
  skills: CompiledSkill[];    // §4
  procs: Proc[];              // §5 triggers
}
```

Stat→profile conversions (v1.0 tuning; all live in `combat/constants.ts`):

| Derived | Formula | Notes |
|---------|---------|-------|
| `attackPower` | `primaryValue × (1 + STR_or_DEX_weapon_scaling)` | primary is class stat |
| `spellPower` | `intelligence × 1.0 + weaponSpellAdd` | Mage skills read this |
| `maxHp` | `round(constitution × (level+1) × hpFactor)` | **unchanged** from ship |
| `speed` | `10 + dexterity × 0.5 + gearSpeed` | see §2.4 |
| `critChance` | `min(0.75, 0.05 + luck/220 + gear/talent)` | was `/200`, cap 0.5 |
| `critMult` | `1.5 + luck/1000 + talents` | crit is now *2 knobs* |
| `armor` | `Σ armor affixes + constitution×0.5` | §2.5 diminishing |
| `resist.X` | `Σ resist affixes` (from 04) | capped 75% |
| `accuracy` | `50 + dexterity×0.8 + level×1.5` | §2.6 |
| `evasion` | `dexterity×0.9 + gear` (Scout ×1.15) | §2.6 |
| `block` | `Σ block affixes` (Warrior talents add) | ≤0.5 |

**Why split `attackPower` / `spellPower`.** It gives Economy two orthogonal gear
axes (physical vs. magical weapons) and makes hybrid builds a real choice instead
of "stack primary." A Mage's staff rolls `spellPower`; a Warrior's axe rolls
`attackPower`; a Scout's bow rolls both at 0.7× so hybrid-scaling skills exist.

### 2.3 The damage formula

A single strike from attacker `A` on defender `D`, for a hit of `basePower`
(usually `A.attackPower` or a skill's `power × A.spellPower`):

```
raw      = basePower × skillCoeff × variance          // variance = seeded U(0.85,1.15)
crit     = seededRoll < A.critChance                  // → raw ×= A.critMult
postMit  = raw × mitigation(D.armor, A.level)         // multiplicative, §2.5
postRes  = postMit × (1 − D.resist[element])          // element = skill tag or 'physical'
final    = max(1, round(postRes × blockRoll(D.block)))// blockRoll = 0.5 if blocked else 1
```

Two deliberate changes from ship: **variance band tightened** from ±40% to ±15%
(RNG should season the fight, not decide it — a tight band makes builds legible
and keeps TTK in its band, §2.9), and **mitigation is multiplicative** so it
scales sanely across 100 levels.

### 2.4 Initiative, speed & extra turns

Turn order is `speed`, not raw dex, with a tiebreak on `(level, luck, seeded
coin)` so identical twins still resolve deterministically.

Beyond first-strike, `speed` grants **extra turns** — the async analogue of
attack-speed in a real-time ARPG and a core Scout fantasy. Each round, a fighter
acts once; additionally, if their `speed` exceeds the opponent's, they bank
`(A.speed − D.speed)` "tempo." When banked tempo crosses `TEMPO_TURN = 100`, they
immediately take a bonus strike and subtract 100. This means a fast Scout can act
twice for every one boss swing without any real-time input — purely a stat
outcome.

```
tempoA += max(0, A.speed - D.speed)
if (tempoA >= 100) { extraStrike(A → D); tempoA -= 100 }
```

### 2.5 Armor & mitigation (diminishing returns)

Replace flat subtraction with a classic diminishing curve keyed to attacker level
(so armor keeps meaning at every tier):

```
mitigation(armor, attackerLevel) = K / (K + armor),  K = 50 + 12 × attackerLevel
damageMultiplier = mitigation                      // 1.0 = no reduction, →0 = immune-ish
reductionPct     = 1 − mitigation = armor / (K + armor)
```

Worked: vs. a level-25 attacker, `K = 350`.

| Armor | Reduction | Feel |
|-------|-----------|------|
| 0 | 0% | naked |
| 100 | 22% | light |
| 350 | 50% | the "soft cap" (armor = K) |
| 700 | 67% | heavy plate |
| 1400 | 80% | dedicated tank; **hard cap 85%** |

The `armor = K` soft-cap point is where each additional point gives the least
marginal value — a natural theorycrafting landmark. Armor only mitigates
`physical`; elemental skills bypass it and are checked against `resist` instead,
which is the entire reason a Mage shreds an armor-stacked Warrior (rock-paper).

### 2.6 Hit, accuracy & evasion

```
hitChance = clamp(0.35, 1.0, 0.85 + (A.accuracy − D.evasion) / 400)
```

Floor 35% (you can always *sometimes* connect — no total lockouts, which feel
awful in an auto-resolver), ceiling 100%. A miss deals 0 and logs a flavored
line. Evasion is a Scout/rogue lever: dodging is *variance you build for*.
Because variance is otherwise tight (§2.3), evasion is the main "swingy" stat and
is intentionally **capped by matchmaking bands in PvP (05)** so a full-dodge build
can't grief the ladder.

### 2.7 Crit tiers

Crit is now two knobs (`critChance`, `critMult`) plus an optional **Overcrit**:
crit chance above the 75% cap converts at `2:1` into bonus `critMult` (+0.01 per
excess point), so Scouts who stack past the cap aren't wasting rolls — the value
bleeds into bigger crits. This is a deliberate anti-feels-bad valve and a
build-defining choice ("cap chance then dump into multi").

### 2.8 Determinism & seeding

The core anti-cheat and replay primitive. Every fight is opened with a seed:

```
seed = hash(attackerId, defenderId, matchNonce, serverSecretEpoch)
rng  = mulberry32(seed)     // tiny, fast, deterministic PRNG in combat/rng.ts
```

All draws (variance, crit, hit, block, proc, extra-turn tiebreak) pull from this
one stream **in a fixed order per strike**. Because the stream is ordered, a fight
is a pure function `f(profileA, profileB, seed) → BattleResult`. We persist the
seed and both profile snapshots, not the log — the log is *recomputable*. This
gives us: free replays, spectating, "why did I lose" audits, and golden-file
balance regression tests (change a constant, diff every canned fight's TTK).

`matchNonce` rotates per match so the same two heroes don't replay an identical
fight; `serverSecretEpoch` keeps seeds unpredictable to clients (they can't
grind for a lucky seed) yet reproducible server-side.

### 2.9 TTK bands (the master tuning target)

Time-to-kill, measured in **rounds**, is our headline balance metric. Targets:

| Context | Target rounds | Why |
|---------|--------------|-----|
| Arena PvP (mirror) | 6–12 | long enough for skills to fire, short enough to watch |
| PvE trash | 2–4 | idle flow, don't bore |
| PvE floor boss | 8–16 | a *fight*, skills matter |
| Raid boss (06) | 20–40 | attrition, cooldown management |

If a build kills in <4 rounds in the arena, skills never fire and depth
collapses — so **round-cap and TTK floors are balance guardrails, not just
flavor**. We tune `basePower`, `maxHp` (via `hpFactor`), and mitigation `K`
together to hold these bands as levels climb (see §9).

### 2.10 Resolving the win condition

We fix the ship quirk. Win priority:

1. Opponent HP ≤ 0 → **kill win** (normal case).
2. Round cap (default 60, raid 150) reached with both alive → **timeout**:
   winner is higher *remaining HP fraction* (`hp/maxHp`), which rewards the
   build that was actually ahead, not the one with a bigger pool. Exact tie →
   attacker-of-record loses (defender's advantage; in PvP this is the *defender*,
   discouraging stall builds). Logged as a "the crowd boos the draw" line.

### 2.11 Worked example — Scout vs. Warrior, level 25

Snapshots (post-gear/talents, illustrative):

| | Scout "Vex" | Warrior "Bruk" |
|---|---|---|
| maxHp | 3,400 | 6,900 |
| attackPower | 520 | 610 |
| speed | 46 | 22 |
| critChance / mult | 0.55 / 1.9 | 0.12 / 1.5 |
| armor | 180 | 720 |
| evasion / accuracy | 300 / 240 | 90 / 210 |
| block | 0 | 0.25 |

Round 1, Vex first (speed 46 > 22). `K = 350`.

- Vex strike: raw `520 × 1.0 × variance(0.97) = 504`. Crit roll `0.31 < 0.55` →
  ×1.9 = **958**. Bruk armor 720 → mitigation `350/(350+720)=0.327` → `313`.
  Physical, no resist. Block roll `0.61 ≥ 0.25` → no block. Hit roll: `0.85 +
  (240−90)/400 = 1.0` → hits. **Bruk 6,900 → 6,587.**
- Vex tempo: `46−22 = 24` banked (24).
- Bruk strike: raw `610 × variance(1.05) = 640`. Crit `0.44 < 0.12`? no. Vex
  armor 180 → `350/530 = 0.66` → `423`. Hit: `0.85+(210−300)/400 = 0.625` →
  roll `0.5 < 0.625` hits. **Vex 3,400 → 2,977.**

After ~5 rounds Vex banks 100 tempo → extra strike. Vex's crit-heavy, evasion
profile out-tempos Bruk's tank; projected kill ~round 9 (inside the 6–12 band).
Flip the matchup by giving Bruk **fire resist gear vs. a fire-Mage** and rock-
paper-scissors reasserts. This is the depth the scalar model couldn't express.

---

## 3. Class identity, fantasy & subclasses

### 3.1 The three pillars, sharpened

Each class keeps its shipped base stats and `hpFactor` but gains a **class-
defining mechanic** — a rule only that class plays with, the thing a build is
*about*.

| Class | Primary | hpFactor | Fantasy | Defining mechanic |
|-------|---------|----------|---------|-------------------|
| **Warrior** ⚔️ | STR | 6 | immovable bruiser | **Rage & Block.** Builds *Rage* by taking and dealing hits; Rage fuels big skills and raises `block`. Rewards long fights — the tank *wins by lasting*. |
| **Mage** 🪄 | INT | 3 | glass artillery | **Mana & Elements.** Skills cost *Mana* and carry elements (fire/frost/shock). Frost slows enemy `speed`; shock chains; fire stacks a burn DoT. Bypasses armor, punished by resist. |
| **Scout** 🏹 | DEX | 4 | tempo assassin | **Combo & Tempo.** Every strike builds *Combo Points*; finishers spend them. High `speed` grants extra turns (§2.4) and Combo generation snowballs. |

The defining mechanic is why two level-50 heroes of the same class can feel
totally different (see archetypes, §5.4) yet a same-class mirror is still a
skill/gear contest, not a stat-check.

### 3.2 Subclasses / specializations

At **level 20** a hero chooses one of two **subclasses** per class (unlockable via
a quest, respec-able for gold+mushrooms). Subclass sets a *scaling identity* and
unlocks a dedicated talent sub-tree branch (§5). Six shipped at M2, room for a
third per class in M5.

| Class | Subclass A | Subclass B |
|-------|-----------|-----------|
| Warrior | **Juggernaut** — armor→damage; the more you mitigate, the harder you hit (`bonusAP = armor×0.1`). Immovable object *and* unstoppable force. | **Berserker** — trades armor for `critMult` and lifesteal; Rage also raises crit. Glass bruiser. |
| Mage | **Pyromancer** — fire/burn DoT specialist; burns crit and spread on kill. DoT is our async "damage over turns" — ticks each round even while the Mage acts. | **Cryomancer** — frost/control; stacks `speed` debuffs and shatter bonuses vs. slowed targets. Turns tempo *off* for the enemy. |
| Scout | **Assassin** — burst finishers, opener bonus vs. full-HP targets; wants short fights. | **Ranger** — sustained multi-strike + a pet (see §8); wants long fights and tempo. |

Subclasses deliberately point at *different TTK bands* (Assassin loves 2–4,
Ranger loves 12+), which is how identical gear budgets produce diverse play.

### 3.3 A note on hybrids

Because gear splits `attackPower`/`spellPower` (§2.2) and some skills scale off a
secondary stat, off-meta hybrids (a STR/INT "Spellblade" Warrior) are *possible*
but pay an efficiency tax — never dominant, always expressive. Guardrails in §9.

---

## 4. Active abilities & skills in async combat

### 4.1 The core idea: rotations without real-time input

The player never taps "cast fireball now." Instead they **author a loadout** — an
ordered list of skills with trigger conditions — and the engine executes it every
fight like a tiny behavior program. This is the same design space as *FF XII*
Gambits or *Path of Exile* triggers, mapped onto our async turns. The *build* is
the gameplay; the fight is the readout.

A hero equips **up to 4 active skills** + **1 ultimate**. Each turn, the engine
walks the loadout top-to-bottom and casts the first skill whose trigger passes,
its cooldown is ready, and its resource is affordable; if none qualify, it does a
basic attack.

### 4.2 Skill anatomy

```ts
interface SkillDef {
  id: string; name: string; class: CharClass | "ANY";
  element: "physical" | "fire" | "frost" | "shock" | "poison";
  cost: { resource: "rage" | "mana" | "combo"; amount: number };
  cooldownRounds: number;          // 0 = every eligible turn
  coeff: number;                    // multiplies attack/spellPower
  scales: "attackPower" | "spellPower";
  effect: SkillEffect[];            // damage, dot, buff, debuff, heal, summon...
  trigger: TriggerDef;              // WHEN the AI fires it
  tags: string[];                   // "finisher","aoe","opener" — talents key off these
}
```

Triggers are a small, readable DSL the player configures with dropdowns (no code):

| Trigger | Fires when | Typical use |
|---------|-----------|-------------|
| `ALWAYS` | any eligible turn | filler nuke |
| `ON_COOLDOWN` | whenever ready | maximize uptime |
| `HP_BELOW(self, x%)` | self HP < x | panic heal / defensive |
| `HP_BELOW(enemy, x%)` | enemy HP < x | execute finisher |
| `RESOURCE_ATLEAST(x)` | resource ≥ x | spend combo/rage dump |
| `FIRST_ROUND` | round 1 | opener burst |
| `EVERY_N(n)` | every nth round | rhythm skills |
| `ON_CRIT` | after you crit | crit-chain payoff |

Ordering + triggers = the rotation. Example Assassin loadout:

1. `Ambush` — `FIRST_ROUND` (opener, +100% vs full HP)
2. `Eviscerate` — `RESOURCE_ATLEAST(5 combo)` (finisher)
3. `Poison Blade` — `EVERY_N(3)` (reapply DoT)
4. basic (implicit filler, builds combo)
5. Ultimate `Death Mark` — `HP_BELOW(enemy, 30%)`

### 4.3 Resources

| Resource | Class | Generation | Spends on |
|----------|-------|-----------|-----------|
| **Rage** | Warrior | +8 dealing a hit, +12 taking one; caps 100 | big strikes, block-up |
| **Mana** | Mage | starts full (`100 + INT×2`), +10/round regen | elemental skills |
| **Combo** | Scout | +1 per basic, +2 per crit; caps 8 | finishers |

Resources make async combat *feel* like a rotation: the Mage front-loads then
paces, the Warrior ramps, the Scout builds-and-spends. Resource generation/cost is
a whole tuning surface for build diversity (a "fast mana" build vs. a "big spender"
build).

### 4.4 Damage-over-time (async DoTs)

DoTs are how we express sustained pressure without real-time ticks. A DoT applies
a **stack** with `damagePerRound`, `rounds`, and `element`; at the *start* of each
round, before actions, all active DoTs tick. This makes fire/poison builds play
differently from burst — you invest a turn now for guaranteed damage over the next
several, which rewards longer TTK bands and punishes overkill. Stacks are capped
(default 5) so DoT builds have a rotation problem (refresh vs. overwrite), not a
stack-to-infinity exploit.

### 4.5 Skill acquisition & ranks

Skills unlock from: class trainers (level-gated), drops (04), and talent nodes
(§5). Each skill has **ranks 1–10**; ranking up costs *skill points* (1/level) and
raises `coeff`. This is a second progression sink parallel to talents, so a level
is worth two decisions (where to spec, what to rank). Rank curve:
`coeff(rank) = base × (1 + 0.12 × (rank−1))` — rank 10 ≈ 2.08× rank 1.

---

## 5. Talent / skill trees

### 5.1 Node types

A per-class tree (unlocked at level 10, 1 point/level + milestone bonuses)
composed of five node kinds — deliberately mixing "quiet math" and "loud
mechanics" so a tree has both optimization and identity:

| Node type | Effect | Example |
|-----------|--------|---------|
| **Stat** (small) | flat/percent derived stat | +2% crit chance |
| **Threshold / Keystone** | build-defining, often a trade-off | "Glass Cannon: +40% damage, −30% maxHp" |
| **Skill unlock** | grants/upgrades an active skill | unlock `Whirlwind` |
| **Proc / Trigger** | passive on-event effect | "on crit, 20% to reset a finisher's CD" |
| **Gateway** | pure connector, cheap, routes the tree | 1-point pathing node |

Keystones are the theorycrafting soul: each is a *sidegrade with a cost*, so
stacking them forces genuine sacrifice (PoE's model). No keystone is universally
correct.

### 5.2 Tree shape

Each class tree has **three branches** radiating from a start node, loosely
themed **Offense / Defense / Utility**, ~40 nodes each, with cross-links so hybrid
pathing is possible but expensive (you pay in gateway points to cross branches).
Subclass choice (§3.2) lights up a dedicated **capstone branch** gated behind 20
points spent in the tree — the reward for commitment.

### 5.3 Sample tree — Warrior (abridged)

```
                    [Warrior Core]
        ┌───────────────┼───────────────┐
   OFFENSE          DEFENSE           UTILITY
   +STR%            +armor%           +Rage gen
     │                │                  │
   Cleave(skill)    Bulwark(+block)    Second Wind(heal proc)
     │                │                  │
  ● BERSERK        ● JUGGERNAUT       Intimidate(-enemy AP)
  keystone:        keystone:          proc: on kill, refund
  "+critMult 0.5,  "armor→AP 0.1,     a cooldown
   lose 30% armor"  can't crit"
     │                │                  │
   Bloodthirst      Immovable          Warcry(party buff→05)
   (lifesteal)      (85% armor cap →   
                     90%)
```

Berserker and Juggernaut keystones are **mutually exclusive in practice** (one
wants armor, one dumps it), which is exactly the fork that creates two Warriors.

### 5.4 Build archetypes (diversity proof)

Six shipped, reachable archetypes at level 50 — each a distinct point in
TTK/risk space, proving the systems produce real variety rather than one meta:

| Archetype | Class/sub | Core loop | TTK band | Weakness |
|-----------|-----------|-----------|----------|----------|
| **Unkillable Wall** | War/Juggernaut | mitigate → armor→AP → outlast | 12–16 | low burst, loses race to DoT |
| **Blood Berserker** | War/Berserker | lifesteal + crit, race | 6–9 | squishy, evasion counters |
| **Burn Pyromancer** | Mage/Pyro | fire DoT + spread | 8–14 | resist gear, frost mirror |
| **Frost Controller** | Mage/Cryo | slow → deny tempo → shatter | 10–16 | fast burst kills before stacks |
| **Burst Assassin** | Scout/Assassin | opener + finisher spike | 2–5 | if target survives opener, falls off |
| **Tempo Ranger** | Scout/Ranger | extra turns + pet + sustain | 10–14 | armor tanks, single-target only |

Rock-paper-scissors is intentional: Assassin > squishy Mage > Wall > Berserker >
Assassin, with Frost/Ranger as tempo-denial answers. **No archetype beats the
field** — a KPI we track (§11).

### 5.5 Respec rules & cost

- **Talents:** respec-able anytime. Cost curve `respecCost(points) = 25 gold ×
  points × (1 + resetsThisWeek)` — cheap early, scales with build size and
  discourages fight-to-fight flip-flopping. First respec each season is free
  (onboarding, encourages experimentation — see 06/08).
- **Skill ranks:** refunded at 100% (they're a grind, not a trap).
- **Subclass:** costs gold + 20 mushrooms; a *deliberate* commitment, not a whim.
- We track **% of players who respec** (target 40%+ by level 30) as the headline
  "is the tree a real decision" KPI. Too low = tree is a false choice; too high =
  no build identity.

---

## 6. Progression curves: XP, levels, stat growth

### 6.1 XP curve

Keep the shipped `xpForLevel(level) = 50·level² + 50·level` (XP to go *from*
`level` to `level+1`). It's a clean quadratic — early levels fly, later levels are
a real climb, matching S&F pacing. Cumulative XP to *reach* level `L`:

```
totalXp(L) = Σ_{k=1}^{L-1} (50k² + 50k)
           = 50·[ (L-1)L(2L-1)/6 + (L-1)L/2 ]
```

| Reach level | XP for this level | Cumulative XP | ~Quests* |
|-------------|-------------------|---------------|----------|
| 2 | 100 | 100 | 3 |
| 10 | 5,500 | 20,850 | ~110 |
| 25 | 32,500 | 288,750 | ~520 |
| 50 | 127,500 | 2,183,750 | ~1,900 |
| 100 | 505,000 | 17,166,750 | ~7,600 |

\*Rough, at that level's average quest XP; the idle layer + dungeons + arena fill
most of it. Economy/Live-Ops (04/06) tune faucets so the *time* to level 50 lands
near the retention target (~4–6 weeks casual).

### 6.2 Level cap

- **M2 launch cap: 50.** Enough for a full tree + subclass capstone.
- **M3: raise to 100** with the tower/season.
- **Beyond 100:** you don't keep leveling linearly — you **ascend** (§7). The cap
  is a soft wall that converts vertical growth into prestige, keeping the base
  power curve bounded and server-authoritative-friendly (no int overflow, no
  runaway numbers Economy can't price).

### 6.3 Stat growth on level-up

Keep the shipped rule as the **base** (primary +3, con +2, others +1, luck +1 =
+8 raw/level) and add a **player-allocated pool**: +3 free points per level to
spend on any attribute, respec-able cheaply. This is the "quiet" progression knob
beneath talents — a Warrior can lean crit by dumping free points into luck.

Growth per level = **8 auto + 3 allocated = 11 attribute points.** Example totals
(base class Warrior, auto-growth only, no gear):

| Level | STR | DEX | INT | CON | LUCK | maxHp |
|-------|-----|-----|-----|-----|------|-------|
| 1 | 15 | 8 | 6 | 14 | 5 | 168 |
| 10 | 42 | 17 | 15 | 32 | 14 | 2,112 |
| 25 | 87 | 32 | 30 | 62 | 29 | 9,672 |
| 50 | 162 | 57 | 55 | 112 | 54 | 34,272 |
| 100 | 312 | 107 | 105 | 212 | 104 | 128,472 |

`maxHp = round(CON × (level+1) × 6)`. Note HP grows super-linearly (CON *and*
level climb together) — this is what keeps TTK in band as `attackPower` climbs
(§9); the two curves are tuned as a pair.

### 6.4 Diminishing conversions keep it bounded

Because `critChance`, `armor`, `resist`, `hit` all use caps or diminishing
curves (§2), raw stat inflation never produces degenerate power. A level-100 hero
with 104 luck sits at `0.05 + 104/220 ≈ 0.52` crit before gear — strong, not
broken, room for gear/talents up to the 0.75 cap. Every offensive stat has a
mathematical ceiling; only HP and flat power scale freely, and they scale
*together*.

---

## 7. Prestige, ascension & paragon endgame

> Coordinates with **06** (season structure, infinite tower, reward cadence). This
> section owns the *math of infinite growth*; 06 owns *what you climb and when*.

### 7.1 The problem

An idle-RPG must offer growth forever without letting numbers break the economy
or the combat bands. Three stacked layers solve it, each with a different time
horizon:

### 7.2 Layer 1 — Ascension (soft prestige, per season)

At cap (50, later 100) a hero may **Ascend**: reset level to 1, keep gear/skills/
unlocks, and bank **Ascension Points (AP)** = `floor(level_reached / 10) +
dungeonBonus`. AP buy permanent, account-wide **Ascension perks** from a compact
grid (e.g. +2% XP, +1% all stats, +1 skill slot at milestones). Each ascension is
faster than the last (kept XP-adjacent boosts), giving the classic prestige
"power fantasy of speed." Ascension is **repeatable and expected** — the season
loop (06).

Diminishing by design: perk costs scale `cost(n) = 5 × 1.15ⁿ AP`, so infinite
ascension yields a **logarithmic** power gain, not exponential — the curve a live
game can balance around for years.

### 7.3 Layer 2 — Paragon (post-cap infinite levels)

Past the hard cap, XP converts to **Paragon levels** (à la Diablo III). Each
paragon level grants 1 point into a **Paragon board** with four quadrants
(Offense/Defense/Utility/Greed). Points give *tiny* rewards (+0.2% something) with
**no cap but sharply diminishing marginal value** because everything routes
through the diminishing conversions of §2/§6.4. Paragon is the "always a number
going up" retention floor between content drops. Season leaderboards (05/06) can
rank on paragon.

Guardrail: paragon touches **derived stats *before* caps**, so a 10,000-paragon
whale still can't exceed 75% crit or 85% armor — they're just deeper into
diminishing returns. This is the single most important balance decision for
longevity: **infinite input, asymptotic output.**

### 7.4 Layer 3 — Ascendancy / Mythic gear synergy

The truly-endgame vertical is *build refinement*, not stat inflation: chase
perfect affix rolls (04), keystone-enabling uniques, and paragon board optimization.
Power at the top comes from *fit*, not *magnitude* — the healthiest possible
endgame and the one that respects the "mastery you chase" pillar.

### 7.5 Worked ascension example

Hero hits level 50 (`AP = 5 + 2 dungeon = 7`). Spends on "+2% XP" (5 AP) and
"+1% all stats" (next tier, 6 AP — can't yet). Re-levels to 50 ~15% faster,
banks another 7 AP, now affords the stat perk. After ~6 ascensions the account
has ~20% XP and +5% stats permanently — meaningful, bounded, and it makes the
*next* new character alt (future feature) start stronger, deepening the account
meta with 06.

---

## 8. Companions & pets

**Scope: optional, M3+, opt-in per build.** A pet is a *second, simpler
CombatProfile* that acts on its owner's turns as a bonus actor — no separate UI
turn, keeping fights readable.

- **Role by type:** *Attacker* (adds strikes, Ranger's signature), *Guardian*
  (taunts a share of incoming hits, adds effective HP), *Support* (per-round buff
  or small heal), *Utility* (applies a debuff / extra DoT).
- **Scaling:** pet stats = `owner.level × petCoeff × rarity`, so pets never need
  their own gear economy (04 stays clean) but still grow with you.
- **Balance:** a pet is roughly a **+15% power slot** — strong enough to build
  around (Ranger), never mandatory for other archetypes. Pet uptime can be
  interrupted (a Guardian pet can be killed, freeing its taunt), giving fights a
  sub-objective without new input.
- Pets are primarily a **collection & personality** hook (Pillar 2 — the world is
  in on the joke; expect a "Very Large Badger" companion). Acquisition and cosmetic
  layer coordinate with 04/06/08.

We ship pets *after* the core build economy is proven so they enrich, not
complicate, the M2 depth pass.

---

## 9. Power budget & balance framework

### 9.1 The unified power equation

Every source of power funnels into the `CombatProfile` (§2.2). We reason about
balance via an abstract **Effective Power (EP)** score per fighter — a single
number our tools compute to compare builds and detect outliers:

```
EP ≈ effectiveDPS × effectiveEHP
effectiveDPS = attackPower × avgHitMult × (1 + critChance×(critMult−1))
             × hitChance × tempoFactor × skillUptimeMult
effectiveEHP = maxHp / ( mitigation × (1−avgResist) × (1−dodgeChance) × (1−block×0.5) )
```

A well-balanced build sits in a **target EP band for its level** (from a reference
curve). Tools flag any build >1.3× the band as a potential degenerate; <0.7× as a
trap. This is how we audit thousands of gear/talent permutations without
hand-testing each.

### 9.2 The power budget by source

Rough intended contribution to EP at level 50 (design target, tuned in playtest):

| Source | Share of EP | Owner |
|--------|------------|-------|
| Base level/stats | 40% | this doc |
| Gear (affixes) | 30% | **04** |
| Talents | 15% | this doc |
| Skills (choice+rank) | 10% | this doc |
| Ascension/paragon | 5% (grows over season) | this doc + **06** |

Keeping gear at ~30% means **no single legendary trivializes the game** — a
guardrail Economy and Combat enforce jointly. If gear crept to 60%, builds would
collapse into "wear the best items"; at 30%, the *combination* matters.

### 9.3 Guardrails vs. degenerate builds

- **Hard caps:** crit 75%, armor 85%, resist 75%, dodge 60%, lifesteal 40%,
  block 50%. Nothing multiplies to invulnerability.
- **Trade-off keystones:** every big power spike costs (§5.1). Anti-stacking:
  keystones that would combo into invincibility are made mutually exclusive by
  branch pathing.
- **Diminishing everything offensive** (§2.5, §2.7): raw-stat stacking asymptotes.
- **DoT & tempo caps** (§4.4, §2.4) stop infinite-loop exploits.
- **Round cap + TTK floors** (§2.9) ensure skills always get to fire; a build that
  one-shots is round-capped out of the arena band by matchmaking (05).
- **EP band monitor** (§9.1) as an automated outlier alarm on live data.

### 9.4 PvE vs. PvP balance split

The single most important structural balance decision: **the same engine, two
tuning layers.** A skill/talent can carry a `pvpModifier` (e.g. `0.6×` on a
one-shot execute) applied only in arena/ladder resolution. This lets PvE stay
power-fantasy generous while PvP stays fair — without forking the codebase.
Implemented as a multiplier table keyed by `(skillId, context)`; 05 owns the PvP
values, this doc owns the mechanism. PvP additionally normalizes evasion/variance
into tighter bands (§2.6) so ladder isn't a dice game.

### 9.5 Theorycrafting depth (the 3 a.m. promise)

The interacting systems — split power stats, diminishing curves with soft-cap
landmarks, keystones with trade-offs, trigger-ordered rotations, resource
economies, DoT refresh windows, tempo thresholds, overcrit conversion — give
theorycrafters real, non-obvious optimization: *"is my 8th point of armor better
than crit here?"* has a computable answer that changes with your gear. That is
the PoE/Diablo depth bar, delivered through build authoring instead of twitch.

---

## 10. Proposed Prisma models & server action shapes

All **additive** (Master Plan §8). Existing `Character` columns are untouched;
new tables reference `characterId`. SQLite → Postgres migration is orthogonal
(09).

### 10.1 New models

```prisma
/// A learnable active skill instance owned by a character (rank + unlock state).
model CharacterSkill {
  id           String   @id @default(cuid())
  character    Character @relation(fields: [characterId], references: [id], onDelete: Cascade)
  characterId  String
  skillKey     String   // references static SkillDef registry in code
  rank         Int      @default(1)
  unlockedAt   DateTime @default(now())
  @@unique([characterId, skillKey])
  @@index([characterId])
}

/// An equipped combat loadout: ordered skills + their triggers. Small, cheap,
/// swappable. One "active" per character; others are saved presets.
model Loadout {
  id           String   @id @default(cuid())
  character    Character @relation(fields: [characterId], references: [id], onDelete: Cascade)
  characterId  String
  name         String   @default("Default")
  isActive     Boolean  @default(false)
  // JSON: [{ slot:0, skillKey, trigger:{type,arg}, }, ...] validated server-side
  slots        String
  ultimateKey  String?
  petId        String?
  createdAt    DateTime @default(now())
  @@index([characterId, isActive])
}

/// Points spent in the talent tree. One row per allocated node (sparse, auditable).
model TalentAllocation {
  id           String   @id @default(cuid())
  character    Character @relation(fields: [characterId], references: [id], onDelete: Cascade)
  characterId  String
  nodeKey      String   // references static TalentNode registry
  points       Int      @default(1)
  @@unique([characterId, nodeKey])
  @@index([characterId])
}

/// Free-allocated attribute points beyond auto-growth (§6.3). Deltas only.
model AttributeAllocation {
  characterId  String   @id
  character    Character @relation(fields: [characterId], references: [id], onDelete: Cascade)
  strength     Int      @default(0)
  dexterity    Int      @default(0)
  intelligence Int      @default(0)
  constitution Int      @default(0)
  luck         Int      @default(0)
  unspent      Int      @default(0)
}

/// Account-wide prestige progress (§7). Lives beside Character; one per character.
model Ascension {
  characterId    String @id
  character      Character @relation(fields: [characterId], references: [id], onDelete: Cascade)
  ascensionCount Int    @default(0)
  ascensionPts   Int    @default(0)
  perks          String @default("{}")  // JSON map perkKey → tier
  paragonLevel   Int    @default(0)
  paragonBoard   String @default("{}")  // JSON quadrant → points
  subclass       String?                // e.g. "JUGGERNAUT"
}

/// Optional companion (§8).
model Companion {
  id           String   @id @default(cuid())
  character    Character @relation(fields: [characterId], references: [id], onDelete: Cascade)
  characterId  String
  petKey       String
  role         String   // ATTACKER | GUARDIAN | SUPPORT | UTILITY
  rarity       String
  level        Int      @default(1)
  @@index([characterId])
}
```

### 10.2 Fight record (replaces ad-hoc BattleLog for replays)

```prisma
/// A resolved fight, stored as inputs (seed + snapshots) so the log is recomputable.
model Fight {
  id            String   @id @default(cuid())
  characterId   String
  context       String   // ARENA | DUNGEON | RAID | DUEL
  seed          String
  combatVersion Int      @default(1)
  attackerSnap  String   // JSON CombatProfile at fight time
  defenderSnap  String
  won           Boolean
  rounds        Int
  createdAt     DateTime @default(now())
  @@index([characterId, createdAt])
}
```

Old `BattleLog` stays for back-compat; new fights write `Fight`. The client
fetches `(seed, snapshots)` and can replay identically, or the server renders the
log on demand — either way the *stored bytes* are tiny.

### 10.3 Server action shapes

```ts
// All server actions; client sends intent only, server owns RNG + writes.
compileCombatProfile(characterId): CombatProfile            // pure, cached per snapshot
resolveFight(profileA, profileB, seed, ctx): BattleResult   // pure, deterministic

allocateTalent(characterId, nodeKey): Result                // validates points/prereqs
respecTalents(characterId): Result                          // charges respecCost()
allocateAttributes(characterId, deltas): Result             // validates unspent pool
setLoadout(characterId, loadout): Result                    // validates slots/triggers/costs
rankSkill(characterId, skillKey): Result                    // spends skill point
chooseSubclass(characterId, subclassId): Result             // level≥20, charges cost
ascend(characterId): Result                                 // level==cap → AP, reset
spendAscension(characterId, perkKey): Result
```

Validation is total and server-side: prereqs, point budgets, level gates,
resource affordability, cap enforcement. The client only ever *proposes*.

---

## 11. Milestone phasing, risks & KPIs

### 11.1 Phasing against M1–M5

| Milestone | This module ships | Notes |
|-----------|-------------------|-------|
| **M1 — Foundation** | Refactor `resolveBattle` → seeded deterministic engine (§2.1–2.10) *behind the same interface*; `CombatProfile` compile step; `Fight` record + replay; split attack/spell power; TTK instrumentation. **No new player systems yet.** | De-risks everything later; invisible to players but unlocks tests + fairness. |
| **M2 — Depth** | Talent trees, subclasses (lvl 20), active skills + loadouts + triggers, resources, DoTs, free attribute points, respec. The "make it a game" payload. | The headline depth pass. Ties to 04 affixes landing same milestone. |
| **M3 — Endgame** | Level cap → 100, Ascension, Paragon, companions, PvP tuning layer (`pvpModifier`). | Coordinated with 06 tower/seasons + 05 ladder. |
| **M4 — Launch** | EP-band live monitor, anti-cheat hardening of profile compile, balance golden-tests in CI, mobile-perf pass on replays. | Combat is "done"; now provably fair + tuned. |
| **M5 — Live** | New subclass per class, seasonal keystones, paragon board expansions, balance patches on live KPI data. | Ongoing content cadence, not a one-off. |

### 11.2 Dependencies

- **04 (Economy/Items):** affix schema and gear power budget feed `CombatProfile`.
  We define the *stat hooks*; they define the *rolls*. Blocking for M2.
- **05 (PvP):** matchmaking bands, ladder, and PvP-tuning values. We provide the
  `pvpModifier` mechanism; they own the numbers. Blocking for M3 PvP.
- **06 (Endgame):** season structure, tower scaling, reward cadence for ascension.
  We provide the growth math; they provide the content it feeds. Blocking for M3.
- **07 (Game Feel):** consumes `BattleResult` log + juice events (`CRIT`,
  `LEVEL_UP`, `KILL`) to animate replays. Non-blocking, parallel.
- **09 (Tech):** owns migration mechanics + Postgres. Non-blocking, parallel.

### 11.3 Risks & mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Rebalancing the shipped engine breaks live fights/expectations | High | `combatVersion` on `Fight`; ship new engine behind interface in M1 with golden-file TTK tests before any player-facing change. |
| Build diversity collapses into one meta | High | EP-band monitor (§9.1), mutually-exclusive keystones, rock-paper archetypes (§5.4), track diversity KPI weekly. |
| Async skills too opaque / players don't engage | Med | Progressive reveal; smart default loadouts per class; "recommended build" presets; simulate-in-UI preview. |
| PvP degenerate (one-shot / full-dodge) | Med | PvP tuning layer (§9.4), tighter variance/evasion bands, matchmaking (05). |
| Number inflation breaks economy pricing | Med | Bounded curves (§6.4), asymptotic paragon (§7.3), Int-safe caps; align curves with 04. |
| Loadout/trigger DSL becomes a support burden | Low | Small fixed trigger set (§4.2), server validation, no free-text. |

### 11.4 KPIs (what we watch)

| KPI | Target | Signals |
|-----|--------|---------|
| **Build diversity** (distinct viable archetypes at cap by usage share) | ≥6, none >25% | one meta forming |
| **% players who respec** (by lvl 30) | ≥40% | tree is/isn't a real choice |
| **TTK-in-band %** (arena fights 6–12 rounds) | ≥80% | tuning drift |
| **Loadout customization rate** (players who edit from default) | ≥50% by lvl 25 | skills too opaque/shallow |
| **Ascension adoption** (players who ascend ≥1 in season) | ≥60% of cap-reachers | endgame pull |
| **First-talent reach** (Master Plan depth KPI) | D7 ≥ 55% | depth onboarding |
| **PvP win-rate spread** across top archetypes | within ±8% | PvP imbalance |
| **Skill-rank spend rate** | ≥70% of earned points spent | progression sink working |

---

## 12. Appendix: constants & tuning tables

All constants live in `src/lib/combat/constants.ts`, hot-tunable, version-stamped
into `Fight.combatVersion`.

```ts
export const COMBAT = {
  version: 1,
  varianceBand: [0.85, 1.15],
  critChanceBase: 0.05, critLuckDivisor: 220, critChanceCap: 0.75,
  critMultBase: 1.5, critMultLuckDivisor: 1000, overcritRate: 0.01,
  armorK: (atkLevel: number) => 50 + 12 * atkLevel,
  armorReductionCap: 0.85,
  resistCap: 0.75, dodgeCap: 0.60, blockCap: 0.50,
  blockDamageMult: 0.5, lifestealCap: 0.40,
  hitBase: 0.85, hitDivisor: 400, hitFloor: 0.35, hitCeil: 1.0,
  tempoTurnThreshold: 100,
  roundCap: { arena: 60, dungeon: 80, raid: 150 },
  dotStackCap: 5, comboCap: 8, rageCap: 100,
  // stat → derived
  speedBase: 10, speedDexScale: 0.5,
  accuracyBase: 50, accuracyDexScale: 0.8, accuracyLevelScale: 1.5,
  evasionDexScale: 0.9, scoutEvasionBonus: 1.15,
  armorConScale: 0.5,
  // progression
  autoGrowth: { primary: 3, constitution: 2, others: 1, luck: 1 },
  freePointsPerLevel: 3,
  levelCap: { M2: 50, M3: 100 },
  skillRankMax: 10, skillRankCoeffStep: 0.12,
  // prestige
  apPerTenLevels: 1, ascPerkCostBase: 5, ascPerkCostGrowth: 1.15,
} as const;
```

**HP factors (unchanged from ship):** Warrior 6 · Scout 4 · Mage 3.

**Rarity multipliers (from 04, referenced):** Common 1.0 · Rare 1.7 · Epic 2.6 ·
Legendary 4.0 — gear stat budgets already scale on these; `CombatProfile` reads
the summed result, so 04 can retune rarity without touching the engine.

**Reference EP band curve (illustrative, for the monitor):**
`targetEP(level) ≈ 1000 × 1.09^level` — builds within `[0.7, 1.3]×` are healthy;
outside triggers a balance review. Calibrated against playtest at M2/M3.

---

*End of module 03. Cross-references: item affixes & budgets → `04-economy-items-crafting.md`;
PvP ladder, matchmaking & fairness → `05-multiplayer-guilds-pvp.md`; seasons,
tower & reward cadence → `06-endgame-liveops-events.md`; replay juice & event bus →
`07-game-feel-audio-juice.md`; migrations & platform → `09-technical-architecture-platform.md`.*
