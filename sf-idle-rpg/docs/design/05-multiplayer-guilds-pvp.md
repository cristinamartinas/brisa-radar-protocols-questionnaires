# 05 — Multiplayer, Guilds & PvP

> **Status:** ✅ Complete
> **Owner:** Senior Social/Multiplayer Designer · **Milestone focus:** M1–M5 · **Version:** 1.0
> **Depends on:** 03, 06, 07, 09 · **Last updated:** 2026-07-07

**Module summary.** This module turns *Quest & Cudgel*'s two shipped social stubs — an async arena that fights live opponents and a guild that is little more than a shared roster with a gold perk — into the game's retention spine and its beating social heart, in direct service of Pillar #4 ("asynchronous, never lonely"). It specifies a full guild stack (roles & permissions, treasury, an upgradable guild hall, a perk tree, contribution-driven guild quests, discovery and chat), a fair async PvP ladder built on **defense snapshots** and a **Glicko-2 rating system** with seasonal tiers and deterministic, spectatable replays, plus the friends/rivals/whisper social graph, the safety and anti-collusion layer that keeps all of it healthy, and integrity-hardened leaderboards. Everything is server-authoritative and every schema change is additive. The doc phases cleanly across M1→M5 and hands the raid/season *content cadence* to Module 06 while owning the *social mechanics* those systems run on; real-time transport (chat, live spectate) is owned by Module 09 and only referenced here.

---

## Table of Contents

