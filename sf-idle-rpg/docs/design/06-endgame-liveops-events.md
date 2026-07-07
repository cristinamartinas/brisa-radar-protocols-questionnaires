# 06 — Endgame, Live-Ops & Events

> **Status:** ✅ Complete
> **Owner:** Senior Live-Ops Designer · **Milestone focus:** M1–M5 · **Version:** 1.0
> **Depends on:** 03, 04, 05, 08, 09 · **Last updated:** 2026-07-07

**Module summary.** This module designs the *reasons to keep playing after the credits* and the *machinery that keeps the world feeling alive forever*. It defines the endgame loops (infinite tower, escalating "mythic+" dungeons, server-wide world bosses, and a weekly guild raid whose combat authority lives in module 05), the season structure (an 8-week cadence of theme, reset, ladder, and season currency owned with 04), the free + premium battle pass (~50 tiers, priced and paced with 08), the daily/weekly/monthly cadence with concrete task tables, and a data-driven **Live Events framework** so a small LiveOps team ships themed events *without shipping code*. It closes with proposed Prisma models, the scheduled-job contract that module 09 must run, server-action shapes, milestone phasing, and the KPIs, risks, and anti-dark-pattern guardrails that keep the retention spine honest. Everything is server-authoritative and every schema change is additive.

---

## Table of Contents

