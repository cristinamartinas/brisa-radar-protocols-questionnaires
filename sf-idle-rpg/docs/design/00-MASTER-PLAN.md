# Quest & Cudgel — Master Product Plan

> **Status:** ✅ Baseline established · **Owner:** Product Lead · **Version:** 1.0
> This is the shared bible. Every module design doc in this folder inherits its
> vision, tone, constraints, and quality bar from here. Read this first.

---

## 1. Vision

**Quest & Cudgel** is a satirical fantasy idle-RPG for the browser and mobile —
Shakes & Fidget's asynchronous, menu-driven soul rebuilt with the production
values, cohesion, and obsessive polish of a Rockstar title. You are a hero in a
world that is equal parts epic and absurd. You quest, you loot, you climb, you
scheme with your guild — in bite-sized sessions that respect your time but pull
you back every day because the world is alive, funny, gorgeous, and *yours*.

**One-line pitch:** *A pocket-sized fantasy world with AAA soul — hilarious,
beautiful, and endlessly deep, played five minutes at a time.*

## 2. Design Pillars

Everything we build must serve at least one pillar. If it serves none, cut it.

1. **Every tap has weight.** No dead interactions. A button press produces
   sound, motion, and consequence. The game *feels* expensive.
2. **The world is in on the joke.** Satire and heart, never filler. Tone is
   consistent from item flavor text to boss death lines.
3. **Depth you can ignore, mastery you can chase.** A newcomer thrives by
   tapping "Quest." A veteran theorycrafts affix rolls at 3 a.m.
4. **Asynchronous, never lonely.** You play solo on your schedule, but the world
   is full of real rivals, guildmates, and ghosts of other players.
5. **Respect the player's time and trust.** Sessions are short and generous.
   Monetization is cosmetic and honest. No dark patterns, ever.

## 3. Player Fantasy & Session Shape

- **Core fantasy:** rise from a nobody with a rusty cudgel to a legend whose
  name tops the Hall of Fame and whose guild rules the realm.
- **Session shape:** 2–5 min active sessions, 3–6 per day. Send a hero on a
  timed quest, collect the last one, push a dungeon floor, spend loot, check the
  guild, log off. The idle layer works while you're away.
- **Retention spine:** daily quests → weekly guild goals → seasonal ladders.

## 4. Current State (what already ships)

The vertical slice on `master` is real and server-authoritative:

- **Accounts** — register/login/logout, bcrypt passwords, session tokens.
- **Classes** — Warrior / Mage / Scout, each with a primary stat.
- **Timed quests** — pick a length, live countdown, collect (server-checked).
- **Arena PvP** — async duels vs. other players' stored heroes (NPC fallback).
- **Dungeons** — 3 dungeons, escalating floor bosses, loot drops.
- **Equipment & Magic Shop** — rarities, slots, buy/equip/sell, gold sink.
- **Guilds** — found/join/leave, roster, leaderboard, member gold perk.
- **Tech** — Next.js 16 (App Router) · React 19 · TypeScript · Prisma 7 ·
  SQLite (→ Postgres) · Tailwind v4. All game math is server-side.

The end-game plan below turns this slice into a shippable, live product.

## 5. Module Map (owners work in parallel)

| # | Module | Owner (agent) | Doc |
|---|--------|---------------|-----|
| 01 | Art Direction & UI/UX | Senior Art Director / UX Lead | `01-art-direction-ui-ux.md` |
| 02 | Narrative, World & Content | Senior Narrative Designer | `02-narrative-world-content.md` |
| 03 | Combat & Character Progression | Senior Systems Designer | `03-combat-character-progression.md` |
| 04 | Economy, Items & Crafting | Senior Economy Designer | `04-economy-items-crafting.md` |
| 05 | Multiplayer, Guilds & PvP | Senior Social/Multiplayer Designer | `05-multiplayer-guilds-pvp.md` |
| 06 | Endgame, Live-Ops & Events | Senior Live-Ops Designer | `06-endgame-liveops-events.md` |
| 07 | Game Feel, Audio & Juice | Senior Game Feel / Audio Designer | `07-game-feel-audio-juice.md` |
| 08 | Onboarding, Meta & Monetization | Senior Product Designer (Growth) | `08-onboarding-meta-monetization.md` |
| 09 | Technical Architecture & Platform | Senior Technical Designer / Architect | `09-technical-architecture-platform.md` |