1. [Design goals & guardrails](#1-design-goals--guardrails)
2. [Guild systems depth](#2-guild-systems-depth)
3. [Guild raids & wars](#3-guild-raids--wars)
4. [PvP arena](#4-pvp-arena)
5. [Tournaments & competitive events](#5-tournaments--competitive-events)
6. [Social graph & chat](#6-social-graph--chat)
7. [Safety & anti-toxicity](#7-safety--anti-toxicity)
8. [Leaderboards & integrity](#8-leaderboards--integrity)
9. [Data model & server actions](#9-data-model--server-actions)
10. [Milestone phasing](#10-milestone-phasing)
11. [Risks & mitigations](#11-risks--mitigations)
12. [KPIs & instrumentation](#12-kpis--instrumentation)
13. [Open questions & cross-module boundaries](#13-open-questions--cross-module-boundaries)

---

## 1. Design goals & guardrails

**What "social" must accomplish here.** In an idle-RPG the retention curve is won or lost on the *weekly* and *seasonal* horizons, and both are social. A solo player churns when the number stops going up; a guilded player logs in because six other humans are counting on their daily contribution and a rival is one rung above them on the ladder. Our north star: **a player's guild and their arena rival are the two most common reasons they open the app on day 8.**

**Guardrails inherited from the Master Plan:**

- **Server-authoritative, always.** Ratings, treasury balances, raid damage, war scores, and match outcomes are computed server-side. The client renders; it never asserts. This is non-negotiable and is the spine of every anti-cheat measure below.
- **Additive migrations only.** Every schema change in §9 adds tables or nullable/defaulted columns. Nothing shipped (the `Guild`, `Character.arenaWins/Losses`, `BattleLog` models) is dropped or repurposed destructively. `Guild.founderId` and the `+2%/member` gold perk survive as-is and are *extended*, not replaced.
- **Respect the player's time (Pillar #5).** Social obligations must be *generous*, not coercive. Guild dailies take one tap. Missing a day never bricks your standing. No feature may create a "log in or let your guild down" guilt loop harsh enough to punish the 2–5 min session shape.
- **Depth you can ignore (Pillar #3).** A newcomer taps "Fight" and "Quest for the Guild" and thrives. A veteran reads defense-snapshot meta reports and theorycrafts war rosters. Same systems, layered.
- **Async first (Pillar #4).** *Nothing* social may require two players to be online at once. Live spectate (§4.8) and live guild chat (§6.3) are the only real-time surfaces, both are strictly additive garnish over an async-complete core, and both route through Module 09's transport — never blocking gameplay if the socket is down.

**Determinism prerequisite (hard dependency on Module 03).** The shipped `resolveBattle()` in `src/lib/game.ts` uses unseeded `Math.random()` for damage variance and crits. **This must become a seeded, deterministic PRNG before any of the replay, spectate, war-scoring, or anti-cheat features below can ship.** The combat contract we require from 03 is: `resolveBattle(me, foe, seed)` → identical `rounds[]` for identical `(me, foe, seed)` on any server, forever. This single change unlocks §4.8 (replays are just `(snapshotA, snapshotB, seed)` re-run client-side), verifiable outcomes (the server stores only the seed + inputs, not the whole log, and can re-derive on dispute), and integrity (§8). We flag it here as the #1 cross-module blocker.

---

## 2. Guild systems depth

Guilds are the durable social unit. Today a guild is `{name, tag, description, founderId, members[]}` plus a capped +2%/member quest-gold perk. We keep all of that and build a progression game on top of it.

### 2.1 Roles & permissions matrix

Five roles, ordered by authority. Roles are per-guild and stored on the membership join row (`GuildMembership.role`), not on the `Character`, so a player's role travels with the guild they're in.

| Role | Slots | Intent |
|---|---|---|
| **Guildmaster (GM)** | exactly 1 | The `founderId` bootstraps as GM. Full control. Every guild has exactly one. |
| **Officer** | up to `ceil(cap × 0.20)` | Trusted lieutenants: recruit, moderate, run wars. |
| **Veteran** | unlimited | Earned tenure: extra treasury draw, war-roster eligibility. |
| **Member** | unlimited | Default on join. Full participation, no admin. |
| **Recruit** | unlimited | First 72h or until an officer promotes. Probationary; limited treasury/chat. |

**Permission matrix** (✅ allowed · ⬚ denied · ⚙️ configurable by GM per-guild):

| Permission | GM | Officer | Veteran | Member | Recruit |
|---|:--:|:--:|:--:|:--:|:--:|
| Edit guild name/tag/description/banner | ✅ | ⚙️ | ⬚ | ⬚ | ⬚ |
| Set recruitment policy (open/apply/invite) | ✅ | ✅ | ⬚ | ⬚ | ⬚ |
| Invite / accept join requests | ✅ | ✅ | ⚙️ | ⬚ | ⬚ |
| Kick Recruit/Member | ✅ | ✅ | ⬚ | ⬚ | ⬚ |
| Kick Veteran | ✅ | ⚙️ | ⬚ | ⬚ | ⬚ |
| Promote/demote up to Officer | ✅ | ⬚ | ⬚ | ⬚ | ⬚ |
| Promote to Officer | ✅ | ⬚ | ⬚ | ⬚ | ⬚ |
| Deposit to treasury | ✅ | ✅ | ✅ | ✅ | ✅ |
| Withdraw from treasury | ✅ | ✅ | ⚙️ | ⬚ | ⬚ |
| Start guild hall upgrade / spend treasury | ✅ | ⚙️ | ⬚ | ⬚ | ⬚ |
| Allocate perk-tree points | ✅ | ⚙️ | ⬚ | ⬚ | ⬚ |
| Declare war / accept war | ✅ | ✅ | ⬚ | ⬚ | ⬚ |
| Set war roster & slots | ✅ | ✅ | ⬚ | ⬚ | ⬚ |
| Start / contribute to guild raid | ✅ | ✅ | ✅ | ✅ | ⚙️ |
| Post guild announcement (pinned) | ✅ | ✅ | ⬚ | ⬚ | ⬚ |
| Guild chat: send | ✅ | ✅ | ✅ | ✅ | ⚙️ |
| Guild chat: moderate (delete/mute) | ✅ | ✅ | ⬚ | ⬚ | ⬚ |
| Transfer leadership | ✅ | ⬚ | ⬚ | ⬚ | ⬚ |
| Disband guild | ✅ | ⬚ | ⬚ | ⬚ | ⬚ |

Every mutating action is validated server-side against this matrix in the corresponding server action (§9.3). The client hides buttons the player can't use, but the **server is the enforcer** — a forged request from a Member calling `kickMember` is rejected regardless of UI state.

**Configurable (`⚙️`) permissions** are stored as a JSON `permissionOverrides` blob on the `Guild`, defaulting to the table above. This gives serious guilds Clash-of-Clans-grade control without shipping 40 toggles on day one.

### 2.2 Member cap & guild tiers

Guild capacity is *earned*, tying roster growth to the hall progression (§2.4) so a guild's size reflects its investment, not just its age.

| Guild Tier | Hall level req | Member cap | Unlocks |
|---|---|---|---|
| I — Warband | 1 (default) | 15 | Treasury, guild chat, basic perks |
| II — Company | 5 | 25 | Guild quests, hall rooms tier 2, war eligibility |
| III — Order | 12 | 40 | Guild raids, perk tree tier 2, tournaments |
| IV — Legion | 20 | 60 | Perk tree tier 3, cross-server war, custom banner |
| V — Dynasty | 30 | 75 (hard cap) | Prestige perks, Hall of Legends cosmetics |

The 15-member starting cap (vs. today's implicit unlimited) is deliberate: small guilds have higher per-member accountability and D7 lift. 75 is the hard ceiling — beyond it, coordination decays and moderation load spikes (see §7). Existing over-cap guilds at migration are grandfathered (no forced kicks) but cannot recruit until under cap.

### 2.3 Treasury / bank

A shared `gold` pool (and later a shared premium-adjacent **Guild Seal** currency — see boundary note with Economy/04). The treasury is the economic engine of guild progression.

- **Deposit:** any member, any amount of personal gold. Deposits are logged (`GuildLedger`) with actor + amount + timestamp for transparency and anti-collusion forensics.
- **Withdraw:** gated by role (§2.1) and a **rolling weekly cap** per role (GM: unlimited; Officer: 25% of balance/week; Veteran: 5%/week if `⚙️` enabled). Caps blunt a rogue officer draining the bank.
- **Sinks the treasury feeds:** hall upgrades (§2.4), perk-tree research (§2.5), raid entry stakes and war declaration fees (§3), and guild-quest reward multipliers.
- **Faucets:** member deposits, a share of guild-quest gold, war/raid victory payouts, and a small automatic tithe option (members can opt-in to auto-deposit X% of quest gold — never forced).
- **Transparency:** the `GuildLedger` is visible to all members (deposits) and to Officers+ (withdrawals). Sunlight is the cheapest anti-collusion tool we have.

**Anti-abuse:** withdrawal velocity, new-member-then-drain patterns, and deposit/withdraw round-tripping between two accounts are flagged to §7's anti-collusion job. Treasury gold is **soft-locked for 24h after a member joins** before they can benefit from withdrawals (kills "hop in, drain, hop out").

### 2.4 Guild hall (upgradable rooms/buildings)

The hall is the guild's base and its progression canvas — the Clash-of-Clans depth beat. It has a **Hall Level** (the tier gate, §2.2) and discrete **rooms**, each independently upgradable, each granting a perk. Rooms are bought/upgraded with treasury gold (and Guild Seals at higher tiers), consuming a **build queue** (1 concurrent upgrade at Tier I–II, 2 at III+) so progression is paced and every member sees the hall visibly grow (Pillar #1, "the world is alive").

| Room | Perk (per level, ×10 levels) | Fantasy |
|---|---|---|
| **Great Hall** | Raises Hall Level → member cap & tier gates | The heart; everything routes through it |
| **Treasury Vault** | +max treasury cap; −5%/lvl upgrade costs | Where the gold lives |
| **War Room** | +1 war roster slot every 2 lvls; war score bonuses | Strategy table for GvG |
| **Training Yard** | +0.5%/lvl guild-wide XP from quests | Members level faster together |
| **Alchemy Lab** | +0.5%/lvl guild-wide quest gold (stacks w/ founding perk) | Extends the shipped gold perk |
| **Barracks** | +HP/attack buff to members in guild raids & wars | Combat power for group content |
| **Tavern** | +chat slow-mode relief, +cosmetic emotes, morale buff | The social room; pure warmth |
| **Trophy Hall** | Displays raid/war/tournament trophies; small vanity buff | Bragging rights made visible |

Perk values are intentionally small per level (0.5%–2%) and **capped in aggregate** so a maxed veteran guild is meaningfully stronger than a fresh one (target: **~+15–20% effective throughput at Hall V vs. Tier I**) without making guildless play non-viable — a guildless whale must still be able to top the Hall of Fame on skill. Economy (04) owns final tuning of gold-facing perks so faucet/sink ratios hold.

### 2.5 Guild tech / perk tree

Distinct from rooms: the **perk tree** spends a guild-only research currency (**Guild Knowledge**, earned from guild quests and raids) on a branching tree the GM/Officers allocate. Three branches echo the three classes' fantasies but apply guild-wide:

- **Might** (Warrior-flavored): raid/war damage, member HP, war-defense bonuses.
- **Cunning** (Scout-flavored): quest gold, treasury efficiency, extra guild-quest slots, recruit-visibility boosts.
- **Lore** (Mage-flavored): XP throughput, research speed, raid mechanic reveals, cosmetic unlocks.

Each branch has 3 tiers gated by Guild Tier (§2.2). Nodes cost escalating Knowledge; a **respec** costs a flat Seal fee (guilds evolve their meta across seasons). This is the "3 a.m. theorycraft" surface (Pillar #3) for guild leaders — coordinate with 03 so guild perks compose cleanly with personal talent trees and never double-dip a stat past its intended cap.

### 2.6 Guild quests & contributions

The **weekly guild-goal** layer of the retention spine ("daily quests → weekly guild goals → seasonal ladders"). Each week the guild receives a slate of **guild quests** — aggregate goals met by *member contributions*:

- Examples: "Complete 500 quests as a guild," "Deal 2M raid damage," "Win 300 arena fights," "Clear Dungeon III floor 10 with 8 members."
- **Contribution tracking:** every relevant player action emits a contribution event (server-side) crediting the member and the guild. `GuildContribution` rows aggregate per member per week for a **contribution leaderboard** — the single best anti-freeloader and pro-engagement mechanic we have. Officers see who's carrying and who's coasting; the game surfaces "you're the #2 contributor this week!" nudges (Pillar #1 juice).
- **Rewards:** completing guild quests fills a **weekly guild chest** (gold to treasury + Guild Knowledge + Seals + member-claimable loot), scaled by *each member's* personal contribution — so effort maps to reward and freeloading is visibly unrewarded, but generously (a low contributor still gets a baseline; we don't punish the casual).
- **Generosity guardrail:** the *full* weekly chest must be achievable by an active-but-casual 20-person guild in normal play. Hardcore goals are *bonus* tiers, not the baseline. This keeps Pillar #5 intact.

Guild quests are **content**, and their theming/cadence/seasonal rotation are owned by **Module 06** (Live-Ops); this module owns the *contribution mechanic and reward-scaling math*. That is the boundary.

### 2.7 Recruitment & discovery

Churn's biggest social leak is the guildless player who can't find a home. Discovery must be excellent.

- **Recruitment policies** (GM/Officer set): **Open** (auto-join), **Apply** (join request → officer approval), **Invite-only**.
- **Guild Finder:** searchable/filterable directory beyond today's top-12-by-total-level `loadGuilds()`. Filters: language, activity level (avg member logins/week), focus tags (`Casual`, `Hardcore`, `PvP`, `Raiding`, `Social`, `New-friendly`), member-count band, tier, timezone. Ranking blends activity + openings + tier, **not** just total level (raw level ranking punishes new guilds and creates a rich-get-richer monopoly).
- **Recommended For You:** surfaces guilds matching the player's level band, class, timezone, and activity — a small ML-free heuristic score at first.
- **Guild ads:** GMs post a short pitch to a rotating "Recruiting Now" board (moderated, §7).
- **Onboarding hook (with 08):** the FTUE nudges a guildless player into a starter/"New-friendly" guild by ~level 5. Getting a player into a guild in their first two sessions is the single highest-leverage retention action; this is a shared KPI with 08.

### 2.8 Guild chat

See §6.3 for chat architecture. Guild chat is the default channel, persists async (a member reads it whenever they log in — never requires anyone online), supports pinned announcements (Officer+), system messages (member joined, hall upgraded, raid started, war won — all juice per Pillar #1), and inherits the safety stack (§7). Real-time delivery is a garnish via 09; the async message log is the source of truth.

### 2.9 Mergers, disband, transfer leadership

Lifecycle events, all server-authoritative and logged:

- **Transfer leadership:** GM → any current member. Two-step confirm; if the target is offline, a pending transfer they accept on next login. The old GM becomes Officer.
- **GM inactivity succession:** if the GM is inactive **≥ 21 days**, Officers can initiate a succession vote (or auto-promote the highest-contribution Officer after 30 days). Prevents dead-GM guild lockout — a top churn-and-frustration source in competitors.
- **Disband:** GM-only, hard confirm (type guild name). Treasury is *not* pocketed by the GM — it's distributed pro-rata by 30-day contribution to members (anti-scam: a GM can't disband-and-run with the bank). 7-day undo window on the guild name to prevent grief-squatting.
- **Merger:** two GMs agree; the smaller guild's members flow into the larger (subject to cap), treasuries combine, hall levels take the max, roles re-seat (one GM steps to Officer). A big-league feature for M5 consolidation seasons; behind Tier III.

---

## 3. Guild raids & wars

> **Boundary with Module 06 (Endgame & Live-Ops):** Module 06 owns raid **boss content, encounter mechanics, the infinite-tower/season *frame*, and the LiveOps calendar** that schedules when raids and war seasons run. This module owns the **social scaffolding**: how a guild *enters* group content together, how individual contributions are *scored and attributed*, matchmaking between guilds, and reward *distribution*. Concretely: 06 designs the boss; 05 designs the raid lobby, the damage-attribution ledger, and the loot split. We share the `GuildRaid`/`GuildRaidContribution` tables (§9), 06 owns the boss/encounter tables. Any change to that seam is a joint decision.

### 3.1 Shared boss raids

- **Format:** async, cooperative. A guild starts a raid (Officer+, costs a treasury stake). The boss has a large HP pool and a **time window** (e.g., 3 or 7 days). Members "attack" on their own schedule — each attack runs a deterministic combat resolution (their hero snapshot vs. the boss) and deals damage logged to `GuildRaidContribution`. **No two members need be online together.**
- **Attacks & recharge:** each member gets N attacks/day (Barracks room and perks add more). This paces engagement into daily touchpoints — the daily-quest → guild-goal bridge.
- **Mechanics (06 owns specifics):** bosses have phases, weaknesses (e.g., "takes +30% from Mages this phase"), and enrage timers, giving guilds a coordination puzzle (who attacks when, which classes) that lives in chat — depth for the hardcore, ignorable for the casual who just taps "Attack."
- **Rewards:** boss-kill fills a raid chest split by contribution (same generosity guardrail as §2.6: everyone who participated gets meaningful loot; top contributors get more). Guild Knowledge + Seals + gear tokens.
- **Difficulty tiers:** each raid offers difficulty tiers gated by Guild Tier; higher tiers = better rewards + harder mechanics. Seasonal raid rotation is 06's cadence.

### 3.2 Guild-vs-guild wars

The competitive counterpart to cooperative raids, and the guild-scale analog of the arena ladder.

- **Matchmaking:** wars are matched by **Guild War Rating (GWR)** — a guild-level Glicko-2 rating (same engine as personal arena, §4.3), seeded from aggregate member ratings + hall tier. This prevents a Tier V Dynasty from farming a Tier I Warband. Async: the system pairs guilds of similar GWR each war cycle.
- **War format (async, snapshot-based):** each guild fields a **war roster** (War Room room sets slot count, e.g., 10–30). At war lock-in, each rostered member's **defense snapshot** (§4.1) is frozen. During the war window (e.g., 48h), each attacker on your side gets a limited number of attacks against enemy defenders; each attack is a deterministic snapshot-vs-snapshot fight. **Nobody needs to be online**; you attack the frozen enemy roster whenever you log in.
- **Scoring (Clash-of-Clans-inspired, star-based for readability):**
  - Each successful attack on an enemy defender awards **stars** (e.g., win = 1 star; win with your hero surviving above 50% HP = 2 stars; flawless/fast win = 3 stars).
  - Each defender can only be "3-starred" once by the whole guild; subsequent attacks only score if they beat the prior best (encourages spreading attacks, rewards improvement — the CoC pattern that keeps every member relevant).
  - Guild war score = Σ best stars per enemy defender. Tiebreak: total damage %, then fewer attacks used.
- **Rewards:** GWR change (feeds §3.3 war league), war chest (treasury + Knowledge + Seals + seasonal war currency), and a **War Trophy** for the Trophy Hall on decisive wins. Losing is soft: small consolation chest, modest GWR loss — Pillar #5, no despair spirals.
- **Anti-blowout:** GWR matchmaking + a mercy rule (a hopelessly-behind guild's remaining attacks still earn contribution credit so members aren't demotivated mid-war).

### 3.3 War leagues & seasons

Wars roll up into a **seasonal War League** (frame owned by 06's season system; ladder mechanics owned here): guilds are placed in leagues (Wood → Iron → Bronze → … → Champion) by GWR, promote/demote each season, and earn league rewards. This is the guild-scale seasonal ladder that mirrors the personal arena ladder (§4.4) and gives guilds a season-long arc. Cross-server war (Tier IV) widens the pool at the top so Champion-league guilds always find worthy opponents (needs 09's cross-shard support — flagged as a dependency).

---

## 4. PvP arena

Today's `fightArena()` picks a *live* random opponent from 25 characters and runs `resolveBattle` with unseeded RNG. We rebuild it into a fair, rated, seasonal async ladder. Two changes are foundational: **defense snapshots** (fairness + async) and **seeded deterministic combat** (fairness + replay + integrity).

### 4.1 Async duel fairness: the snapshot model

**Problem with the shipped model:** fighting a live `Character` row means (a) you fight their *current* gear, which changes under them, making outcomes non-reproducible; (b) there's no notion of a *defense* the defender controls; (c) it can't be replayed or audited; (d) it exposes live opponent data on demand (scraping/targeting risk). We fix all four with snapshots.

- **Defense snapshot:** each player maintains a **defense loadout** — their hero as it will be *attacked* when they're offline. By default it mirrors their current equipped hero, auto-refreshing on meaningful change (level-up, gear swap) unless the player **pins** a specific defensive setup (letting theorycrafters build a dedicated defense — depth, Pillar #3). A snapshot is an immutable, versioned copy of the combat-relevant stats (attributes + equipped item bonuses + class + level) written to `DefenseSnapshot`.
- **Attacks fight snapshots, never live rows.** When you attack, you fight the opponent's *current* `DefenseSnapshot` version. This makes every fight reproducible from `(attackerSnapshot, defenderSnapshot, seed)`.
- **Snapshot staleness handling (a named risk, §11):** snapshots refresh on the defender's meaningful stat changes and, as a backstop, if older than **T hours** the next attack against them triggers a lazy refresh before the fight. This bounds "I fought a version of you from three days ago." Staleness is a fairness/feel tradeoff: too fresh and it's just live-fighting (non-reproducible); too stale and it's unfair. Target **T = 24h** with event-driven refresh doing most of the work.
- **First-strike fairness:** the shipped combat gives first strike to higher dexterity, a large edge. In rated PvP we (with 03) either (a) split the swing — attacker acts first only on a dex tie broken by a seeded coin — or (b) add a small initiative variance so dex is an *edge*, not a guaranteed kill. **The attacker should not have an insurmountable structural advantage**, or the ladder becomes a coin-flip on who clicks first. This is a joint tuning task with 03.

### 4.2 Defense setups

- Players configure a **defense loadout** separate from their questing loadout if they choose (M3+): pin gear, choose a defensive stance (e.g., +CON/−STR skew) once 03's skills/stances exist.
- Defense outcomes matter: a **Defense Log** shows the player who attacked them, the result, and a replay (§4.8) — closing the loop and seeding rivalries (§6.2) and revenge (§4.6). Getting attacked while offline and seeing "you successfully defended 4 times today" is a retention hook and a warmth beat.

### 4.3 Matchmaking & rating system — **Glicko-2** (proposed model)

**Recommendation: Glicko-2**, not raw Elo. Rationale for an async idle-RPG:

- Elo assumes regular play and a single volatility; it mis-rates returning players and sporadic sessions — exactly our audience (2–5 min, 3–6×/day, with gaps).
- Glicko-2 tracks **rating (r)**, **rating deviation (RD)** (uncertainty), and **volatility (σ)**. RD *grows while you're inactive*, so a returning player is matched cautiously and their rating self-corrects fast — ideal for our session shape and a strong **anti-smurf** lever (a new/low-confidence account has huge RD and moves fast toward its true skill instead of farming beginners for a whole season).
- It's cheap: rating updates in **rating periods** (we batch per **6h**), which suits async and server-authoritative computation.

**Parameters (starting point, tune in M3 beta):**

- Initial rating **r₀ = 1500**, initial RD **350**, initial volatility **σ = 0.06**, system constant **τ = 0.5** (constrains volatility change; lower if we see rating swings).
- Rating floor per tier (§4.4) so a bad streak can't tank you below your tier's basement — protects Pillar #5 feel.
- **Rating period = 6h**; a player's fights in a period are batched into one Glicko-2 update. Fewer than K fights in a period → RD still decays toward inactivity growth.

**Matchmaking algorithm (async, snapshot pool):**

1. Candidate pool = players whose rating is within a widening band of the attacker's: start **±100**, widen by **±50 every 200ms** of search up to **±400**, then fall back.
2. Prefer candidates with **RD < 100** (confident ratings) for rating-relevant matches; unconfident opponents give reduced rating stakes.
3. Exclude: same guild (no rating-farming teammates), recent opponents (last **N=10**, anti-farm), the player's own alts (device/IP heuristics from §7), and anyone the player has **blocked** (§6).
4. **NPC fallback (keep the shipped behavior):** if no fair human is found (low-pop tiers, off-hours), generate a rating-appropriate NPC via the existing `randomOpponent(level)` path — **but NPC fights award reduced/zero rating** (they're for gold/practice/streak-continuity, not ladder climbing) so the ladder can't be farmed against bots. This preserves "never lonely" at low population while protecting integrity.
5. **Rating stake formula:** expected score `E = 1 / (1 + 10^((r_opp − r_me)/400))` (Glicko's g(RD)-weighted form); actual rating delta from the Glicko-2 update. Beating a higher-rated, low-RD opponent moves you most.

**Why not a simpler "level bracket" system?** Level ≠ skill ≠ gear power. Two level-40 heroes can differ 3× in effective power via affixes (04) and talents (03). Rating captures *actual match outcomes*, which is the only fair currency for a ladder. We *also* use a **power score** (a server-computed estimate of a snapshot's combat strength, from 03's stat model) as a **secondary matchmaking signal and a smurf/sandbagging detector** (huge power + low rating = flag, §7), but rating is primary.

### 4.4 Ranked tiers & divisions

Human-legible tiers layered over the raw rating number (players read "Gold II," not "1523"):

| Tier | Rating band | Divisions | Flavor |
|---|---|---|---|
| Wood | 0–1099 | IV–I | "Swinging a literal stick" |
| Iron | 1100–1349 | IV–I | Getting the hang of it |
| Bronze | 1350–1599 | IV–I | Competent brawler |
| Silver | 1600–1849 | IV–I | Arena regular |
| Gold | 1850–2099 | IV–I | Local champion |
| Platinum | 2100–2349 | IV–I | Regional threat |
| Diamond | 2350–2599 | IV–I | Elite |
| Master | 2600–2799 | — | Best of the server |
| **Grandmaster** | 2800+ | top **500** only, ranked #1..N | The Hall-of-Fame of PvP |

- **Divisions** give frequent promotion dopamine (Pillar #1) between the big tier jumps. Promotion crossing a tier boundary triggers a **promo celebration** (Game Feel/07 owns the juice; this module fires the `PVP_PROMOTE` event).
- **Rating floors** per tier prevent demotion below the tier basement mid-season (anti-tilt).
- **Grandmaster** is a *ranked ladder* (literal positions 1..500), not a band — the aspirational apex, cross-referenced into the Hall of Fame (§8).

### 4.5 Seasonal ladder & rewards

- **Season length:** **8 weeks** (aligns with 06's season frame — 06 owns the calendar; we own the arena ladder's reward table and reset rules).
- **Soft reset each season:** rating pulled toward the mean via `r_new = r₀ + (r_old − r₀) × 0.6` (compresses the top, keeps relative order, forces re-climbing without erasing identity). RD is re-inflated modestly so the early-season ladder re-sorts quickly.
- **Rewards** (claimed at season end, by *peak* tier reached — not final, so a late-season slump doesn't rob you; anti-tilt, Pillar #5):

| Peak tier | Gold | Season currency | Mushrooms | Cosmetic |
|---|---|---|---|---|
| Wood | small | — | — | — |
| Iron | ✓ | ✓ | — | Iron banner sigil |
| Bronze | ✓✓ | ✓✓ | — | Bronze frame |
| Silver | ✓✓ | ✓✓✓ | — | Silver frame + emote |
| Gold | ✓✓✓ | ✓✓✓✓ | small | Gold weapon skin |
| Platinum | ✓✓✓ | ✓✓✓✓✓ | ✓ | Animated frame |
| Diamond | ✓✓✓✓ | max | ✓✓ | Diamond aura (VFX/07) |
| Master | ✓✓✓✓ | max | ✓✓✓ | Exclusive title + mount |
| Grandmaster | max | max | ✓✓✓✓ | Unique per-season legendary cosmetic + leaderboard immortalization |

Cosmetic-only prestige (banners, frames, auras, titles) keeps monetization honest (Pillar #5): PvP rewards flex, they don't sell power. Season currency spends in 06's season shop. Exact numbers are tuned jointly with 04 (economy) and 06 (season shop).

### 4.6 Revenge & rivalries

- **Revenge:** when someone beats your defense, they enter your **Defense Log** with a one-tap **Revenge** button (a directed rematch against their current snapshot). Revenge wins give a small bonus; this is the cheapest, stickiest re-engagement loop in the whole ladder — a personal, named reason to come back.
- **Rivalries (auto-detected):** repeated back-and-forth between two players (≥3 fights each way in a week) promotes them to **Rivals** (§6.2), unlocking a rivalry mini-scoreboard ("You lead 7–5"), taunt emotes, and a season-end "Rivalry Recap." This manufactures the "real rivals" half of Pillar #4 from organic play.

### 4.7 The daily/streak layer

To convert the arena into a *daily* habit without coercion: a **daily fight objective** (win 3 arena fights → bonus chest), a **win-streak bonus** (escalating gold/season currency, resets on loss — a gentle push, never a punishment), and an **attack-charge** system (limited *rating-relevant* attacks per day, e.g., 10, refillable; unlimited *unranked* practice fights). Capping ranked attacks/day protects the ladder from whales grinding thousands of fights and keeps matchmaking pools fair — and respects Pillar #5's session shape.

### 4.8 Spectate & replay of the deterministic combat log

The payoff of seeded determinism (§1):

- **Replay:** any fight is stored as `(attackerSnapshotId, defenderSnapshotId, seed, outcome)` — a handful of bytes, **not** the full round log. The client re-runs `resolveBattle(a, b, seed)` to reproduce the exact blow-by-blow (`rounds[]`) on demand. Cheap storage, perfect fidelity, and self-auditing: if a client ever renders a different result than the server's stored outcome, that's a tamper signal.
- **Shareable:** replays get a short code/URL so players share big wins (viral loop, warmth). Guild chat auto-posts noteworthy replays (a Grandmaster upset, a war-deciding 3-star).
- **Live spectate (M4+, via 09):** during tournaments/wars, followers/guildmates can watch fights resolve in near-real-time. This is the *only* real-time-required PvP surface and is strictly additive — the async replay is always available regardless. Transport, scaling, and fan-out are **Module 09's** problem; we define the event payload (`{fightId, snapshots, seed}`) and let 09 deliver it.
- **Combat log format:** we keep the shipped human-readable `rounds: string[]` for the async battle history UI, but the *canonical* stored artifact becomes the compact seed-tuple; `rounds[]` is a derived, rehydratable view. (Migration: `BattleLog` gains `seed`, `attackerSnapshotId`, `defenderSnapshotId`, `ratingDelta` — all additive/nullable.)

---

## 5. Tournaments & competitive events

> **Boundary with 06:** 06 owns the **event *calendar and cadence*** (when tournaments run, seasonal themes, cross-promotion with the battle pass). This module owns the **bracket/competition *mechanics and formats***. 06 says "run a PvP tournament in season week 4"; 05 defines how the bracket seeds, resolves, and pays out.

- **Async brackets:** since fights are snapshot-based and deterministic, a full single/double-elimination bracket can resolve **without any player online** — snapshots are captured at lock-in, the server resolves each round on schedule, players get push notifications to watch their replays. This is a genuinely novel, format-defining advantage of our determinism investment: a **1,024-player async tournament that plays itself out over a weekend** while everyone lives their lives.
- **Formats:**
  - **Weekly Gauntlet:** open-entry, async single-elim, small stakes, casual on-ramp.
  - **Seasonal Championship:** top-N by rating auto-qualify; double-elim; big cosmetic prestige + Grandmaster leaderboard glory.
  - **Guild Tournaments:** brackets of *guilds* using war rules (§3.2) — feeds War League (§3.3).
  - **Special/holiday events:** modifier tournaments ("Crit Chaos: everyone has 3× crit") for variety and satire (Pillar #2). Modifiers are content — 06 themes them.
- **Seeding & fairness:** seed by rating with RD-aware placement; bye distribution favors no one; all bracket results are replayable/auditable (§8 integrity).
- **Cadence:** Weekly Gauntlet every week, Seasonal Championship at each season's climax, Guild Tournaments mid-season, holidays as 06 schedules. Cadence is 06's to set; the *formats* are ours.

---

## 6. Social graph & chat

The connective tissue that makes the world feel populated (Pillar #4) even in a solo session.

### 6.1 Friends

- **Friends:** mutual (request → accept). See friends' online/last-seen presence, level, guild, arena tier. Actions: whisper (§6.4), spectate their fights, send a daily **gift** (small gold/energy — a warmth + soft-virality loop, capped to avoid farming).
- **Friend discovery:** from recent opponents, guildmates, rivals, and (M4+) contact/social invites (08 owns acquisition funnels). A referral hook lives with 08; the *friendship mechanic* lives here.
- **Cap:** generous but bounded (e.g., 200) to keep the graph and its queries sane.

### 6.2 Rivals & block

- **Rivals:** auto-promoted from repeated arena clashes (§4.6) or manually starred. A rivalry carries a head-to-head record and seasonal recap. Rivals are *positive* competitive relationships — the game frames them warmly/satirically, never as harassment vectors.
- **Block:** unilateral, silent. Blocking removes the target from your chat visibility, whispers, matchmaking-visibility where feasible, and gifting. Block is a **safety primitive** (§7), always available, never notifies the blocked party. Blocks are honored server-side across every surface.

### 6.3 Chat channels architecture

Three channel classes; **all transport referenced to Module 09** (websocket/SSE). This module owns the *product* (channels, moderation, persistence, UX); 09 owns the *pipe*.

| Channel | Scope | Persistence | Real-time (09) | Notes |
|---|---|---|---|---|
| **Guild** | one per guild | Async log is source of truth (last ~500 msgs) | Live delivery when online | Default channel; pinned announcements; system events |
| **Whisper/DM** | 1:1 | Async inbox | Live when both online | Friends/rivals/guildmates; strangers gated (§7) |
| **Global/Zone** | server or level-band shard | Ephemeral (short retention) | Live | Heavily rate-limited & filtered; opt-in; **slow-mode** by default |
| **War/Raid** | per active war/raid | Async log for event duration | Live | Coordination room; auto-archived after event |

**Architecture principles:**

- **Async-first, real-time-optional.** Every channel has a persisted message log (Postgres via 09's schema) that fully functions if the socket is down — you read guild chat on login regardless. Real-time is a *delivery optimization*, never a correctness requirement. This is the direct expression of Pillar #4 at the transport layer.
- **Server-authoritative moderation.** Every message passes the §7 pipeline (filter → rate-limit → store → fan-out) server-side before any client sees it. No client-trust.
- **Fan-out & scaling are 09's contract.** We specify: message shape, channel membership rules, ordering/idempotency needs (each message a server-assigned monotonic id), and retention windows. 09 chooses the transport, presence service, and scaling model. We do **not** design the infra here (per the brief).
- **Presence:** online/away/offline + "in arena / questing / raiding" activity status, surfaced on profiles and friend lists (a small live-world signal). Presence is best-effort via 09; never load-bearing for gameplay.

### 6.4 Whisper/DM & profiles

- **Whisper:** 1:1 async DM. Friends/guildmates/rivals freely; **stranger DMs are gated** (must share a guild or recent match, or the recipient allows open DMs) to blunt harassment (§7).
- **Profiles:** a public hero page — class, level, tier/rating, arena W/L (the shipped `arenaWins/Losses`), guild, trophies, cosmetic frame, favorite loadout, rivalry record, and a **Challenge**/**Add Friend**/**Block** action row. The profile is the social hub every social action routes through, and a natural share surface.

---

## 7. Safety & anti-toxicity

Non-negotiable, and a first-class feature per Pillar #5's "trust." A social system without this is a liability. Scaled to milestone (lightweight at M3 chat launch, hardened by M4 launch).

### 7.1 Chat safety pipeline

Server-side, in order, before storage/fan-out:

1. **Rate limiting & slow-mode** — per-user and per-channel caps; global chat slow-mode by default; new/low-level accounts more restricted (anti-spam, anti-raid).
2. **Filtering** — profanity/slur blocklist + normalization (leetspeak/unicode-homoglyph resistant) + configurable severity. Tunable per channel (guild chat laxer than global). Filter *masks* rather than blocks where possible (less frustrating), hard-blocks slurs/hate.
3. **Link/PII guard** — strip or gate external links; detect and warn on shared phone numbers/addresses (grooming/scam protection, esp. important for younger players).
4. **Store** with the compliance metadata reporting needs (author, channel, timestamp, pre/post-filter content retained server-side for moderation review, not shown to users).
5. **Fan-out** via 09.

### 7.2 Reporting & moderation

- **Report** on any message, profile, guild name/description, or player, with a reason taxonomy (harassment, hate, spam, cheating, inappropriate name, scam/collusion). Reports create `ModerationReport` rows.
- **Triage:** severity + reporter-reputation + report-volume score routes to auto-action (mute/shadow-throttle) or human review queue. Repeat/verified offenders escalate (temp mute → chat ban → arena ban → account action).
- **Guild self-moderation:** Officers mute/delete within guild chat (§2.1) — distributed moderation scales far better than a central team and gives guilds ownership.
- **Transparency & appeals:** actioned users are told what rule and given an appeal path (Pillar #5 fairness; no silent kafkaesque bans). All actions logged and auditable.
- **Name moderation:** guild names/tags and hero names pass the filter at creation and are reportable after.

### 7.3 Anti-collusion (a named risk)

The competitive systems (arena rating, wars, tournaments, guild rewards) invite collusion. Countermeasures:

- **Win-trading detection:** graph analysis of fight outcomes — two accounts with anomalously one-sided or alternating results, especially at odd hours, low RD swings, or same IP/device cluster, are flagged. Rating gains from flagged pairs are voided; repeat offenders banned from ranked.
- **Matchmaking exclusions** (§4.3): can't fight guildmates for rating; recent-opponent cooldown; alt-detection via device/IP heuristics excludes self-play.
- **Treasury/gift forensics:** the `GuildLedger` and gift logs feed a job hunting round-tripping and drain patterns (§2.3, §6.1). Soft-locks and velocity caps blunt the mechanic itself.
- **Boosting detection:** a sudden rating spike inconsistent with a player's power-score history (§4.3) flags account-sharing/boosting.
- **NPC-farm immunity:** NPC fights give no rating (§4.3), so bots can't inflate the ladder.

### 7.4 Fair-play & anti-cheat (shared with 09)

Server-authority (all outcomes computed server-side) is the foundation; determinism (§1) makes every result auditable (re-run `(a, b, seed)` and compare). Snapshot immutability prevents mid-fight tampering. **Anti-cheat infrastructure (request signing, replay-attack prevention, anomaly pipelines) is Module 09's domain** (per the Master Plan's server-authority contract); this module supplies the game-logic invariants (deterministic combat, snapshot immutability, rating-void hooks) that make cheats detectable.

### 7.5 Smurfing (a named risk)

Glicko-2's high initial RD (§4.3) is the primary lever: a smurf's rating rockets toward its true value in a handful of fights instead of a season of stomping beginners. Reinforced by: power-score/rating mismatch flags, a new-account matchmaking pool skew (new accounts weighted to fight other new accounts early), and reduced rating stakes when your own RD is high (a smurf can't *bank* farmed rating). We accept some residual smurfing as unfixable and design so its blast radius (number of beginners a smurf ruins before self-sorting) is small.

---

## 8. Leaderboards & integrity

Building on the shipped Hall of Fame (`loadLeaderboard`, top by level then XP) and guild board (`loadGuilds`, by total member level).

### 8.1 Board catalog

| Board | Metric | Scope | Reset |
|---|---|---|---|
| Hall of Fame | Level, then XP (shipped) | Global | Never (all-time) |
| Arena Ladder | Glicko-2 rating | Global + per-tier | Seasonal soft reset (§4.5) |
| Grandmaster | Ranked rating #1..500 | Global | Seasonal |
| Class Ladders | Rating | Per class (Warrior/Mage/Scout) | Seasonal |
| Guild Power | Total member level (shipped) + hall tier weighting | Global | Never |
| Guild War League | GWR | Global + per-league | Seasonal |
| Weekly Contribution | Guild-quest contribution | Per guild | Weekly |
| Seasonal Event | Event-specific (06) | Global | Per event |
| Friends | Any of the above, filtered to friends | Personal | Follows source |

**Class ladders** matter: they give the two "weaker in raw ladder" classes their own apex to chase (Pillar #3 mastery), and a "Best Mage on the server" is a real, attainable identity. **Friends-filtered** views make every board personally relevant even to a mid-tier player (you're not #4,000 globally, you're #2 among your friends).

### 8.2 Integrity

- Ranked boards exclude flagged/actioned accounts (§7); voided rating from collusion never appears.
- Snapshot/seed auditability (§4.8) means any contested ranking entry is reproducible.
- Guild boards weight hall tier so a hollow guild can't top the board on borrowed member levels alone.
- Rate-limited reads + server-computed, cached rankings (never client-asserted positions).
- **Sudden-jump anomaly detection** on all boards feeds the moderation queue.

---

## 9. Data model & server actions

**Additive only.** Everything below adds tables or nullable/defaulted columns. Nothing shipped is dropped. The datasource migrates SQLite→Postgres per the Master Plan (Tech/09 owns that); these models are written Postgres-ready. **09 is the canonical schema owner** — this section is a *proposal* through that process.

### 9.1 Extend existing models (additive columns)

```prisma
model Character {
  // ...all existing fields unchanged...
  // PvP rating (Glicko-2):
  arenaRating      Float    @default(1500)
  arenaRD          Float    @default(350)
  arenaVolatility  Float    @default(0.06)
  peakTier         String?                    // highest tier reached this season
  powerScore       Int      @default(0)       // server-estimated combat strength (from 03)
  defenseSnapshotId String?                   // current active defense snapshot
  // Social:
  allowOpenDMs     Boolean  @default(false)
  presence         String   @default("OFFLINE") // OFFLINE|ONLINE|AWAY + activity via 09
  // Guild role lives on GuildMembership, not here.
}

model Guild {
  // ...existing: id, name, tag, description, founderId, createdAt, members...
  hallLevel            Int      @default(1)
  tier                 String   @default("WARBAND")   // WARBAND|COMPANY|ORDER|LEGION|DYNASTY
  memberCap            Int      @default(15)
  treasuryGold         Int      @default(0)
  guildSeals           Int      @default(0)
  guildKnowledge       Int      @default(0)
  warRating            Float    @default(1500)         // GWR (Glicko-2)
  warRD                Float    @default(350)
  recruitmentPolicy    String   @default("APPLY")      // OPEN|APPLY|INVITE
  focusTags            String   @default("[]")         // JSON array
  language             String   @default("en")
  permissionOverrides  String   @default("{}")         // JSON, defaults to §2.1 matrix
  bannerCosmetic       String?
  gmLastActiveAt       DateTime?                        // for succession (§2.9)
}
```

### 9.2 New models

```prisma
model GuildMembership {          // role travels with the guild membership
  id            String   @id @default(cuid())
  guildId       String
  characterId   String   @unique  // one guild at a time (mirrors current guildId)
  role          String   @default("MEMBER") // GM|OFFICER|VETERAN|MEMBER|RECRUIT
  joinedAt      DateTime @default(now())
  weeklyDrawn   Int      @default(0)         // treasury draw this week (velocity cap)
  @@index([guildId, role])
}

model GuildLedger {              // treasury transparency + anti-collusion forensics
  id          String   @id @default(cuid())
  guildId     String
  characterId String
  kind        String              // DEPOSIT|WITHDRAW|PERK|HALL|RAID_STAKE|WAR_FEE|PAYOUT|TITHE
  amount      Int
  currency    String   @default("GOLD") // GOLD|SEAL|KNOWLEDGE
  createdAt   DateTime @default(now())
  @@index([guildId, createdAt])
}

model GuildHallRoom {
  id        String @id @default(cuid())
  guildId   String
  roomKey   String            // GREAT_HALL|TREASURY|WAR_ROOM|TRAINING|ALCHEMY|BARRACKS|TAVERN|TROPHY
  level     Int    @default(0)
  @@unique([guildId, roomKey])
}

model GuildPerkNode {
  id       String @id @default(cuid())
  guildId  String
  nodeKey  String            // e.g. MIGHT_2_RAID_DMG
  rank     Int    @default(0)
  @@unique([guildId, nodeKey])
}

model GuildQuest {             // content shape owned by 06; contribution mechanic owned here
  id           String   @id @default(cuid())
  guildId      String
  questKey     String
  weekOf       DateTime
  target       Int
  progress     Int      @default(0)
  completedAt  DateTime?
  @@index([guildId, weekOf])
}

model GuildContribution {      // per-member per-week aggregate (contribution leaderboard)
  id           String   @id @default(cuid())
  guildId      String
  characterId  String
  weekOf       DateTime
  points       Int      @default(0)
  @@unique([guildId, characterId, weekOf])
}

model GuildRaid {              // shared table with 06 (06 owns boss/encounter tables)
  id          String   @id @default(cuid())
  guildId     String
  bossKey     String            // → 06's boss content
  difficulty  Int
  bossMaxHp   BigInt
  bossHp      BigInt
  startedAt   DateTime @default(now())
  endsAt      DateTime
  clearedAt   DateTime?
  @@index([guildId, endsAt])
}

model GuildRaidContribution {  // damage attribution for reward split
  id          String @id @default(cuid())
  raidId      String
  characterId String
  damage      BigInt @default(0)
  attacks     Int    @default(0)
  @@unique([raidId, characterId])
}

model GuildWar {
  id             String   @id @default(cuid())
  guildAId       String
  guildBId       String
  startsAt       DateTime
  endsAt         DateTime
  scoreA         Int      @default(0)
  scoreB         Int      @default(0)
  winnerGuildId  String?
  ratingDeltaA   Float?
  ratingDeltaB   Float?
  @@index([endsAt])
}

model DefenseSnapshot {        // immutable, versioned combat-ready copy
  id           String   @id @default(cuid())
  characterId  String
  version      Int
  class        String
  level        Int
  strength     Int
  dexterity    Int
  intelligence Int
  constitution Int
  luck         Int
  powerScore   Int
  pinned       Boolean  @default(false)  // player pinned a dedicated defense
  createdAt    DateTime @default(now())
  @@index([characterId, version])
}

model ArenaMatch {             // rated fight record; canonical artifact is the seed-tuple
  id                 String   @id @default(cuid())
  attackerId         String
  defenderSnapshotId String
  seed               String                 // deterministic replay key (§4.8)
  attackerWon        Boolean
  ratingDeltaAtk     Float
  isNpc              Boolean  @default(false)
  isRanked           Boolean  @default(true)
  createdAt          DateTime @default(now())
  @@index([attackerId, createdAt])
  @@index([defenderSnapshotId])
}

model Rivalry {
  id            String @id @default(cuid())
  characterAId  String
  characterBId  String
  winsA         Int    @default(0)
  winsB         Int    @default(0)
  lastFightAt   DateTime @default(now())
  @@unique([characterAId, characterBId])
}

model Friendship {
  id           String   @id @default(cuid())
  requesterId  String
  addresseeId  String
  status       String   @default("PENDING") // PENDING|ACCEPTED
  createdAt    DateTime @default(now())
  @@unique([requesterId, addresseeId])
  @@index([addresseeId, status])
}

model Block {
  id          String   @id @default(cuid())
  blockerId   String
  blockedId   String
  createdAt   DateTime @default(now())
  @@unique([blockerId, blockedId])
}

// Chat message storage. Transport/fan-out/presence owned by 09; this is the
// persisted async source-of-truth the socket layer rides on top of.
model ChatMessage {
  id          String   @id @default(cuid())
  channelType String              // GUILD|WHISPER|GLOBAL|WAR|RAID
  channelId   String              // guildId | pairKey | zoneId | warId | raidId
  authorId    String
  body        String              // post-filter body shown to users
  seq         BigInt              // server-assigned monotonic order (idempotency)
  createdAt   DateTime @default(now())
  @@index([channelType, channelId, seq])
}

model ModerationReport {
  id            String   @id @default(cuid())
  reporterId    String
  targetType    String              // MESSAGE|PROFILE|GUILD|PLAYER
  targetId      String
  reason        String
  status        String   @default("OPEN") // OPEN|ACTIONED|DISMISSED
  createdAt     DateTime @default(now())
  @@index([status, createdAt])
}
```

**Migration note on roles:** `GuildMembership` is the new canonical membership+role record. We keep the shipped `Character.guildId` as the fast "which guild" pointer (backfilled 1:1), and backfill each existing guild's `founderId` member as `GM`, everyone else as `MEMBER`. Fully additive; no destructive change to `Guild.members`.

### 9.3 Server action shapes

All are Next.js server actions, server-authoritative, permission-checked against §2.1, and (where noted) emit juice events for 07 and real-time events for 09.

```ts
// Guild management
setGuildRole(targetCharacterId, role): Result           // §2.1 matrix enforced
kickMember(targetCharacterId): Result
setRecruitmentPolicy(policy, focusTags): Result
transferLeadership(targetCharacterId): Result
disbandGuild(confirmName): Result                        // pro-rata treasury split
applyToGuild(guildId) / acceptApplication(applicantId): Result
searchGuilds(filters): GuildCard[]                       // extends loadGuilds()

// Treasury & progression
depositTreasury(amount) / withdrawTreasury(amount, currency): Result  // velocity caps
upgradeHallRoom(roomKey): Result                         // queue + cost check
allocatePerkNode(nodeKey): Result

// Guild group content (shared seam with 06)
startGuildRaid(bossKey, difficulty): Result              // 06 supplies boss
attackRaidBoss(raidId): { damage, log, seed }            // deterministic; contribution++
declareWar(targetGuildId) / setWarRoster(slots): Result  // GWR-matched
attackWarDefender(warId, defenderSnapshotId): { stars, seed }

// Arena (rebuilds shipped fightArena)
refreshDefenseSnapshot(pin?): DefenseSnapshot
findArenaMatch(): { defenderSnapshot | npc }             // Glicko-2 + exclusions (§4.3)
fightArena(defenderSnapshotId?): { won, seed, ratingDelta, log }  // ranked; charge-gated
revengeFight(matchId): { ... }
getReplay(matchId): { snapshots, seed }                  // client re-runs resolveBattle

// Social & chat (persistence here; transport → 09)
sendFriendRequest / respondFriendRequest / removeFriend(id): Result
blockPlayer / unblockPlayer(id): Result
sendChatMessage(channelType, channelId, body): Result    // §7 pipeline, then 09 fan-out
reportTarget(targetType, targetId, reason): Result
```

**Needs real-time (→ 09):** live chat delivery, presence, live spectate, war/raid live activity feed, and match-found/attacked push notifications. **Everything else is request/response async** and works with zero socket connectivity — the async guarantee of Pillar #4.

---

## 10. Milestone phasing

Each milestone is independently shippable; we can cut cleanly at any line.

**M1 — Foundation** *(durability, no new player-facing social depth)*
- Postgres migration of the shipped `Guild`/arena/`BattleLog` models; add `GuildMembership` + backfill roles; add rating columns (`arenaRating/RD/volatility`) dormant.
- **Seeded deterministic combat** landed with 03 (the unblocking prerequisite) — even if replays aren't surfaced yet.
- Guild roster UI polish, roles visible. Instrumentation hooks for §12 KPIs.

**M2 — Depth** *(guilds become a game)*
- Roles & permissions matrix live; treasury + `GuildLedger`; Guild Hall rooms (subset) + tiers/member-cap; guild quests + contribution leaderboard; recruitment policies + improved Guild Finder.
- Defense snapshots (`DefenseSnapshot`) introduced; arena starts fighting snapshots instead of live rows; rating computed but tiers UI light.

**M3 — Endgame** *(reasons to stay; the ladder + group content)*
- Full Glicko-2 ladder: tiers/divisions, seasonal soft reset, reward tables, revenge/rivalries, daily/streak layer.
- Guild raids (`GuildRaid`, shared seam with 06) and GvG wars (`GuildWar`) + War League.
- Guild perk tree; more hall rooms. **Chat** (guild + whisper) via 09 with the §7 safety pipeline. Replays surfaced.
- Class ladders + friends-filtered boards.

**M4 — Launch** *(scale & harden)*
- Anti-collusion/anti-smurf jobs hardened; full moderation tooling + appeals; anti-cheat integration with 09.
- Live spectate (tournaments/wars); global chat; guild mergers.
- Async tournaments (Weekly Gauntlet, Seasonal Championship). Cross-server war prep with 09. Mobile PWA parity for all social surfaces.

**M5 — Live** *(grow & sustain)*
- Seasonal ladder & War League cadence in production (06's calendar); recurring tournaments + guild tournaments; consolidation/merger seasons; prestige guild perks (Tier V); community features (recaps, highlight sharing, rivalry season stories).

---

## 11. Risks & mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **Combat not deterministic** (shipped uses `Math.random`) blocks replay/war/integrity | 🔴 Critical | Seed the PRNG with 03 in **M1** — the #1 prerequisite; everything downstream depends on it |
| **Toxicity** in chat drives churn & reputational harm | 🔴 High | Full §7 pipeline (filter/rate-limit/report/moderate), async-first (less heat than live), distributed guild moderation, gated stranger DMs, appeals |
| **Collusion / win-trading** corrupts ladder & guild rewards | 🔴 High | §7.3: graph detection, matchmaking exclusions, ledger forensics, NPC-farm immunity, rating voids |
| **Snapshot staleness** = unfair fights | 🟠 Med | Event-driven refresh + 24h lazy-refresh backstop (§4.1); tune T from telemetry |
| **Smurfing** ruins beginner experience | 🟠 Med | Glicko-2 high initial RD, power/rating mismatch flags, new-account pool skew (§7.5); accept small residual |
| **Attacker first-strike advantage** makes ladder a coin-flip | 🟠 Med | Rework initiative with 03 (§4.1) so dex is an edge not a guarantee |
| **Guild perks over-power** guildless play | 🟠 Med | Cap aggregate perks (~+15–20% at Hall V); keep a guildless whale HoF-viable; 04 tunes gold perks |
| **Low population** → empty ladder/guilds off-hours | 🟠 Med | NPC fallback (rating-neutral), rating-band widening, tier merges, cross-server at top; Guild Finder + FTUE guild-push |
| **Social obligation guilt** violates Pillar #5 | 🟡 Low-Med | Generous, one-tap contributions; peak-tier season rewards; no bricking on a missed day; opt-in tithe |
| **Guild moderation load** at 75 members | 🟡 Low | Officer tooling, member cap, slow-mode, auto-throttle before human review |
| **Dead-GM lockout** freezes a guild | 🟡 Low | Inactivity succession (§2.9) at 21/30 days |
| **Cross-server infra** for top-tier war/chat scale | 🟠 Med | Owned by 09; we gate cross-server features (Tier IV) behind their delivery |

---

## 12. KPIs & instrumentation

Tied to the Master Plan's Social KPIs, with module-specific targets (validate/adjust in M3 beta):

**Primary (from Master Plan §9):**
- **% players in a guild** — target **> 55%** of D7-retained players. Leading indicator instrumented from M1.
- **Guild D7 retention lift** — guilded vs. guildless D7 delta; target **+12–18pp**. The core justification for the whole module.
- **Arena fights/DAU** — target **≥ 3** ranked fights per daily active player.

**Guild health:**
- Guild D30 survival rate (guilds still active after 30 days); % guilds full; median weekly contribution participation (% of members contributing ≥1); hall-upgrade rate; % guilds running raids/wars.

**Arena health:**
- Ladder participation (% of eligible players with a rating this season); match fairness (win rate near 50% for evenly-rated pairs — the fairness proof); NPC-fallback rate (want it *low* at healthy pop); revenge/rivalry conversion; season-reward claim rate; snapshot staleness distribution.

**Social & chat:**
- Friends per player; whisper/gift volume; chat DAU; **% messages auto-moderated** and **report rate/1k messages** (want both low and falling); block rate; time-to-action on reports.

**Integrity (health = low):**
- Flagged-collusion pairs; smurf-flag rate; voided-rating volume; appeal overturn rate (a check on false positives).

Every meaningful action emits a server-side analytics event (aligned with 06/08 pipelines); the juice-event bus (`PVP_PROMOTE`, `WAR_WON`, `RAID_BOSS_KILL`, `GUILD_LEVEL_UP`, etc., schema owned by 07) doubles as an analytics source.

---

## 13. Open questions & cross-module boundaries

- **03 (Combat):** deterministic seeded combat (**hard M1 blocker**); initiative/first-strike rework; the canonical **power-score** formula (used by matchmaking & smurf detection); how guild perks & personal talents compose without double-dipping stat caps. Defense-stance stats depend on 03's skill/stance system.
- **04 (Economy):** Guild Seal currency definition (premium-adjacent? honest per Pillar #5); final tuning of all gold-facing guild perks vs. faucet/sink; season-currency shop; gift/tithe economy balance.
- **06 (Live-Ops & Endgame):** **the raid boundary** (06 = boss content/mechanics/calendar; 05 = raid lobby/contribution/loot-split — shared `GuildRaid` tables); tournament *cadence* (06) vs. *format* (05); season *frame/calendar* (06) vs. arena *ladder mechanics* (05); guild-quest *theming/rotation* (06) vs. *contribution mechanic* (05). This seam is co-owned and any change is joint.
- **07 (Game Feel):** juice-event schema for every social celebration (promo, war win, raid kill, guild level, rivalry); replay playback presentation.
- **08 (Onboarding/Meta):** FTUE guild-push by ~level 5 (shared retention KPI); referral/friend-invite acquisition funnel (08 owns funnel, 05 owns friendship mechanic); how PvP/guild cosmetics sit in the meta-progression & (honest) monetization.
- **09 (Tech/Platform):** **all real-time transport** (chat delivery, presence, live spectate, push) — we defined payloads/channel rules, 09 owns the pipe, scaling, and fan-out; canonical Postgres schema ownership (this §9 is a proposal through 09); anti-cheat request-signing/replay-prevention infra; cross-server/sharding for top-tier war & global chat.

**Standalone open questions:**
- Rating-period length (6h) vs. matchmaking freshness — validate in beta.
- Should guild-hopping have a cooldown to protect war-roster integrity? (Leaning: 24h leave-cooldown before war eligibility.)
- Do we want *cross-guild* alliances/federations at M5, or is that scope creep? (Leaning: defer past M5 unless data demands it.)
- Snapshot staleness T (24h) — telemetry-tune.