1. [Design Goals & Guardrails](#1-design-goals--guardrails)
2. [The Live Spine at a Glance](#2-the-live-spine-at-a-glance)
3. [Endgame Loops](#3-endgame-loops)
4. [Season Structure](#4-season-structure)
5. [Battle Pass](#5-battle-pass)
6. [Daily / Weekly / Monthly Cadence](#6-daily--weekly--monthly-cadence)
7. [Live Events Framework](#7-live-events-framework)
8. [12-Week Sample Live Calendar](#8-12-week-sample-live-calendar)
9. [Retention & Re-Engagement](#9-retention--re-engagement)
10. [Content Cadence & LiveOps Operating Model](#10-content-cadence--liveops-operating-model)
11. [Data Model, Jobs & Server Actions](#11-data-model-jobs--server-actions)
12. [Milestone Phasing](#12-milestone-phasing)
13. [Risks & Ethics](#13-risks--ethics)
14. [KPIs & Instrumentation](#14-kpis--instrumentation)
15. [Open Questions & Cross-Module Contracts](#15-open-questions--cross-module-contracts)

---

## 1. Design Goals & Guardrails

The endgame exists to answer one question a level-capped player asks every day: **"what's worth my five minutes right now?"** If the answer is ever "nothing," we have failed. Our job is to make sure there is always a *warm* reason (fun, low-pressure) and a *hot* reason (time-boxed, high-stakes) on the menu, without turning either into an obligation that punishes a missed day.

**Goals**

- **Layered endgame.** Solo grind (tower), tactical mastery (mythic+ dungeons), spectacle (world bosses), and coordinated social (raid) — four distinct fantasies, so different player types each have a home.
- **A living calendar.** Something new or newly-relevant should be visible on the home screen *every single day*, most of it authored by LiveOps as data, not by engineers as code.
- **Seasonal renewal without erasure.** Seasons give the game a fresh coat of paint and a reason to re-engage lapsed players, but they must never delete the progress a player earned. We reset *ladders and season currency*; we *persist* the hero.
- **Honest pressure.** We use scarcity and streaks because they work, but we cap the punishment of absence, offer catch-up on every timed system, and never sell power that can't be earned. This is Pillar 5 (respect the player's time and trust) rendered as live-ops policy.

**Guardrails (non-negotiable)**

1. **Server-authoritative.** Rollovers, reward grants, streaks, and event completion are all computed and validated server-side. The client requests; the server decides. (Contract owned by 09.)
2. **Additive migrations only.** Every table and column proposed here is new or nullable; we never rename or drop live columns.
3. **Idempotent grants.** Every reward claim is guarded by a unique key so a double-tap, a retry, or a replayed request can never double-grant. Money and power especially.
4. **No pay-for-power that isn't earnable.** Premium pass and shop sell cosmetics, convenience (time), and *access to the same power on a faster track* — never exclusive stat ceilings. (Boundary with 08.)
5. **Absence is capped, not compounded.** The worst outcome of not logging in for a week is missing time-boxed *bonus* rewards — never losing your character, gear, or rank tier floor.

---

## 2. The Live Spine at a Glance

```
        ┌──────────────── SEASON (8 weeks) ────────────────┐
        │  theme · ladder · season currency · battle pass   │
        │                                                   │
  DAILY │  daily quests ─ login streak ─ tower push ─ shop  │
        │        │                                          │
 WEEKLY │        └─ weekly guild goals ─ raid lockout ─     │
        │           mythic+ vault ─ world-boss window       │
        │                                                   │
 EVENTS │  recurring (weekend rushes) + one-off (festivals) │
        └───────────────────────────────────────────────────┘
        Cadence nests: a day sits inside a week sits inside a
        season. Each layer has its own faucet, its own reset,
        and its own reason to come back.
```

The spine from the master plan — **daily quests → weekly guild goals → seasonal ladders** — is the backbone. This module fills every rung: what the daily quests are, how weekly guild goals tie to the raid (05), and how the seasonal ladder resolves into rewards and a fresh battle pass.

---

## 3. Endgame Loops

Four pillars of the level-cap experience. Each has a distinct *fantasy*, *cadence*, *reward currency*, and *social scope* so they don't cannibalize each other.

| Loop | Fantasy | Cadence | Social scope | Primary reward |
|------|---------|---------|--------------|----------------|
| **Endless Tower** | "How high can *I* climb?" | Always-on, seasonal ladder | Solo + leaderboard | Tower Marks, ladder rank, cosmetics |
| **Escalating Dungeons ("Delves+")** | "Master the mechanics under pressure" | Weekly key + vault | Solo / async party | Gear, affix rerolls, Delve Sigils |
| **World Bosses** | "The whole server vs. a giant" | 2–3 windows/week | Server-wide | Boss loot table roll, event currency |
| **Weekly Raid** | "My guild, coordinated, on a clock" | Weekly lockout | Guild (owns 05) | Raid tokens, guild rep, mythic gear |

### 3.1 Endless Tower — *"The Spindle"*

An infinite ladder of single-encounter floors with smoothly escalating difficulty, built directly on the existing dungeon/floor-boss combat. It is the **spine of the seasonal ladder** because it produces a clean, comparable, cheat-resistant number: *highest floor reached this season*.

- **Structure.** Floors are procedurally themed in bands of 10. Enemy power scales on the curve owned by module 03 (see `03-combat-character-progression.md` for the exact per-floor multiplier and stat budget — we consume it, we do not define it). Every 5th floor is a mini-boss; every 10th is a themed floor boss with a guaranteed loot roll.
- **Session shape.** One floor = one ~20–40s auto-resolved fight. A player pushes as far as their gear allows in a sitting, then hits a wall. Respects the 2–5 min session shape from the master plan.
- **Energy, not paywall.** Tower runs cost **Tower Stamina** (regenerates ~1 per 20 min, cap 12, overflow bankable to 24 for a day). This paces the faucet and creates a daily reason to return without hard-gating a bored player who wants to binge — stamina is generous and premium refreshes are convenience, never the only path (boundary with 08).
- **Seasonal reset.** Highest-floor **rank persists as a personal best trophy** but the *competitive ladder resets each season* (see §4). At reset, players start the climb from a **"checkpoint floor"** = 80% of last season's best (rounded down to a band), so veterans don't re-grind trivial floors — a catch-up baked into the reset.
- **Rewards.** Milestone chests at floors 10/25/50/75/100/… granting gold, mushroom dust, gear, and Tower Marks (a season-scoped currency, see 04). Weekly "highest new floor" grants ladder points.
- **Leaderboard.** Global + guild + friends tabs, snapshotted hourly (see §11 jobs). Ties broken by *earliest to reach*, which rewards pushing early in the season and de-risks last-day sniping.

### 3.2 Escalating Dungeons — *"Deep Delves"* (mythic+ analog)

Takes the 3 shipped dungeons and adds an **escalation + modifier** layer for mastery-chasers. This is the theorycrafter's home (Pillar 3).

- **Delve Keys.** A player holds a key at **tier N**. Completing a dungeon at tier N under the timer upgrades the key to N+1 and rerolls its affixes; failing or beating it slow *depletes* it to N−1 (never below 1 — no hard loss spiral).
- **Affix system (LiveOps-tunable).** Each tier applies a stack of **modifiers** drawn from a data-defined pool: e.g. *Feverish* (enemies enrage below 30% HP), *Thorned* (reflect % damage), *Hasted* (boss acts twice), *Miserly* (less healing), *Festive* (seasonal cosmetic modifier). Which affixes are active rotates **weekly** and can be overridden per-event — this rotation is pure data authored in the events framework (§7), giving LiveOps a free weekly "what's the meta this week" lever with zero engineering.
- **The Weekly Vault.** Running Delves banks progress toward a **once-per-week reward vault** (3 slots that unlock at 1/4/8 runs; player picks 1 of 3 offered items per unlocked slot). This is the anti-burnout valve: 8 runs *caps* the meaningful weekly reward, explicitly telling the dedicated player "you're done, go live your life," while still letting them push keys for ladder glory and cosmetics. Borrowed from WoW's M+ vault because it is the single best "diminishing-obligation" pattern in the genre.
- **Rewards.** Gear at the top of module 04's item curve, affix-reroll tokens (feed 04's crafting), and **Delve Sigils** (season currency). Tier reached feeds a secondary ladder ("highest key").

### 3.3 World Bosses — *"The Wandering Colossi"*

Server-wide spectacle events. A giant, satirically-named boss (e.g. *Gorbo the Landlord, He Who Raises the Rent*) spawns in **scheduled windows** and every player on the shard chips its shared HP bar down asynchronously.

- **Async participation.** No synchronous raiding required (Pillar 4: asynchronous, never lonely). During the window a player spends **Boss Tickets** (3/window) to launch attacks; each attack applies their hero's computed damage to the global HP pool. A live-updating bar shows server progress.
- **Tiered rewards by contribution + participation floor.** Everyone who lands ≥1 hit gets a **participation reward** (guaranteed, so casuals aren't shut out); bonus loot scales by damage-done bracket (top 1% / 10% / 50% / participant). This deliberately flattens the FOMO — showing up matters more than being the strongest.
- **Windows.** 2–3 per week, timed to hit different time zones fairly (see §11 job `worldBossSpawn`; rotate anchor hour weekly so the same region isn't always favored).
- **Server health.** Boss HP is tuned as `f(active_population)` so a healthy shard kills it near the window's end (drama) rather than in 5 minutes (anticlimax) — this scaling factor is a LiveOps-tunable field, not a code constant.
- **Reward currency.** World-boss **Ichor** (event currency, spendable in the seasonal event store, see 04). Cosmetic boss-themed items are the marquee drop.

### 3.4 Weekly Raid — *coordination on a clock* (boundary with 05)

The raid is the **guild's** flagship endgame. **Module 05 owns the raid's combat, roster mechanics, guild-role gating, and lockout rules.** This module owns only the *live-ops wrapper*:

- **Cadence & reset.** Raid resets weekly (Monday 09:00 UTC, aligned with the global weekly rollover in §6/§11). One lockout per guild per week.
- **Seasonal raid tiers.** Each season introduces a raid *tint* (new modifier, new cosmetic loot, new leaderboard) on 05's raid content, so the raid feels fresh seasonally without 05 shipping a whole new encounter every 8 weeks. The seasonal modifier is data (§7).
- **Reward hooks into this module.** Raid completion contributes to **weekly guild goals** (§6.2), grants **battle-pass XP**, and drops **Raid Tokens** (season currency). The *combat* is 05; the *tokens, XP, and calendar slot* are 06.

> **Boundary contract with 05.** 06 calls a raid-status read (`getRaidLockout(guildId, seasonId)`) and subscribes to a `RAID_CLEARED` domain event to grant pass XP + season currency + guild-goal progress. 06 never computes raid combat. If 05 changes lockout timing, it notifies 06 so the calendar and weekly rollover stay aligned.

---

## 4. Season Structure

A **season is the heartbeat** — an 8-week container that gives the game a theme, a fresh ladder, a new battle pass, and a reason for lapsed players to return ("new season just dropped").

### 4.1 Why 8 weeks

- Long enough that a battle pass at a humane pace is completable in ~45–60 min/day of play, and content doesn't feel disposable.
- Short enough that the "fresh start" dopamine recurs ~6.5×/year, and a bad season theme is never a long sentence.
- Aligns to a natural content-production sprint for a small team (see §10). Two-week "act" beats inside the season keep mid-season energy up.

**Season shape (8 weeks = 4 acts of 2 weeks):**

| Week | Act | Beat |
|------|-----|------|
| 1 | Act I — *Ignition* | Season launch, theme reveal, pass live, launch event |
| 2 | Act I | First rotating Delve affix set, world boss #1 |
| 3–4 | Act II — *Escalation* | Mid-season event, ladder heats up, new cosmetic drop |
| 5–6 | Act III — *The Turn* | Twist event (narrative beat w/ 02), catch-up boost begins |
| 7 | Act IV — *Climax* | Finale event teaser, "last call" pass reminders (soft) |
| 8 | Act IV | Season finale event, ladder snapshot, rewards, wind-down |
| — | **Intermission** | 48–72h between seasons: rewards mailed, teaser for next |

The **48–72h intermission** is deliberate: it prevents the "logged in to an empty transition" feeling, gives a hard checkpoint for the reset job, and creates a "calm before the storm" the next launch event capitalizes on.

### 4.2 What resets vs. what persists

| Category | Reset each season | Persists forever |
|----------|:---:|:---:|
| Hero level, stats, class | | ✅ |
| Equipped & inventory gear | | ✅ |
| Talents / prestige (03) | | ✅ |
| Gold, mushrooms | | ✅ |
| Guild membership & guild hall (05) | | ✅ |
| **Season currency (Marks/Sigils/Ichor/Tokens)** | ✅ (converts, see 4.3) | |
| **Seasonal ladder rank & points** | ✅ (snapshotted to Hall of Legends) | |
| **Battle pass tiers & unclaimed track** | ✅ (grace claim window) | |
| **Delve key tier** | ✅ (soft: resets to floor(tier×0.6)) | |
| **Tower competitive floor** | ✅ (checkpoint = 80% best) | |
| Cosmetics, titles, trophies earned | | ✅ |

**Principle:** we reset *competition and consumable season economy*; we never reset *identity or earned permanence*. A returning player after a season away finds their hero exactly as they left it, plus a fresh ladder to climb — the ideal re-engagement setup.

### 4.3 Season currency loop (owned with 04)

Module 04 owns the canonical currency list and sink/faucet balance. 06 defines the *seasonal* members and their lifecycle:

- **Earn:** Tower Marks (tower), Delve Sigils (dungeons), Boss Ichor (world bosses), Raid Tokens (raid). Each loop has its own currency so no single activity dominates.
- **Spend:** a **Seasonal Store** (04 owns pricing) stocked with that season's cosmetics, catch-up gear, affix rerolls, and battle-pass XP boosters. Refreshes weekly per act.
- **Season end — no dead currency.** At reset, unspent season currency **auto-converts** to a small permanent stipend of *gold + mushroom dust + "Legacy Marks"* (a slow permanent meta-currency spendable in a small evergreen store). This removes the anxiety of "I have 4,000 unspent Marks and the season is ending" — a common FOMO trap we explicitly defuse. Conversion is announced with 2 weeks' notice.

> **Boundary with 04.** 06 defines *which* currencies exist per season and *when they convert*; 04 defines *store prices, drop quantities, and the gold/mushroom faucet-sink balance* so the season economy doesn't inflate the core economy. Legacy Marks and its evergreen store are jointly owned (06 designs, 04 balances).

### 4.4 Seasonal ladder & rewards

Two ladders per season, both snapshotted at season end into a permanent **Hall of Legends**:

- **Tower ladder** (solo): highest floor, ties by earliest.
- **Guild ladder** (05 coordinates): aggregate of raid clears + world-boss contribution + member tower floors.

**Ladder reward tiers (per season, cosmetic-forward):**

| Bracket | Tower ladder reward | Guild ladder reward |
|---------|---------------------|---------------------|
| Top 1 | Animated seasonal title + unique mount cosmetic + Hall statue | Guild hall banner + realm-wide announcement |
| Top 10 | Seasonal legendary skin + title | Guild cosmetic set |
| Top 100 | Seasonal cosmetic + frame | Guild badge |
| Top 10% | Seasonal emote + Legacy Marks | Guild rep + Legacy Marks |
| Participated (any ladder points) | Season-finale cosmetic + Legacy Marks | Rep |

Rewards are **cosmetic + meta-currency, never raw power** — competitive ladders must not create a power runaway for the top, or the next season's ladder is pre-decided (Pillar 5).

---

## 5. Battle Pass

A **50-tier**, 8-week, dual-track (Free + Premium) progression rail. Owned jointly with **08** (which owns pricing, storefront, conversion funnel, and the premium value story); 06 owns the *structure, pacing, reward table, and catch-up*.

### 5.1 Principles

- **Free track is generous and real.** A non-paying player who plays daily completes the free track and feels rewarded. The free track *carries the retention*; the premium track *monetizes the already-engaged* (08).
- **Premium is value, not power gate.** Premium adds cosmetics, extra season currency, convenience (stamina, XP boosts), and a **premium-plus instant-tier bundle** — never exclusive stat power that can't be earned elsewhere.
- **Completable, not a second job.** ~45–60 min/day of normal play completes all 50 tiers with ~1 week of slack. We tune to the *median engaged player finishing at week 7*, leaving act IV for glory/ladder, not grind panic.
- **Anti-FOMO catch-up.** Falling behind is recoverable (see 5.4). Post-season **grace claim window** (14 days) lets players collect earned-but-unclaimed rewards after reset.

### 5.2 Pass XP economy

- **Season Pass XP (SXP)** is earned from *everything*: dailies, weeklies, tower floors, delves, world-boss hits, raid clears, events. This means all four endgame loops feed one bar — a player is always making pass progress no matter what they choose to do.
- **Per-tier cost:** flat **1,000 SXP/tier** (50,000 SXP for the full pass). Flat, not escalating — escalating tier costs are a known frustration pattern; flat cost keeps the "one more tier" math legible.
- **Daily SXP budget (typical engaged player):** ~1,100–1,300 SXP/day from cadence + a loop or two → ~50k over ~40 active days inside a 56-day season. Slack absorbs missed days.
- **Weekly bonus cap** on grind-heavy sources (tower/delves) prevents no-lifing from trivializing the pass and protects the "come back tomorrow" cadence.

**SXP source table (targets):**

| Source | SXP | Cap |
|--------|-----|-----|
| Daily quest (each, 3/day) | 150 | 3/day |
| Daily "all complete" bonus | 200 | 1/day |
| Login streak tick | 50–150 | 1/day |
| Weekly guild goal contribution | up to 1,500 | weekly |
| Delve vault run | 120 | 8/week |
| Tower new milestone floor | 100 | soft weekly cap |
| World-boss participation | 300 | per window |
| Raid clear | 1,000 | weekly |
| Event objectives | varies | per event |

### 5.3 Tier reward table (50 tiers)

**Legend.** `G` gold · `MD` mushroom-dust · `SC` season currency (mixed) · `LM` Legacy Marks · `BXP` stamina/XP booster · ⭐ = premium-track marquee. Free rewards are chosen to always be *useful* (currency, consumables, occasional gear) so the free track never feels like filler; premium rewards are *cosmetic + convenience + amplified currency*.

| Tier | Free track | Premium track ⭐ |
|:---:|------------|------------------|
| 1 | 500 G | Season emote + 500 MD |
| 2 | 200 SC | Weapon skin (common) |
| 3 | 1 affix reroll | 400 SC |
| 4 | 300 MD | Stamina refresh ×2 |
| 5 | **Gear cache (uncommon)** | **Armor skin (rare)** ⭐ |
| 6 | 500 G | 500 SC |
| 7 | 250 SC | Profile frame |
| 8 | 1 Boss Ticket | XP booster (24h) |
| 9 | 400 MD | 600 SC |
| 10 | **Title: "the Persistent"** | **Mount cosmetic (rare)** ⭐ |
| 11 | 500 G | 500 SC |
| 12 | 300 SC | Emote |
| 13 | 1 affix reroll | Stamina refresh ×3 |
| 14 | 400 MD | 700 SC |
| 15 | **Gear cache (rare)** | **Weapon skin (epic)** ⭐ |
| 16 | 600 G | 600 SC |
| 17 | 300 SC | Profile banner |
| 18 | 1 Delve key boost | XP booster (24h) |
| 19 | 500 MD | 800 SC |
| 20 | **Cosmetic: seasonal pet** | **Armor skin (epic)** ⭐ |
| 21 | 700 G | 700 SC |
| 22 | 350 SC | Emote |
| 23 | 2 affix rerolls | Stamina refresh ×4 |
| 24 | 500 MD | 900 SC |
| 25 | **Gear cache (rare) + Title** | **Full seasonal cosmetic set pt.1** ⭐ |
| 26 | 700 G | 800 SC |
| 27 | 400 SC | Profile frame (animated) |
| 28 | 2 Boss Tickets | XP booster (48h) |
| 29 | 600 MD | 1,000 SC |
| 30 | **Cosmetic: weapon trail** | **Mount cosmetic (epic)** ⭐ |
| 31 | 800 G | 900 SC |
| 32 | 400 SC | Emote |
| 33 | 2 affix rerolls | Stamina refresh ×5 |
| 34 | 600 MD | 1,100 SC |
| 35 | **Gear cache (epic)** | **Weapon skin (legendary)** ⭐ |
| 36 | 800 G | 1,000 SC |
| 37 | 450 SC | Title (premium) |
| 38 | 1 Delve key boost | XP booster (48h) |
| 39 | 700 MD | 1,200 SC |
| 40 | **Cosmetic: seasonal aura** | **Full seasonal cosmetic set pt.2** ⭐ |
| 41 | 900 G | 1,100 SC |
| 42 | 500 SC | Emote (animated) |
| 43 | 3 affix rerolls | Stamina refresh ×6 |
| 44 | 700 MD | 1,300 SC |
| 45 | **Gear cache (epic)** | **Armor skin (legendary)** ⭐ |
| 46 | 1,000 G | 1,200 SC |
| 47 | 500 SC | Profile showcase slot |
| 48 | 300 LM | XP booster (72h) |
| 49 | 800 MD | 1,500 SC |
| 50 | **Title: "Champion of \<Season\>" + Gear cache (epic)** | **Prestige mount + animated title + 500 LM** ⭐ |
| **Post-50** | — | **Infinite "Prestige tiers": each = 1,500 SXP → 250 SC + cosmetic token** |

**Post-50 prestige tiers** give whales and grinders a runway *without power creep* — pure cosmetic tokens + season currency — so completing tier 50 early isn't a dead end (and gives 08 an honest overflow to sell without selling power).

### 5.4 Catch-up & premium value

- **Rested SXP.** Missed days accrue a **rested bonus** (up to +100% SXP on the next N activities, capped at ~3 days' worth). Absence converts to a *boost when you return*, not a permanent gap — this is the single most important anti-FOMO lever in the pass.
- **Act-based catch-up curve.** From Act III (week 5), a global **+25% SXP** modifier applies, ramping to +50% in Act IV, so late-joiners and returners can still finish.
- **Seasonal-store XP boosters** buyable with *season currency* (not just money) — a non-payer can convert grind into catch-up.
- **Premium instant-tiers.** 08 sells a "+10 tiers" bundle and a "Premium Plus" (premium track + 20 tiers). This must remain *convenience/cosmetic acceleration*, never the only route to any power reward (all power rewards on premium are also earnable on free or via season currency).

> **Boundary with 08.** 08 owns: pass price point, currency (mushrooms) cost, the buy/upgrade storefront UI, conversion funnels, and the notification copy driving purchase. 06 owns: tier count, reward *contents & pacing*, SXP economy, catch-up math. We co-sign the "premium is never pay-to-win" contract.

---

## 6. Daily / Weekly / Monthly Cadence

The nested-timer rhythm that makes the habit. All refresh times are **UTC-anchored** and computed server-side (§11).

### 6.1 Daily loop (resets 05:00 UTC)

**Daily quests: 3 offered per day, drawn from a weighted pool**, chosen to route the player through *different* systems (never 3 of the same). Rerollable once/day (free) so a player who can't do "win 3 arena fights" isn't stuck.

| Task template | Example | Reward |
|---------------|---------|--------|
| Send N quests | "Dispatch 3 timed quests" | 150 SXP + 300 G |
| Climb tower floors | "Climb 5 Spindle floors" | 150 SXP + Tower Marks |
| Clear a dungeon | "Clear any dungeon once" | 150 SXP + gear cache |
| Win arena duels | "Win 3 arena duels" | 150 SXP + 250 G |
| Spend/earn currency | "Sell 5 items to the shop" | 150 SXP + MD |
| Social | "Contribute to a guild goal" | 150 SXP + rep |
| Event tie-in | "\<active-event objective\>" | 150 SXP + event currency |

- **Daily "all-clear" bonus:** completing all 3 grants **+200 SXP + login-streak protection** for the day.
- **Daily shop refresh:** the Seasonal Store + magic shop restock (04 owns stock tables).
- **Stamina/ticket refresh:** Tower Stamina overflow bank resets; Boss Tickets refill on window open.

### 6.2 Weekly loop (resets Monday 09:00 UTC)

- **Weekly Guild Goals** (05 coordinates membership; 06 defines goal templates & rewards). A guild collectively fills 3 goal bars; on completion, **all members** claim a chest. This is the "weekly guild goals" rung of the master spine.

| Weekly guild goal | Target (scales w/ guild size) | Guild reward |
|-------------------|-------------------------------|--------------|
| Collective tower floors | e.g. 500 floors | Gold + SXP for all |
| World-boss damage | e.g. 5% server contribution | Ichor + guild rep |
| Raid clear | 1 clear | Raid tokens + big SXP |
| Dungeon delves | e.g. 200 vault runs | Gear caches for all |

- **Delve Vault** unlocks (§3.2) — pick your weekly reward.
- **Raid lockout** resets (05).
- **Ladder points** for "best new tower floor this week."
- **Weekly login bonus** (streak milestone, §9).

### 6.3 Monthly / seasonal beats

- **Monthly cosmetic drop** in the shop (04) — evergreen, keeps non-season players engaged.
- **Season act rollover** every 2 weeks (§4.1).
- **Season finale + reset** every 8 weeks (§4).

### 6.4 Refresh-timing rationale

Daily at **05:00 UTC** and weekly at **Monday 09:00 UTC** are deliberately *offset*: the daily reset lands in the low-activity trough for the primary player timezone (avoiding a reset mid-session), and the weekly reset lands Monday morning to catch the "new week, fresh goals" mental model. Both are single config constants in the scheduler (09) so we can tune post-launch by region data.

---

## 7. Live Events Framework

**The single most important system in this doc for long-term health.** The goal: **LiveOps ships a new themed event by authoring data — no code deploy.** An event is a *typed, scheduled bundle of objectives, modifiers, a reward track, and presentation*, validated server-side and rendered by a generic client.

### 7.1 Event taxonomy

| Type | Cadence | Example | Purpose |
|------|---------|---------|---------|
| **Recurring** | Weekly/weekend | "Double Tower Weekend" | Reliable rhythm, low authoring cost |
| **Seasonal act** | Per 2-week act | "The Turnip Uprising" | Narrative + theme (02) |
| **One-off festival** | Calendar/holiday | "Harvest of Souls" | Spectacle, re-engagement spike |
| **Flash** | 6–48h | "Mushroom Rush" | Urgency, off-peak boost |
| **Community/server goal** | Multi-day | "Slay the Colossus, unlock reward for all" | Collective, Pillar 4 |
| **Competitive** | Timed ladder | "Spindle Sprint" | Leaderboard, re-engages competitives |

### 7.2 The event data model (author-without-code)

An event is a JSON/DB record built from **composable primitives**:

```jsonc
{
  "key": "double-tower-weekend-2026w28",
  "type": "RECURRING",
  "theme": "spindle",                 // drives banner art, palette, copy (01/02)
  "startsAt": "2026-07-11T09:00:00Z",
  "endsAt":   "2026-07-13T23:59:00Z",
  "timezoneStrategy": "utc",          // or "rolling" for per-region windows
  "visibility": { "minLevel": 10 },   // eligibility predicate
  "modifiers": [                      // declarative game-state tweaks
    { "target": "tower.markGain",   "op": "mul", "value": 2.0 },
    { "target": "tower.stamina.regenMinutes", "op": "set", "value": 12 }
  ],
  "objectives": [                     // reward-track drivers
    { "id": "climb50", "metric": "tower.floorsClimbed", "goal": 50,
      "reward": [{ "kind": "SXP", "amount": 500 }] }
  ],
  "track": {                          // optional event-local mini-pass
    "currency": "eventPoints",
    "tiers": [ /* points → reward */ ]
  },
  "store": { "currency": "eventPoints", "items": [ /* … */ ] },
  "presentation": {                   // pure content, no logic
    "bannerAssetKey": "evt_tower_weekend",
    "title": "Double Tower Weekend",
    "blurb": "The Spindle spins faster. Marks rain down.",
    "accentColor": "#6f4bd8"
  }
}
```

**Design of the primitives:**

- **Modifiers** are `{target, op, value}` triples against a **whitelisted registry of tunable game paths** (e.g. `tower.markGain`, `delve.affixSet`, `shop.discount`, `worldboss.hpScale`). The whitelist is code (09/03/04 own their tunable surface); *which modifiers an event uses* is data. This is the safety boundary: LiveOps can only tune what engineering has exposed.
- **Objectives** map a **tracked metric** (from the domain event bus) to a **goal** and a **reward list**. Metrics are a registered enum; rewards are the same reward-grant union used by the battle pass (reuse, not reinvention).
- **Track / Store** reuse the pass-tier and season-store primitives — an event's mini-pass is literally a scoped battle pass.
- **Presentation** is pure content — art keys, copy, color — authored alongside 01 (art) and 02 (narrative).

**Why this shape:** every event is a *composition of four already-built systems* (modifiers, objective tracking, reward grants, a store). We build these four robustly once; after that, a new event is a form a designer fills in and a QA pass — days, not sprints.

### 7.3 Authoring & safety workflow

1. LiveOps drafts an event in an **internal admin tool** (form over the schema; M4 deliverable).
2. **Server-side validation** on save: modifier targets ∈ whitelist, no reward exceeds a **per-event grant budget ceiling** (guards against a fat-fingered "1,000,000 mushrooms" mistake), dates don't overlap-conflict with existing events of the same exclusivity class.
3. **Staging preview** with a `previewAsUser` time-travel flag so LiveOps sees the event as a player would on any date.
4. **Scheduled activation** — the event goes live purely by the scheduler crossing `startsAt`; no deploy. Kill-switch flag can force-end any event instantly.
5. **Post-event** the scheduler crosses `endsAt`, freezes objective progress, opens a 72h reward-claim grace window, then archives.

### 7.4 Anti-abuse

- All objective progress is derived from **server-emitted domain events**, never client-reported counts.
- Reward grants are **idempotent** (unique `(eventKey, userId, rewardId)`), so retries/exploits can't double-claim.
- Grant-budget ceiling + audit log on every LiveOps-authored event (who/what/when) for accountability and rollback.

---

## 8. 12-Week Sample Live Calendar

A concrete quarter (≈1.5 seasons) showing how recurring, seasonal, and one-off events interleave. Season A: **"Harvest & Havoc"** (agricultural-apocalypse satire). Season B kickoff: **"Molten Ledger"** (a fire-demon accounting firm). Weeks are illustrative; UTC anchoring per §6.4.

| Week | Season beat | Headline event | Recurring | World boss | Notes |
|------|-------------|----------------|-----------|-----------|-------|
| 1 | S-A Act I launch | **"The Sprout Awakens"** (launch festival) | — | Gorbo the Landlord | Pass live, ladder opens |
| 2 | S-A Act I | Delve affix set: *Feverish + Thorned* | **Double Tower Weekend** | — | Meta shift |
| 3 | S-A Act II | **"Turnip Uprising"** (community goal: server slays 1M pests) | Guild Gold Rush (wknd) | Gorbo (rematch) | Collective reward unlock |
| 4 | S-A Act II | Cosmetic drop: *Scarecrow set* | **Double Tower Weekend** | — | Mid-season monetization beat (08) |
| 5 | S-A Act III | **"The Blight" (twist event, 02 narrative beat)** + catch-up +25% begins | Delve Frenzy (wknd) | The Combine Harvester | Returner win-back push |
| 6 | S-A Act III | Competitive: **"Spindle Sprint"** (72h tower ladder) | — | — | Re-engage competitives |
| 7 | S-A Act IV | Flash: **"Mushroom Rush"** (6h ×3 MD) + finale teaser | Double Tower Weekend | The Combine (rematch) | Last-call pass nudges (soft) |
| 8 | S-A finale + reset | **"Harvest Moon Finale"** (server-wide boss + ladder snapshot) | — | Gorbo: Final Form | Rewards mailed, intermission |
| 9 | **Intermission → S-B Act I launch** | **"Molten Ledger Opens"** (new season, new pass) | — | Baalgor, VP of Damnation | Fresh ladder, checkpoint floors |
| 10 | S-B Act I | Delve affix set: *Hasted + Miserly* | Double Tower Weekend | — | New season meta |
| 11 | S-B Act II | **"Audit Season"** (community goal) | Guild Gold Rush | Baalgor (rematch) | — |
| 12 | S-B Act II | Cosmetic drop: *Infernal Suit set* + holiday tie-in if applicable | Delve Frenzy | — | Monetization beat |

**Reading the calendar:** every week has *at least one* headline or recurring event, world bosses land 2–3×/week within these, and each season carries a narrative arc (with 02) rather than being a bag of unrelated events. Note how **recurring events (Double Tower Weekend, Guild Gold Rush, Delve Frenzy) are the cheap, reliable backbone** — they cost near-zero authoring and guarantee the "something's on" promise, while the named one-offs are where the team spends its creative budget.

---

## 9. Retention & Re-Engagement

### 9.1 Login streak system

- **Streak counter** increments once per UTC day the player takes any meaningful action (not just opens the app — must complete ≥1 daily task, to reward *playing* not *checking*).
- **Streak rewards** escalate then plateau (no runaway, so a 200-day player and a 30-day player aren't wildly apart):

| Streak day | Reward |
|:---:|--------|
| 1 | 200 G |
| 3 | 500 G + 100 SXP |
| 7 | Gear cache + 300 SXP |
| 14 | Cosmetic emote + MD |
| 21 | 200 SC + booster |
| 30 | **Seasonal cosmetic + title "the Faithful"** |
| Every +7 after 30 | Rotating chest (plateaued value) |

- **Streak insurance (anti-punishment).** Completing the daily all-clear banks 1 **"Streak Shield."** A missed day auto-consumes a shield instead of breaking the streak (max 2 banked). This forgives the occasional real-life day *without* a paywall — the shield is earned, not sold. Optional: 08 may offer a cosmetic "streak freeze" but the earned shield must always exist.
- **No punitive reset spiral.** Breaking a streak drops you to day 1, but *all milestone rewards already claimed are kept*, and re-climbing is faster (see 9.2). We never delete earned rewards for absence.

### 9.2 Comeback & win-back

Tiered by absence length, escalating warmth (this is the FOMO-antidote counterpart to §5.4):

| Absence | Trigger | Treatment |
|---------|---------|-----------|
| 2–3 days | On return | "We saved your spot" — rested SXP active (§5.4), streak shield check |
| 4–7 days | On return | **Comeback quest chain**: 3 easy quests → gear cache + SXP catch-up bundle |
| 8–21 days | Push + on return | **Welcome Back pass boost** (+50% SXP 3 days) + a free premium-store cosmetic sample |
| 22–60 days | Win-back push (08) | "Your guild misses you" + summary of what changed (new season/events) + big catch-up grant |
| 60+ days ("resurrection") | Win-back campaign (08) | New-season hook, hero un-changed, fast-forward to current content tier |

Key principle: **the returner always finds their hero intact and a clear, generous on-ramp** — never a wall of "you missed everything." Catch-up curves (§5.4) and checkpoint floors (§3.1) mean a 3-week absence costs *bonus rewards*, not *competitiveness*.

### 9.3 Milestone rewards (evergreen, non-seasonal)

Lifetime achievement track independent of seasons, so long-term players always have a distant goal: total floors climbed, total bosses slain, total seasons participated ("Veteran of N Seasons" titles), account age. Grants cosmetics + Legacy Marks. These are the "played for two years" flexes that seasons alone can't provide.

### 9.4 Push trigger taxonomy (with 08)

**08 owns notification delivery, copy, frequency capping, opt-in/quiet-hours, and channel (push/email/in-app).** 06 owns the *trigger taxonomy* — *when* a notification is warranted:

| Category | Trigger | Ethical guardrail |
|----------|---------|-------------------|
| **Actionable** | Tower stamina full; quest ready to collect; delve vault ready | Only if player opted in; caps at ~2/day |
| **Social** | Guild goal near completion; raid forming; you were passed on ladder | Requires social opt-in |
| **Live-ops** | Event starting/ending soon; world-boss window open | Frequency-capped per event |
| **Retention** | Streak at risk (with shield status); comeback bundle waiting | **Only fire if a shield can save them / genuine value waits — never manufactured urgency** |
| **Win-back** | 8+ day absence milestones (§9.2) | Hard cap; honors unsubscribe instantly |

> **Ethics rule (co-signed 06+08):** no notification may create false scarcity ("LAST CHANCE" when it isn't), and every push must point to a *real, present value or a genuinely-avoidable loss*. Quiet hours and per-user frequency caps are enforced by 08. Manipulative streak-anxiety pushes are banned — the streak shield exists precisely so we don't need them.

---

## 10. Content Cadence & LiveOps Operating Model

Built for a **small live team** (assume: 1 LiveOps designer, 0.5 engineer, 0.5 artist, 0.5 narrative shared from 02, part-time data analyst).

### 10.1 The cadence budget

The whole model rests on one insight: **most weeks must be cheap.** We spend creative budget on ~4 named events per season and let recurring events + the framework carry the rest.

| Frequency | What ships | Authoring cost | Who |
|-----------|-----------|----------------|-----|
| Daily | Auto: quest pool rotation, shop restock | Zero (data-driven) | Scheduler |
| Weekly | Recurring event + delve affix rotation | ~2 hrs (pick from templates) | LiveOps |
| Bi-weekly (act) | 1 named seasonal event | ~2–3 days | LiveOps + art + narrative |
| 8-week (season) | Theme, pass table, ladder, store, launch/finale | ~2 weeks lead | Whole team |
| Ad-hoc | Flash events, hotfix tuning | minutes–hours | LiveOps |

### 10.2 Season production timeline (running two seasons in parallel)

At any time the team is: **operating** the live season, **building** the next, and **researching** the one after. An 8-week season with ~2 weeks build lead means production starts at the current season's Act II.

```
Season N:   [====== LIVE (operate) ======]
Season N+1:        [== build ==][ QA ][launch]
Season N+2:                  [ concept ]
```

### 10.3 Operating rituals

- **Weekly LiveOps review:** last week's event participation, SXP pacing vs. target, economy faucet/sink (with 04), one tuning change if needed.
- **Mid-season health check (week 4):** pass completion pacing — are median players on track for week-7 finish? Adjust catch-up curve if not.
- **Season retro (intermission):** completion %, ladder participation, event winners/losers, what to reuse.
- **Runbook + kill-switches:** every live event has a documented rollback and a one-flag kill-switch (§7.3). On-call rotation for the launch/finale weekends (highest-load).

### 10.4 Tooling deliverable

The **LiveOps admin console** (M4, built with 09) is the force multiplier: form-driven event authoring over the §7 schema, staging preview with time-travel, grant-budget guards, live dashboards, and the kill-switch. Without it, the small team can't sustain the calendar — it is a *product feature disguised as internal tooling* and must be resourced as such.

---

## 11. Data Model, Jobs & Server Actions

All schema is **additive** (new tables / nullable columns). 09 owns the canonical schema; these are proposals. Prisma 7 / Postgres.

### 11.1 Proposed Prisma models

```prisma
// ---------- Seasons ----------
model Season {
  id            String   @id @default(cuid())
  key           String   @unique              // "harvest-havoc-2026"
  name          String
  theme         String
  startsAt      DateTime
  endsAt        DateTime
  state         SeasonState @default(SCHEDULED) // SCHEDULED|LIVE|INTERMISSION|ARCHIVED
  config        Json                            // acts, catch-up curve, currency list
  createdAt     DateTime @default(now())
  passes        BattlePass[]
  ladderEntries LadderEntry[]
  @@index([state, startsAt])
}

enum SeasonState { SCHEDULED LIVE INTERMISSION ARCHIVED }

// ---------- Battle Pass ----------
model BattlePass {
  id        String   @id @default(cuid())
  seasonId  String
  season    Season   @relation(fields: [seasonId], references: [id])
  tierCount Int      @default(50)
  xpPerTier Int      @default(1000)
  tiers     Json     // authored reward table (free+premium), see §5.3
  progress  PassProgress[]
  @@unique([seasonId])
}

model PassProgress {
  id           String  @id @default(cuid())
  passId       String
  userId       String
  pass         BattlePass @relation(fields: [passId], references: [id])
  sxp          Int     @default(0)
  tier         Int     @default(0)
  isPremium    Boolean @default(false)
  claimedFree  Int[]   @default([])   // tiers claimed
  claimedPrem  Int[]   @default([])
  updatedAt    DateTime @updatedAt
  @@unique([passId, userId])
  @@index([userId])
}

// ---------- Season currency & ladder ----------
model SeasonCurrency {          // per-user season-scoped balances
  id        String @id @default(cuid())
  seasonId  String
  userId    String
  kind      String              // "towerMarks"|"delveSigils"|"ichor"|"raidTokens"|"eventPoints"
  balance   Int    @default(0)
  updatedAt DateTime @updatedAt
  @@unique([seasonId, userId, kind])
  @@index([userId])
}

model LadderEntry {
  id        String @id @default(cuid())
  seasonId  String
  season    Season @relation(fields: [seasonId], references: [id])
  userId    String
  board     String              // "tower" | "guild"
  score     Int    @default(0)  // e.g. highest floor
  achievedAt DateTime            // tiebreak: earliest wins
  @@unique([seasonId, userId, board])
  @@index([seasonId, board, score])
}

// ---------- Endgame progress ----------
model TowerProgress {
  id            String @id @default(cuid())
  userId        String
  seasonId      String
  highestFloor  Int    @default(0)
  bestEver      Int    @default(0)   // persists across seasons (checkpoint calc)
  stamina       Int    @default(12)
  staminaSyncAt DateTime @default(now())
  @@unique([userId, seasonId])
}

model DelveKey {
  id        String @id @default(cuid())
  userId    String
  seasonId  String
  tier      Int    @default(1)
  affixes   Json                 // rolled affix ids
  vaultRuns Int    @default(0)   // resets weekly
  weekKey   String               // ISO week bucket for vault reset
  @@unique([userId, seasonId])
}

model WorldBossWindow {
  id          String @id @default(cuid())
  bossKey     String
  startsAt    DateTime
  endsAt      DateTime
  totalHp     BigInt
  currentHp   BigInt
  state       String @default("SCHEDULED") // SCHEDULED|ACTIVE|SLAIN|EXPIRED
  @@index([state, startsAt])
}

model WorldBossHit {              // per-user contribution (idempotent tickets)
  id          String @id @default(cuid())
  windowId    String
  userId      String
  damage      BigInt @default(0)
  ticketsUsed Int    @default(0)
  @@unique([windowId, userId])
}

// ---------- Dailies & streaks ----------
model DailyAssignment {
  id        String @id @default(cuid())
  userId    String
  dayKey    String              // "2026-07-07" UTC bucket
  quests    Json                // 3 rolled quest templates + progress + claimed
  rerolled  Boolean @default(false)
  allClaim  Boolean @default(false)
  @@unique([userId, dayKey])
  @@index([userId])
}

model LoginStreak {
  id            String @id @default(cuid())
  userId        String @unique
  current       Int    @default(0)
  longest       Int    @default(0)
  lastActiveDay String                // "2026-07-07" UTC
  shields       Int    @default(0)    // banked streak insurance (max 2)
  claimedMiles  Int[]  @default([])   // streak milestones claimed
}

// ---------- Live events (data-driven, §7) ----------
model LiveEvent {
  id            String @id @default(cuid())
  key           String @unique
  type          String              // RECURRING|SEASONAL|ONE_OFF|FLASH|COMMUNITY|COMPETITIVE
  seasonId      String?
  startsAt      DateTime
  endsAt        DateTime
  state         String @default("DRAFT") // DRAFT|SCHEDULED|LIVE|ENDED|ARCHIVED|KILLED
  definition    Json                // modifiers, objectives, track, store, presentation (§7.2)
  grantBudget   Int                 // per-user ceiling, validated on save
  killSwitch    Boolean @default(false)
  authorId      String              // audit
  createdAt     DateTime @default(now())
  progress      EventProgress[]
  @@index([state, startsAt])
}

model EventProgress {
  id          String @id @default(cuid())
  eventId     String
  userId      String
  event       LiveEvent @relation(fields: [eventId], references: [id])
  objectives  Json                 // per-objective counters
  points      Int    @default(0)   // event-local currency
  claimed     String[] @default([]) // claimed reward ids (idempotency)
  updatedAt   DateTime @updatedAt
  @@unique([eventId, userId])
  @@index([userId])
}

// ---------- Idempotent reward ledger (cross-cutting) ----------
model RewardGrant {
  id        String @id @default(cuid())
  userId    String
  source    String              // "pass:tier12" | "event:xyz:obj1" | "streak:30"
  payload   Json                // reward union: currency/gear/cosmetic/booster
  grantedAt DateTime @default(now())
  @@unique([userId, source])    // <- the anti-double-grant guarantee
  @@index([userId])
}
```

### 11.2 Scheduled jobs (→ 09 owns the scheduler/cron infra, per master plan module 09)

| Job | Schedule | Responsibility | Idempotency key |
|-----|----------|----------------|-----------------|
| `dailyRollover` | 05:00 UTC | Roll new `DailyAssignment`s, refresh shops/stamina, evaluate streak shields for missed days | `dayKey` |
| `weeklyRollover` | Mon 09:00 UTC | Reset delve vault, weekly guild goals, raid lockout (coordinate 05), award weekly ladder points | `weekKey` |
| `seasonStart` | on `Season.startsAt` | Flip LIVE, open pass/ladder, compute checkpoint floors, publish store | `seasonId` |
| `seasonEnd` | on `Season.endsAt` | Snapshot ladder → Hall of Legends, grant ladder rewards, convert season currency → Legacy Marks, open grace-claim window, flip INTERMISSION | `seasonId` |
| `worldBossSpawn` | cron (2–3/wk, rotating anchor) | Create `WorldBossWindow` sized to active pop | `windowId` |
| `worldBossResolve` | on window `endsAt` | Distribute tiered rewards by contribution | `windowId` |
| `eventActivate` / `eventDeactivate` | on event `startsAt`/`endsAt` | Flip LIVE/ENDED, open grace window, respect kill-switch | `eventKey` |
| `ladderSnapshot` | hourly | Refresh leaderboard cache (read-optimized) | timestamp |
| `passPacingReport` | daily | Emit SXP-pacing analytics for the mid-season health check | date |

**Job requirements for 09:** each job must be **idempotent** (safe to re-run after a crash mid-execution — guarded by the keys above), **observable** (structured logs + failure alerts, especially for `seasonEnd` which grants rewards), and **replayable** (a missed cron tick can be run late without double-granting). `seasonEnd` and `worldBossResolve` are the highest-stakes (they grant rewards to many users) and should run in idempotent batches inside a transaction, writing through the `RewardGrant` ledger.

### 11.3 Server action shapes (Next.js server actions, all server-authoritative)

```ts
// Dailies
getDailyBoard(): DailyBoard                          // rolls if absent
rerollDaily(): DailyBoard                             // once/day, server-checked
claimDailyQuest(questId): GrantResult                 // validates completion server-side
claimDailyAllBonus(): GrantResult

// Tower
getTowerState(): TowerState                           // recomputes stamina from staminaSyncAt
pushTowerFloor(): FloorResult                          // spends stamina, resolves combat (03), updates ladder

// Delves
getDelveKey(): DelveState
runDelve(dungeonId): DelveResult                       // applies weekly affixes, up/downgrades key
claimVaultReward(slotId, choiceId): GrantResult        // picks 1 of 3, once/slot/week

// World boss
getActiveWorldBoss(): WorldBossState                   // live shared HP
attackWorldBoss(): BossHitResult                       // spends a ticket, applies damage atomically

// Battle pass
getPassState(): PassState                              // sxp, tier, claimed
claimPassTier(tier, track): GrantResult                // guarded by RewardGrant unique key
// purchasePremium / buyTiers -> owned by 08 (storefront), calls 06 grant internally

// Season / ladder
getSeasonState(): SeasonSummary
getLadder(board, scope): LadderPage                    // cached snapshot
claimSeasonEndReward(): GrantResult                    // grace window

// Events (player-facing)
getActiveEvents(): EventCard[]
getEventProgress(eventKey): EventProgress
claimEventReward(eventKey, rewardId): GrantResult      // idempotent

// Streaks
getStreak(): StreakState                               // shields, milestones
// streak increments are a side-effect of any meaningful action, not a direct call

// LiveOps admin (gated, M4) — authoring without code
adminSaveEvent(def): ValidationResult                  // whitelist + budget validation
adminPreviewEvent(key, asOf): EventCard                // time-travel preview
adminKillEvent(key): void                              // instant kill-switch
```

**Every `GrantResult` path writes through the `RewardGrant` ledger with a unique `source` key** — the single mechanism that makes all grants idempotent (guardrail #3).

---

## 12. Milestone Phasing

Scoped against the master roadmap (M1–M5) so work sequences cleanly and cuts at any milestone.

| Milestone | Ships from this module | Notes / dependencies |
|-----------|------------------------|----------------------|
| **M1 — Foundation** | Nothing player-facing. **Prep only:** the `RewardGrant` idempotent ledger, the reward-union type, and the scheduler contract with 09 (Postgres + cron infra). Design the tunable-modifier whitelist stub. | Blocked on 09 scheduler + Postgres. This is the *foundation everything else grants through* — build it first. |
| **M2 — Depth** | **Endless Tower v1** (single-player loop + stamina + local milestone chests, no ladder yet). Daily quest system + daily rollover job. Login streak + shields. | Consumes 03's tower scaling curve; consumes 04's reward/shop tables. Tower is the highest-value M2 add because it's solo and needs no live infra. |
| **M3 — Endgame** | **Seasons v1** (structure, reset/persist, season currency with 04). **Battle pass** (free+premium, tier table, SXP economy — pricing with 08). **Weekly cadence** (guild goals, delve vault). **World bosses**. **Raid live-ops wrapper** (05 owns combat). Ladders + Hall of Legends. | The bulk of the module. Sequence: season container → pass → weekly loops → world boss. Delves+ affix layer here. |
| **M4 — Launch** | **Live Events framework + LiveOps admin console** (author-without-code). Comeback/win-back chains. Push trigger taxonomy wired to 08. Kill-switches, runbooks, on-call. Analytics dashboards. | The framework is what makes the game *sustainable*; without it M5 is unaffordable. Highest tooling investment. |
| **M5 — Live** | **The operating model in motion:** rolling 8-week seasons, the 12-week calendar cadence, tournaments (competitive events), post-50 prestige tiers, seasonal retros feeding the next season. | Pure content + tuning cadence on top of M4 systems. This is "keeping the lights on and the world alive." |

**Cut lines:** if we must ship at M3, we have seasons + pass + endgame loops but hand-author events via deploys (painful but possible). The M4 framework converts that pain into a scalable operation. Everything after M2 grants through the M1 ledger, so **M1 prep is the true critical path** — it is small but blocking.

---

## 13. Risks & Ethics

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Burnout / obligation.** Daily+weekly+season+events stack into a chore list; engaged players quit from fatigue. | High | Diminishing-reward vaults (§3.2) that *tell you to stop*; capped weekly SXP; streak shields; "warm vs hot" framing so most content is optional. No task list should feel mandatory. |
| **FOMO ethics.** Time-boxed rewards manufacture anxiety; players feel exploited. | High | Season currency auto-converts (no dead currency); catch-up curves + rested SXP; grace claim windows; **banned** false-scarcity notifications (§9.4); absence costs bonus rewards, never competitiveness or identity. |
| **Content treadmill.** Small team can't feed an 8-week season cadence; quality collapses. | High | The event framework (§7) makes most weeks near-zero-cost; recurring events carry the backbone; only ~4 bespoke events/season; two-season parallel pipeline (§10.2). If we can't afford the framework, we can't afford live-ops — resource it. |
| **Pay-to-win drift.** Premium pass/store creep toward selling power. | High | Guardrail #4: all power on premium is also earnable free or via season currency; ladders reward cosmetics only; co-signed with 08. Audited each season. |
| **Reward double-grant / exploits.** Retries, race conditions, replayed requests duplicate rewards. | High | `RewardGrant` unique-key ledger (guardrail #3); server-authoritative objective tracking; per-event grant budget ceiling; atomic world-boss damage. |
| **Season reset regret.** Players feel punished at reset (lost currency/rank). | Med | Clear persist-vs-reset contract (§4.2) communicated in-client; checkpoint floors; ladder → permanent Hall of Legends; 2-week conversion notice. |
| **Leaderboard cheating.** Fake tower floors / boss damage. | Med | All scores server-computed from combat (03); anti-cheat is a 09/M4 concern; earliest-tiebreak reduces last-second manipulation value. |
| **Time-zone unfairness.** World-boss/event windows favor one region. | Med | Rotating anchor hours; `rolling` timezone strategy option; participation floors so showing up beats being online at the perfect minute. |
| **Scheduler failure at reset.** A crashed `seasonEnd` corrupts rewards for thousands. | Med | Idempotent, batched, transactional, observable jobs (§11.2); replayable ticks; alerting on the two high-stakes jobs. |

**Ethics north star:** every live-ops mechanic is tested against Pillar 5 — *respect the player's time and trust*. If a mechanic's engagement lift comes from manufactured anxiety rather than genuine fun or value, we cut it, even if the metrics tempt us. The streak shield, currency conversion, and catch-up curves are all deliberate costs we pay to keep that trust.

---

## 14. KPIs & Instrumentation

Metrics this module owns, feeding the master KPI set (master plan §9).

**Headline (the ones we report up):**

- **D30 retention** — the ultimate proof the endgame + live spine works. Target: meaningfully above pre-endgame baseline; the season/pass/streak stack is the primary lever.
- **Season completion %** — share of active players finishing the free pass (target a *healthy majority* of engaged players) and premium pass. Under-target ⇒ pacing too steep; over-target ⇒ too trivial.
- **Event participation rate** — share of DAU touching the active event, per event type. Identifies dead events to cut and hits to reuse.

**Supporting metrics:**

| Area | Metric | What it tells us |
|------|--------|------------------|
| Dailies | Daily-quest completion rate; all-clear rate | Is the core habit forming? |
| Streaks | Streak distribution; shield-save rate; break→return rate | Habit strength; is insurance working? |
| Pass | SXP-pacing vs. target curve; tier-50 date distribution; catch-up usage | Is pacing humane? (mid-season health check) |
| Tower | DAU pushing tower; median floors/day; ladder participation | Solo endgame health |
| Delves | Vault-completion rate; key-tier distribution | Mastery-loop health |
| World boss | Windows killed; participation rate; contribution Gini | Server spectacle health; is it inclusive? |
| Raid | Weekly clear rate (with 05) | Social endgame health |
| Re-engagement | Comeback-chain start/complete rate; win-back reactivation rate by cohort | Are lapsed players returning? |
| Economy | Season-currency faucet/sink (with 04); conversion volume at reset | Season economy inflation check |
| Business | Pass conversion %; ARPDAU during events vs. baseline (with 08) | Honest monetization health |
| Ethics | Refund/complaint rate; notification opt-out rate | Are we keeping trust? (must stay near zero) |

**Instrumentation:** every domain event (`TOWER_FLOOR`, `DELVE_CLEAR`, `BOSS_HIT`, `RAID_CLEARED`, `PASS_TIER_UP`, `STREAK_TICK`, `EVENT_OBJECTIVE`, `REWARD_GRANT`) is logged with user, season, and source for the analyst's dashboards. The `passPacingReport` job (§11.2) is the early-warning system for the week-4 health check.

---

## 15. Open Questions & Cross-Module Contracts

**Contracts to ratify with siblings:**

- **03 (Combat/Progression):** exact tower per-floor scaling curve + stat budget; delve affix combat effects; prestige interaction with season persistence. *06 consumes; 03 defines.*
- **04 (Economy):** season-store prices, reward drop quantities, gold/mushroom faucet-sink balance, Legacy Marks evergreen store. *Joint: 06 designs season currency lifecycle, 04 balances.*
- **05 (Multiplayer/Guilds/PvP):** raid combat, lockout timing, guild-goal membership mechanics, guild ladder aggregation, PvP-season alignment. *06 provides the live-ops wrapper (calendar slot, tokens, XP, goal hooks); 05 owns the raid + PvP season combat. Align weekly reset timing.*
- **08 (Onboarding/Meta/Monetization):** pass price/storefront/instant-tiers; notification delivery + copy + capping; win-back campaigns. *Co-sign the "premium is never pay-to-win" and "no false-scarcity push" contracts.*
- **09 (Tech/Platform):** scheduler/cron infra, idempotent job runner, Postgres, the tunable-modifier whitelist registry, anti-cheat, the LiveOps admin console platform. *06 specifies job requirements; 09 owns the infra.*

**Open questions:**

1. **Season length A/B?** 8 weeks proposed; do we test 6 vs. 8 post-launch? (Analyst + LiveOps, M5.)
2. **PvP season alignment (05).** Does the PvP season share the 8-week boundary, or run on its own cadence? Recommend shared boundary for one unified "new season" moment.
3. **Cross-shard world bosses?** Single-shard at launch; do we merge shards for boss spectacle later? (09 infra question.)
4. **Legacy Marks scope.** How generous is the evergreen store? Must not undercut season stores. (04.)
5. **Guild-ladder fairness.** How do we normalize for guild size so small guilds can compete? (05.)

---

*End of Module 06. This doc owns the live spine and endgame loops; it consumes curves from 03, balance from 04, raid/PvP combat from 05, monetization/notifications from 08, and infrastructure from 09. All grants are idempotent and server-authoritative; all migrations are additive; every mechanic answers to Pillar 5.*