Each module doc is self-contained and owns exactly one file, so all nine
designers work simultaneously without stepping on each other.

## 6. The Quality Bar ("Rockstar feel")

Concrete, testable standards every module is held to:

- **Cohesion:** one world, one tone, one visual language, one type scale, one
  motion grammar. Nothing feels bolted on.
- **Juice:** every meaningful action has ≥2 feedback channels (visual + audio,
  ideally + haptic). Rewards *celebrate*; failures have character.
- **Narrative saturation:** flavor text everywhere — items, quests, loading
  tips, boss lines, empty states. The game is never mute.
- **No filler:** every system has a fantasy, a decision, and a payoff. If a
  screen exists only to hold a button, redesign it.
- **Readable depth:** complexity is layered and progressive; the FTUE never
  shows a stat the player can't yet use.
- **Performance is a feature:** 60fps interactions, <2s first load, instant
  perceived response on every action (optimistic UI + server reconcile).

## 7. Roadmap / Milestones

| Phase | Goal | Headline deliverables |
|-------|------|-----------------------|
| **M0 – Slice** (done) | Prove the loop | Current features on `master` |
| **M1 – Foundation** | Deployable & durable | Postgres, real accounts polish, design system v1, art pass, audio hooks |
| **M2 – Depth** | Make it a *game* | Talent trees, crafting/affixes, skills, guild halls, tutorial/FTUE |
| **M3 – Endgame** | Reasons to stay | Raids, infinite tower, seasons, battle pass, events, chat |
| **M4 – Launch** | Ship & scale | LiveOps calendar, monetization, anti-cheat, analytics, mobile PWA |
| **M5 – Live** | Grow & sustain | Seasonal content cadence, tournaments, community features |

Each module doc must phase its own scope against M1→M5 so the whole team can
sequence work and cut cleanly at any milestone.

## 8. Cross-Cutting Contracts (so modules interlock)

- **Currencies:** `gold` (earned, soft), `mushrooms` (premium, honest),
  plus season currency (Economy owns the canonical list).
- **Server authority:** all outcomes computed server-side; the client is a
  renderer. Every module respects this (Tech owns the contract).
- **Progression spine:** level → stats → gear → talents → prestige. Systems
  designers align curves so Economy and Combat don't fight.
- **Event bus:** a shared "juice event" contract (e.g. `LEVEL_UP`, `LOOT_EPIC`,
  `BOSS_KILL`) that Game Feel/Audio subscribes to (Game Feel owns the schema).
- **Data model:** additive migrations only; Tech maintains the canonical schema
  and each module proposes tables/fields through it.

## 9. Success Metrics (KPIs)

- **Engagement:** D1/D7/D30 retention; sessions/day; session length.
- **Depth:** % players reaching first dungeon clear, first talent, first guild.
- **Social:** % in a guild; guild D7 retention lift; arena fights/DAU.
- **Economy health:** gold faucet/sink ratio; % gear replaced weekly.
- **Business:** conversion to first purchase; ARPDAU; refund/complaint rate
  (kept near zero by ethical monetization).

Each module defines the specific metrics it moves.

## 10. How We Work

- **Parallel by design.** Each designer owns one doc; no shared files.
- **Commit your work.** Every agent commits its doc to its own branch/worktree.
- **Mark progress.** Every doc carries a status header (see template) and the
  Product Lead maintains `PROGRESS.md` as the single dashboard.
- **Cross-reference, don't duplicate.** Link to sibling docs for anything that
  belongs to another module.

### Doc status header template

```
> **Status:** ✅ Complete | 🚧 In progress | 🔜 Planned
> **Owner:** <role> · **Milestone focus:** M1–M5 · **Version:** 1.0
> **Depends on:** <sibling modules> · **Last updated:** <date>
```
