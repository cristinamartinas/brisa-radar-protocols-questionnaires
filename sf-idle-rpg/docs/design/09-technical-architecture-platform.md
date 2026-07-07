# 09 — Technical Architecture & Platform

> **Status:** ✅ Complete
> **Owner:** Senior Technical Architect · **Milestone focus:** M1–M5 · **Version:** 1.0
> **Depends on:** all modules (platform) · **Last updated:** 2026-07-07

**Module summary.** This is the platform contract every other module builds on.
It takes the real vertical slice — Next.js 16 server actions, Prisma 7 on
SQLite, session-token auth, all game math server-side — and specifies the path
to a durable, server-authoritative, low-cost live service on Postgres + Vercel
with a real-time layer, a scheduler, object storage, anti-cheat, and
observability. It consolidates the data and infrastructure that siblings 03
(skills/talents), 04 (affixes/crafting), 05 (guild/chat/ratings + real-time),
06 (seasons/events/scheduler), 07 (juice event bus) and 08 (analytics/push/
monetization) need into **one canonical target schema and one deployment
topology**, sequenced against M1→M5. The governing rules are unchanged from the
master bible: **the server is the only authority, migrations are additive
(expand/contract), and Tech owns the canonical schema** — every module proposes
tables and fields through this doc. Where a decision is reversible we pick the
cheapest thing that scales to ~50k DAU; where it is not (auth, money, identity,
migration discipline) we over-invest early.

---

## Table of Contents

1. [Target Architecture Overview](#1-target-architecture-overview)
2. [Data Model Evolution — the Canonical Target ER Map](#2-data-model-evolution--the-canonical-target-er-map)
3. [SQLite → Postgres Migration Plan](#3-sqlite--postgres-migration-plan)
4. [Real-Time Layer](#4-real-time-layer)
5. [Scheduler & Background Jobs](#5-scheduler--background-jobs)
6. [Server-Authority & Anti-Cheat Framework](#6-server-authority--anti-cheat-framework)
7. [Security](#7-security)
8. [Performance & Scale](#8-performance--scale)
9. [Observability & Quality](#9-observability--quality)
10. [Client Platform (PWA, Offline, Push, CDN)](#10-client-platform-pwa-offline-push-cdn)
11. [Milestone Phasing, Risks & KPIs](#11-milestone-phasing-risks--kpis)
12. [Appendix A — Environment & Secret Inventory](#appendix-a--environment--secret-inventory)
13. [Appendix B — Cross-Module Interface Registry](#appendix-b--cross-module-interface-registry)

---

## 1. Target Architecture Overview

### 1.1 The system in one paragraph

A player's browser (an installable PWA) renders React 19 Server + Client
Components served by **Next.js 16 on Vercel**. Every state change is a **server
action** (`"use server"`) running in the **Node.js runtime** on a Vercel
Function, which is the *only* place game math executes. Those functions read and
write **Postgres (Neon)** through **Prisma 7** over a pooled connection. Slow,
scheduled, or fan-out work (quest payout sweeps, season rollovers, leaderboard
recompute, event activation, push sends) is handed to a **durable job queue**
rather than run inline. Anything that must reach a player *without* them
refreshing — guild chat, arena challenge results, presence, live event banners
— travels over a **managed real-time layer** (Pusher/Ably-class hosted
WebSockets, SSE fallback). Static and generated assets (sprites, audio,
portraits) live in **object storage behind a CDN**. Cross-cutting concerns —
auth session, rate limiting, idempotency, feature flags, metrics — wrap every
action through a shared middleware seam.

### 1.2 Diagram-in-words

```
                        ┌─────────────────────────────────────────┐
                        │              CLIENT (PWA)                 │
                        │  React 19 · Service Worker · optimistic   │
                        │  UI · Web Push · WebSocket/SSE client     │
                        └───────────┬───────────────────┬──────────┘
                                    │ HTTPS (RSC +       │ WS / SSE
                                    │ server actions)    │ (subscribe only)
                                    ▼                    ▼
   ┌────────────────────────────────────────┐   ┌─────────────────────────┐
   │        VERCEL EDGE (CDN + WAF)          │   │  REAL-TIME LAYER         │
   │  static assets, RSC payload cache,      │   │  (Ably/Pusher managed)   │
   │  bot/rate defense at the edge           │   │  channels: guild, arena, │
   └───────────────┬────────────────────────┘   │  presence, world events  │
                   │ dynamic                     └───────────▲─────────────┘
                   ▼                                         │ server publishes
   ┌────────────────────────────────────────┐               │ (never client)
   │   NEXT.JS SERVER (Node runtime)         │───────────────┘
   │   ┌──────────────────────────────────┐  │
   │   │  action middleware seam:         │  │      ┌──────────────────────┐
   │   │  auth → rate-limit → idempotency │  │─────▶│  JOB QUEUE + CRON     │
   │   │  → validate → GAME MATH → persist│  │      │  (QStash / Inngest)   │
   │   │  → emit events → revalidate      │  │◀─────│  quest sweep, seasons,│
   │   └──────────────────────────────────┘  │      │  leaderboards, push   │
   └───────┬───────────────────┬─────────────┘      └──────────────────────┘
           │ Prisma 7          │ read cache
           ▼ (pooled)          ▼
   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────────────┐
   │  POSTGRES (Neon) │   │  KV / Redis      │   │  OBJECT STORAGE + CDN     │
   │  primary + read  │   │  (Upstash):      │   │  (Vercel Blob / R2):      │
   │  replica         │   │  rate limits,    │   │  sprites, audio, portrait │
   │  branch-per-PR   │   │  idempotency,    │   │  renders, exports         │
   │                  │   │  presence, flags │   │                           │
   └──────────────────┘   └──────────────────┘   └──────────────────────────┘
```

### 1.3 Request lifecycle of a server-authoritative action

Worked example: **`collectQuest()`** (the pattern generalizes to every
mutation — fight, craft, spend, push a floor).

1. **Transport.** Client calls the server action. Next.js sends an RPC to a
   Vercel Node Function. No game numbers are trusted from the request body; the
   client sends at most an *intent* + an idempotency key.
2. **Authenticate.** Middleware reads the `sf_session` httpOnly cookie, resolves
   the token → `Player` → `Character`. No token, no character → typed
   `unauthorized` result. (Today this is `getSessionToken()` + `loadCharacter()`;
   we formalize it as a wrapper — see §6.1.)
3. **Rate-limit.** A sliding-window counter in KV keyed by
   `(playerId, actionName)` rejects floods before any DB work.
4. **Idempotency.** The action's `idempotencyKey` is checked against KV. A
   replay returns the stored prior result instead of re-executing (critical for
   money/loot: a double-tap or retry must not pay twice).
5. **Validate.** Inputs parsed with a Zod schema at the boundary; malformed or
   out-of-range intents rejected with a typed error.
6. **Load authoritative state** in a single query with the needed relations
   (avoid N+1, §8.3).
7. **Enforce invariants server-side.** The ready-check
   (`Date.now() < quest.endsAt` → refuse) already lives here. This is the
   anti-cheat heart: time, ownership, cost, cooldown, and precondition checks
   are the server's job, never the client's.
8. **Compute outcome** with pure functions from `game.ts` (reward, level-ups,
   loot). For anything competitive, use a **seeded, logged RNG** (§6.4) instead
   of ambient `Math.random()`.
9. **Persist in one transaction.** Delete the `ActiveQuest`, credit gold/xp/
   mushrooms via the **currency ledger** (§2.4), append `QuestLog`, apply
   level-ups — all-or-nothing.
10. **Emit events.** Push juice events (`LEVEL_UP`, `LOOT_EPIC`) to the client
    and analytics events (§10, §9) to the pipeline. Real-time fan-out (e.g.
    guild feed) is published to the real-time layer here.
11. **Reconcile UI.** `revalidatePath('/')` (or targeted tag revalidation)
    returns fresh server-rendered state; the client's optimistic guess is
    replaced by the authoritative truth.

**Design rule:** the client may *predict* an outcome for feel (§10.2), but the
server's result is final and always overwrites the prediction.

---

## 2. Data Model Evolution — the Canonical Target ER Map

### 2.1 Principles (the schema contract)

- **Additive only, expand/contract.** We never rename or drop a column in the
  same deploy that stops using it. Schema change = *expand* (add nullable
  column / new table, backfill, dual-write) → *migrate reads* → *contract*
  (drop old) in a **later** release. This guarantees the running old version and
  the new version can share a database during a rolling deploy → zero-downtime.
- **New columns are nullable or defaulted.** A migration that adds a `NOT NULL`
  column with no default against a populated table is banned (it locks and
  breaks the old code path).
- **Modules extend, they don't fork.** A module needing hero data adds a
  *column* to `Character` or a *satellite table* keyed by `characterId` — it
  never creates a parallel character.
- **JSON for shape-churny data, columns for queried data.** Anything you filter,
  sort, or index on is a real column. Blobs you only ever read whole (a battle's
  round-by-round log, a talent layout snapshot) stay JSON.
- **Tech owns this file.** A module's doc *proposes* tables here; the schema of
  record is `prisma/schema.prisma`, kept in lockstep with this section.

### 2.2 Existing models (M0, shipping today)

`Player`, `Character`, `Item`, `QuestLog`, `BattleLog`, `ActiveQuest`,
`DungeonProgress`, `Guild`. These are the trunk. Everything below hangs off
`Character` or `Guild`.

### 2.3 Target ER map (integrated across all modules)

```
Player 1───1 Character 1───* Item
  │             │  │  │  │  │  │  │ └──* ItemAffix ...............(04)
  │             │  │  │  │  │  │  └────* QuestLog / BattleLog / ActiveQuest
  │             │  │  │  │  │  └───────* DungeonProgress / TowerProgress ..(06)
  │             │  │  │  │  └──────────* CharacterTalent >── TalentNode >── TalentTree ..(03)
  │             │  │  │  └─────────────* CharacterSkill  >── SkillDef ...........(03)
  │             │  │  └────────────────* CurrencyLedger ..................(04, platform)
  │             │  └───────────────────* Entitlement / Purchase ..........(08)
  │             └──────────────────────* SeasonParticipant >── Season ....(06)
  │                                     * BattlePassProgress >── BattlePass (06/08)
  │                                     * PvpRating / MatchRecord .........(05)
  ├──* Session (rotating tokens) ..............................(platform/07-sec)
  ├──* PushSubscription .......................................(08/10)
  ├──* AnalyticsEvent (append-only, often off-DB) .............(08/09)
  └──* AuditLog / AntiCheatFlag ...............................(platform/anti-cheat)

Guild 1───* GuildMembership *───1 Character ...................(05)
  │    1───1 GuildHall (upgrades/perks JSON) ..................(05)
  │    1───* GuildEvent / GuildQuestProgress ..................(05/06)
ChatChannel 1───* ChatMessage *───1 Character .................(05)
CraftingRecipe / AffixDef / Season / Event / BattlePass / TalentTree /
SkillDef / FeatureFlag  = server-authored CONTENT tables (seeded, versioned)
```

### 2.4 The platform-owned tables (this module authors these)

These are cross-cutting spine tables that don't belong to any one gameplay
module. Tech owns them; other modules read/write through documented helpers.

- **`Session`** — promote session from the single `Player.sessionToken` string
  to a first-class table: `id, playerId, tokenHash, issuedAt, lastSeenAt,
  expiresAt, revokedAt, userAgent, ip`. Enables multi-device, rotation, and
  "log out everywhere" (§7.1). *Expand/contract:* add the table, dual-read
  (accept legacy `Player.sessionToken` **and** `Session`), migrate, then drop
  the legacy column.
- **`CurrencyLedger`** — append-only double-entry-style record of every
  currency delta: `id, characterId, currency (GOLD|MUSHROOMS|SEASON), delta,
  balanceAfter, reason (enum), refType, refId, idempotencyKey, createdAt`. The
  `Character.gold/mushrooms` columns become a **cached balance** the ledger is
  the source of truth for. This is the backbone of economy anomaly detection
  (§6.7) and refund/dispute handling (§7). Economy (04) defines currencies;
  Tech owns the ledger mechanism.
- **`IdempotencyRecord`** — `key, playerId, actionName, resultHash,
  responseJson, createdAt, expiresAt` (KV-primary, DB fallback for money-grade
  actions).
- **`AuditLog`** — server-side record of sensitive mutations (purchases,
  role changes, admin actions, ledger corrections).
- **`AntiCheatFlag`** — `playerId, ruleId, severity, evidenceJson, createdAt,
  resolvedAt` produced by detectors in §6.
- **`FeatureFlag` / `Experiment`** — flag key, rollout %, targeting, variant
  assignment (§9.6). KV-fronted for hot reads.

### 2.5 What each sibling module adds (consolidated)

| Module | New tables / columns (proposed, additive) | Notes for Tech |
|---|---|---|
| **03 Combat & Progression** | `TalentTree`, `TalentNode`, `CharacterTalent`, `SkillDef`, `CharacterSkill`; `Character.talentPoints`, `Character.prestige` | Content tables seeded & versioned; per-character rows are small — index on `characterId`. Respec = ledger + delete/recreate `CharacterTalent`. |
| **04 Economy/Items/Crafting** | `ItemAffix`, `AffixDef`, `CraftingRecipe`, `RecipeIngredient`; `Item.baseItemKey`, `Item.itemLevel`, `Item.seed` | Affixes are *rolled server-side with a stored seed* so a legendary is reproducible/auditable. Crafting spends flow through `CurrencyLedger`. |
| **05 Multiplayer/Guilds/PvP** | `GuildMembership` (role enum), `GuildHall`, `GuildEvent`, `ChatChannel`, `ChatMessage`, `PvpRating`, `MatchRecord`, `Friendship`/`Block` | `Character.guildId` migrates into `GuildMembership` (role, joinedAt) via expand/contract. Chat & ratings are the biggest real-time consumers (§4). |
| **06 Endgame/LiveOps/Events** | `Season`, `SeasonParticipant`, `BattlePass`, `BattlePassProgress`, `Event`, `EventSchedule`, `Raid`, `RaidParticipant`, `TowerProgress`, `LeaderboardSnapshot` | Scheduler-heavy (§5). Leaderboards are *materialized snapshots*, not live `ORDER BY` over the whole table. |
| **07 Game Feel/Audio** | none (schema-free) — owns the **juice event contract** | Tech guarantees the emit seam (step 10) and a stable event enum shared with analytics. |
| **08 Onboarding/Meta/Monetization** | `Purchase`, `Entitlement`, `PushSubscription`, `AnalyticsEvent`, `OnboardingProgress`, `ReferralCode` | `Purchase`/`Entitlement` are money-grade: idempotent, ledgered, audited, reconciled against the store webhook. Analytics events mostly leave Postgres for a cheaper sink (§9.2). |

---

## 3. SQLite → Postgres Migration Plan

### 3.1 Why now, why Postgres

SQLite via the `better-sqlite3` adapter is perfect for the slice and local dev
but is single-writer, tied to one machine's disk, and incompatible with
serverless horizontal scale (Vercel Functions are ephemeral; there is no durable
local file). **M1 cannot ship without a networked database.** Postgres is the
target because it is the standard for relational game backends, Prisma's
first-class provider, gives us branchable managed hosting, real concurrency,
`JSONB`, partial/GIN indexes, and a clean path to read replicas.

### 3.2 Hosting choice

**Recommendation: Neon (serverless Postgres).** Rationale:

- **Scale-to-zero + autoscaling** matches an idle-game's spiky, low-baseline
  load → cheapest at our DAU band.
- **Database branching** gives every Vercel Preview deployment its own isolated
  copy of the schema+data, so PRs test against real Postgres, not SQLite.
- **Built-in connection pooling** (PgBouncer, transaction mode) — essential for
  serverless, where each function instance would otherwise open its own
  connection and exhaust the server.

*Alternative considered:* **Supabase** — attractive if we later want its
built-in Auth, Realtime, and Storage as one bundle; heavier than we need for M1
since we already have auth and will pick a dedicated real-time vendor. We keep
Supabase as the fallback if we want to consolidate vendors. **Decision:** Neon
for the DB; buy real-time separately (§4).

### 3.3 Connection pooling (the serverless gotcha)

Prisma 7 driver adapters make this clean. Two URLs:

- `DATABASE_URL` → **pooled** endpoint (PgBouncer, transaction pooling) — used
  by all runtime server actions.
- `DIRECT_URL` → **direct** endpoint — used only by `prisma migrate` (migrations
  need a real session, not a pooled one).

`db.ts` swaps the `PrismaBetterSqlite3` adapter for the Postgres driver adapter
(`@prisma/adapter-pg` / Neon serverless adapter), keeping the exact same
`globalForPrisma` singleton pattern that already prevents connection blowups in
dev. Cap pool size per function; prefer short transactions.

### 3.4 Provider/adapter switch (concrete steps)

1. `schema.prisma`: `datasource db { provider = "postgresql" }`.
2. Swap the adapter import in `src/lib/db.ts`; keep the singleton + env-driven
   URL. Add `directUrl` for the CLI.
3. Reconcile type differences: SQLite stored some things loosely (booleans as
   ints, all timestamps fine). Audit `String`-JSON columns (`BattleLog.rounds`)
   — on Postgres these become **`Json`/`JSONB`** for indexability. This is an
   additive column add + backfill, not an in-place retype.
4. Regenerate a **fresh initial Postgres migration** (`prisma migrate diff` from
   empty → current schema). SQLite's migration history does not carry over; we
   baseline Postgres.
5. `prisma migrate deploy` in CI against a Neon branch; run the app's e2e suite
   against it before promoting.

### 3.5 Data migration & zero-downtime cutover

The slice's data is small and pre-launch, so the first cutover is trivial: a
one-shot **ETL script** reads every table from SQLite and bulk-inserts into
Postgres in FK order (`Player → Character → Guild → Item/Quest/Battle/…`),
preserving cuids. Validate row counts + spot-check balances against the ledger.
If there is meaningful production data at cutover:

1. **Expand:** stand up Postgres, deploy code that can talk to *either* store
   behind a flag.
2. **Backfill + dual-write** for a short window.
3. **Verify** counts/checksums.
4. **Flip** the read flag to Postgres; keep SQLite as read-only rollback for
   24h.
5. **Contract:** remove the SQLite path.

For all *future* schema changes we use the expand/contract discipline of §2.1;
Neon branching + additive-only migrations mean the old and new app versions
coexist during Vercel's rolling deploy, giving true zero-downtime.

### 3.6 Vercel deployment, envs, previews

- **Environments:** `production` (Neon main branch), `preview` (Neon branch per
  PR — created/destroyed by CI), `development` (local; may keep SQLite for
  offline dev *or* a personal Neon branch — prefer parity).
- **Secrets** live in Vercel Environment Variables (encrypted), never in the
  repo; local dev uses `.env` (gitignored, already is). Full inventory in
  Appendix A.
- **Build:** `prisma generate && next build` (already the `build` script).
  Migrations run as a *separate* deploy step (`prisma migrate deploy`) gated in
  CI — **never** auto-`migrate dev` in production.
- **Preview isolation:** because each PR gets its own DB branch and its own
  real-time app key namespace, previews can't corrupt prod data or cross-talk.

---

## 4. Real-Time Layer

### 4.1 What actually needs real-time (from module 05, 06, 07)

| Feature | Latency need | Direction | Volume |
|---|---|---|---|
| Guild chat | ~1s | server↔client (broadcast) | medium, bursty |
| Arena challenge / duel result | ~1–2s | server→challenged player | low |
| Presence (who's online in guild) | ~5–10s | server→client | medium |
| Live event / world banners (06) | seconds | server→all | low, fan-out huge |
| Push-style toasts (loot, guild pings, 07/08) | ~1s | server→client | medium |

None of this is twitch gameplay — the game is asynchronous by design. That
materially lowers the bar: we need *notification and light chat*, not
authoritative real-time simulation.

### 4.2 Transport decision

- **WebSockets vs SSE vs polling.** Vercel's serverless functions are
  request-scoped and cannot hold long-lived socket servers economically, and
  running our own stateful WS fleet is a scaling/ops burden we don't want at M3.
- **Recommendation: a managed pub/sub real-time service** (Ably or Pusher
  Channels class). The server *publishes* on the trusted side; clients *only
  subscribe* (they never publish gameplay — server authority, §6). Presence and
  channel scoping (per-guild, per-player, global) come built in and scale
  horizontally without us running socket infra.
- **Fallback ladder** for restrictive networks / cost control: WebSocket →
  **SSE** (one-way server→client, which covers most of our needs) → **long-poll
  / interval poll** on a lightweight `/api/sync` endpoint. The client abstracts
  transport behind one `useRealtime()` hook so the rest of the app is
  transport-agnostic.
- **Chat send path** is a normal server action (validated, rate-limited,
  moderated — §7), which then *publishes* the accepted message to the channel.
  Clients never write to the channel directly. This keeps moderation, profanity
  filtering, and anti-spam server-authoritative.

### 4.3 Scaling & cost control

- Scope channels tightly (`guild:{id}`, `player:{id}`, `world`) so fan-out is
  bounded; avoid one mega-channel.
- Presence via periodic heartbeats + KV TTL rather than a socket per idle user.
- Managed vendor cost is per-message/peak-connection; because sessions are short
  (2–5 min) concurrent connections stay low relative to DAU. Budget in §8.6.
- If vendor cost ever dominates, the SSE fallback path (served from our own edge
  functions with KV pub/sub) becomes the primary — the abstraction makes that a
  config change, not a rewrite.

---

## 5. Scheduler & Background Jobs

### 5.1 Jobs the game needs (module 06 is the big customer)

| Job | Trigger | Idempotency requirement |
|---|---|---|
| **Quest completion sweep** | cron (e.g. every minute) *or* lazy-on-read | High — must not double-pay |
| **Season rollover** (rank, rewards, reset) | cron at season boundary | High — one-shot per season |
| **Leaderboard recompute** → `LeaderboardSnapshot` | cron (e.g. 5–15 min) | Idempotent by design (recompute) |
| **Event activation/deactivation** (06) | cron / scheduled-at | High — flip once |
| **Battle-pass & daily/weekly resets** (06/08) | cron daily/weekly | High |
| **Push notification sends** (08/10) | queued fan-out | Dedupe per (player,campaign) |
| **Store webhook processing** (08) | event-driven (webhook) | High — money |
| **Anti-cheat batch detectors** (§6.7) | cron | Idempotent (recompute flags) |

### 5.2 The serverless reality & choice

Vercel Cron can *trigger* endpoints but gives no durable queue, retries, fan-out,
or step orchestration. For anything money- or reward-grade we need durability.

**Recommendation:** **Vercel Cron for simple periodic triggers** +
**a durable queue/workflow service (Inngest or Upstash QStash)** for fan-out,
retries, delays, and multi-step flows (season rollover is a workflow, not a
single call). Inngest's step functions + built-in idempotency keys fit season/
event orchestration cleanly; QStash is the lighter option if we only need
"reliable HTTP with retries + schedules." Start with QStash at M2/M3, adopt
Inngest if workflow complexity (raids, multi-stage events) grows.

### 5.3 Idempotency & correctness (non-negotiable)

- Every job carries a **job key** (`season:2026Q3:rollover`,
  `quest:{id}:payout`). A completed key is recorded (KV + `IdempotencyRecord`);
  re-delivery is a no-op returning the prior result. Queues guarantee
  *at-least-once*, so **every handler must be idempotent** — we design for
  duplicate delivery, not against it.
- **Quest payout** specifically: prefer **lazy settlement** — the source of
  truth is `ActiveQuest.endsAt`, and payout happens on the player's next
  `collectQuest()` (already server-checked). The cron sweep is a *safety net*
  for offline players (so idle rewards accrue), and both paths write through the
  same ledgered, idempotent settle function — collecting twice is impossible.
- **Money jobs** (store webhooks) verify signature, dedupe by store
  transaction id, and grant entitlements inside a transaction with an audit row.
- Long jobs run in bounded batches with cursors (leaderboards over N players are
  paginated) to stay within function time limits.

---

## 6. Server-Authority & Anti-Cheat Framework

The master contract: **the client is a renderer; all outcomes are computed
server-side.** The slice already honors this (game math is in `game.ts`,
imported only by server actions; the quest ready-check refuses early collects).
This section hardens it into a framework.

### 6.1 The action wrapper (single choke point)

Every mutating server action runs through one higher-order wrapper so the
guarantees can't be forgotten per-action:

```
withAction(name, schema, handler) =
  authenticate            // resolve Session → Player → Character
  → rateLimit(name)       // KV sliding window per (player, action)
  → idempotency(key)      // replay-safe
  → validate(schema)      // Zod parse of intent inputs
  → ownershipChecks       // the acted-on rows belong to this player
  → handler(ctx)          // pure game math + transactional persist
  → emitEvents            // juice (07) + analytics (08)
  → typedResult           // { ok, ... } never throws raw
```

This makes the security posture *auditable*: "is this action safe?" becomes "is
it wrapped, and are its ownership checks correct?"

### 6.2 Input validation

Zod schemas at every boundary. Intents are *enums and ids*, never numbers the
server will trust (you request "start quest length=LONG", you do **not** send
the gold reward). Anything numeric from the client is treated as a hint for UI
only. Reject unknown fields.

### 6.3 Rate limiting & replay protection

- Per-action sliding-window limits in KV (e.g. arena fights/min, chat msgs/min,
  crafts/min) — stops scripted spam and protects the DB.
- **Idempotency keys** on all reward/money actions (client-generated UUID per
  intent). Replays return the stored result. This is *both* a UX safety (double
  taps, retries on flaky mobile) *and* an anti-cheat control (can't replay a
  winning fight for repeated payouts).
- Global per-IP and per-account throttles at the edge for auth endpoints.

### 6.4 Deterministic, seeded, logged combat RNG

**Today `game.ts` uses ambient `Math.random()`** for damage variance, crits,
loot rolls, and opponents. That is fine for feel but has two problems at scale:
it's **non-reproducible** (can't audit a disputed drop) and **non-auditable**
(can't prove a result was fair). The framework upgrade:

- Replace ambient `Math.random()` in competitive/reward paths with a **seeded
  PRNG** (e.g. a small xoshiro/mulberry32). The **seed is generated and stored
  server-side** per battle/loot roll (`MatchRecord.seed`, `Item.seed`).
- Given `(seed, inputs)` the outcome is **fully reproducible** → we can replay
  any fight for support/anti-cheat, and a rejected client claim can be
  server-verified.
- Seeds are never exposed before resolution (no client precomputation of "which
  fight to take"). Loot seeds make legendary rolls auditable (§2.5, module 04).

### 6.5 Ownership & precondition checks

Every action re-derives authority from the session, never from client-supplied
ids of *other* rows: you can only equip *your* item, spend *your* gold, push
*your* dungeon, post to a guild you're *actually* a member of (checked against
`GuildMembership`). Cross-entity actions (send guild invite, challenge player)
validate both sides' state server-side.

### 6.6 Bot & multi-account (multi-boxing) detection

The async design makes twitch-botting pointless, but *farming* bots and
alt-account boosting (feeding a main via rigged arena/guild transfers) are real
threats to leaderboards and economy. Signals we collect and batch-evaluate:

- Superhuman cadence / perfectly periodic action timing (from action timestamps).
- Device/IP/fingerprint clustering across accounts (many alts, one operator).
- Suspicious value flow: repeated one-directional gold/gift/arena-loss transfers
  between the same account pair (collusion / boosting).
- Impossible progression velocity (xp/gold per hour beyond theoretical max given
  the curves Combat/Economy define).

Detected patterns raise `AntiCheatFlag` rows for review + optional automated
soft-actions (shadow-exclude from ladder, throttle) — never silent hard bans
without human review at launch.

### 6.7 Economy anomaly detection

Because **all currency moves through `CurrencyLedger`** (§2.4), the economy is
observable end-to-end:

- Faucet/sink dashboards (gold created vs destroyed) per cohort — a spike flags a
  possible dupe/exploit *before* it wrecks the economy.
- Per-account balance deltas that exceed the possible-earnings envelope trigger a
  flag + freeze pending review.
- Any ledger write that would drive a balance negative is rejected in-transaction
  (no overdraft = no dupe via race). Balances are validated against the ledger
  sum on a schedule; drift = incident.

### 6.8 What we explicitly do NOT do

Client-side validation is UX only, never security. We never trust
client-reported outcomes, timers, RNG, or balances. No secret-in-client
"obfuscation" is treated as protection.

---

## 7. Security

### 7.1 Session hardening (evolve, don't rip out)

Today: a random `sessionToken` (two concatenated UUIDs) on `Player`, mirrored in
an httpOnly cookie, looked up by token — a solid, forgery-resistant baseline.
Upgrades, sequenced and additive:

1. **Promote to a `Session` table** (§2.4) storing **hashes** of tokens, not raw
   tokens (a DB leak then doesn't hand out live sessions). Supports multiple
   devices, per-session revoke, and "log out everywhere."
2. **Rotation & expiry:** issue on login (already done), rotate on privilege
   change, set real `expiresAt`, and rotate the token periodically. Today's
   cookie is a 1-year `maxAge` with no server expiry — tighten to a rolling
   window with silent refresh.
3. **Cookie flags:** add **`secure`** (currently only `httpOnly` + `sameSite:
   lax`) in production, keep `httpOnly`, keep/verify `sameSite` (`lax` is right
   for a top-level app; `strict` breaks external links back in).
4. **JWT trade-off — decision: stay with opaque server-side sessions.** JWTs buy
   stateless verification but can't be revoked before expiry without a
   blocklist (which reintroduces the DB lookup we'd be trying to avoid), and a
   leaked long-lived JWT is worse than a revocable token. For a server-
   authoritative game where we already hit the DB every action, opaque tokens
   are simpler and *safer*. Revisit only if we add cross-service auth.

### 7.2 Authorization model

Two layers: (a) **identity** — session → player. (b) **role/permission** for
social features — `GuildMembership.role` (MEMBER/OFFICER/LEADER) gates guild
admin actions; a small `staff` flag gates internal/admin tooling. All authz is
checked server-side in the action wrapper (§6.1); the UI hides controls for feel
but never *enforces*.

### 7.3 OWASP Top-10 posture

- **Injection:** Prisma parameterizes everything; no raw SQL string-building. Any
  raw query uses `$queryRaw` with parameters only.
- **Broken access control:** ownership checks in every action (§6.5); this is the
  most likely real vuln class in a game, so it's the wrapper's core job.
- **Auth failures:** bcrypt (already, cost 10 → raise to 12 and consider argon2id
  for new hashes), rate-limited login, generic error messages (already: "Invalid
  name or password"), no user enumeration on register beyond the necessary
  uniqueness check.
- **Cryptographic failures:** TLS everywhere (Vercel default), token hashing at
  rest, secrets in the vault.
- **SSRF / XSS:** React escapes by default; chat and user text are sanitized
  server-side before broadcast (§4.2); no `dangerouslySetInnerHTML` on user data.
- **Misconfig / vulnerable components:** Dependabot/renovate + `npm audit` in CI;
  minimal surface.
- **Integrity failures:** signed store webhooks, verified deploy pipeline.

### 7.4 Secrets

All secrets in Vercel encrypted env vars + a rotation policy; never in the repo
(`.env` is already gitignored). Inventory in Appendix A. Separate keys per
environment (prod/preview/dev) so a preview key leak can't touch prod.

### 7.5 PII / GDPR

We deliberately collect little PII (account name — which is public hero name —
plus password hash; optional email if we add recovery). Commitments:

- **Data map + retention:** know where every personal field lives; analytics
  events are pseudonymous (player id, not name/email).
- **DSAR support:** export ("download my data") and delete ("right to be
  forgotten") are jobs (§5) that walk the `Player` graph; the `CurrencyLedger`
  and financial records are retained per legal/tax requirements with the
  identity anonymized.
- **Consent** for analytics/marketing where required; ethical-monetization pillar
  means no dark-pattern tracking.
- **Children:** age-gate per store policy; no behavioral profiling of minors.

### 7.6 Password/auth roadmap

M1: keep name+password (bcrypt→argon2id, min length up from 6, breach-list check,
optional email for recovery). M4+: optional OAuth/social login and passkeys as
*additional* methods (additive `AuthMethod` table), never forced.

---

## 8. Performance & Scale

Target envelope: smooth to ~**50k DAU** on the Neon + Vercel stack without
re-architecture; the pillar is "**performance is a feature**" — <2s first load,
instant *perceived* response (optimistic UI + server reconcile).

### 8.1 Caching layers

1. **CDN / edge** — static assets and cacheable RSC payloads at Vercel's edge.
2. **Next.js data cache** — tag-based caching of read-mostly, server-authored
   *content* (class defs, shop templates, talent trees, event configs, leaderboard
   snapshots) with targeted `revalidateTag` on change. Player-specific state is
   not edge-cached (correctness > latency for authoritative data).
3. **KV (Upstash Redis)** — rate limits, idempotency, presence, feature flags,
   and hot leaderboard reads.
4. **DB read replica** — route heavy read-only aggregates (leaderboards, guild
   rankings) to a Neon replica; writes go to primary.

### 8.2 Indexing strategy (name the hot queries)

The existing `@@index([characterId, location])` on `Item` and the unique
constraints are the right instinct. Target hot paths and their indexes:

| Hot query | Index |
|---|---|
| Session lookup by token (every request) | `Session(tokenHash)` unique — the single most frequent read |
| Load a hero + relations | PKs + `Character(playerId)` unique (exists) |
| Inventory/shop by location | `Item(characterId, location)` (exists) |
| Guild roster & member stats | `GuildMembership(guildId)`, `GuildMembership(characterId)` |
| Guild chat page (recent messages) | `ChatMessage(channelId, createdAt DESC)` |
| Leaderboard read | serve from `LeaderboardSnapshot(seasonId, rank)`; **don't** `ORDER BY level` over all characters live |
| Arena matchmaking (find opponent near rating) | `PvpRating(bracket, rating)` |
| Ledger by character (economy + anomaly) | `CurrencyLedger(characterId, createdAt DESC)`; `CurrencyLedger(idempotencyKey)` unique |
| Active quest sweep | `ActiveQuest(endsAt)` for the cron settle |
| Analytics/event append | write-optimized sink, minimal indexing (§9.2) |

Rule: add an index for every query that runs per-request or per-cron-tick; verify
with `EXPLAIN` on Postgres, not by guessing. Composite indexes ordered by
equality-then-range.

### 8.3 N+1 avoidance & pagination

- Prisma `include`/`select` load a hero and its items/quests/logs in **one**
  round trip (the slice's `loadCharacter` already does this); we keep that
  discipline and lint against per-row queries in loops.
- **Cursor pagination** (not `OFFSET`) for chat history, battle logs, ledger,
  and leaderboards — `WHERE createdAt < cursor ORDER BY createdAt DESC LIMIT n`
  stays fast at depth.
- Select only needed columns for list views (roster shows level, not the whole
  character).

### 8.4 Edge vs Node runtime

- **Node runtime** for all server actions (Prisma + game math + crypto need it).
- **Edge** only for cheap, stateless, latency-sensitive reads (a health check,
  maybe a cached public leaderboard) — never for authoritative mutations.
- Choose per-route deliberately; default to Node for anything touching the DB.

### 8.5 Query & write hygiene

Short transactions (no user-wait inside a tx), batch writes (`createMany` as the
slice already does for shop stock), and push fan-out/aggregation to jobs (§5)
rather than inline request work.

### 8.6 Cost model per DAU (order-of-magnitude)

Idle sessions are short and infrequent → cost/DAU is low. Rough monthly bands at
~10k DAU (validate with real numbers):

| Component | Driver | Rough monthly @10k DAU |
|---|---|---|
| Vercel (functions + bandwidth) | invocations, RSC egress | low-mid hundreds $ |
| Neon Postgres | compute-hours (scale-to-zero helps) + storage | low hundreds $ |
| Upstash KV | commands | tens $ |
| Real-time vendor | peak connections + messages | tens–low hundreds $ |
| Object storage + CDN | asset egress | tens $ (cache-heavy) |
| Queue/cron | invocations | tens $ |
| Observability | ingest volume | tens–low hundreds $ |

Target **< $0.05–0.10 / DAU / month** at this band, trending down with scale.
The biggest cost lever is keeping player-specific work out of the edge cache-miss
path and analytics off the primary DB.

---

## 9. Observability & Quality

### 9.1 Logging

Structured JSON logs (one event per line) with a request/action id, playerId,
action name, latency, and result. No secrets or full PII in logs. Server actions
log at the wrapper (§6.1) so coverage is uniform.

### 9.2 Metrics & tracing

- **Metrics:** p50/p95/p99 latency per action, error rate, DB query time,
  queue depth/lag, real-time message rate, cache hit rate, and the game KPIs
  (§11). Vercel Analytics + a metrics backend (e.g. Grafana Cloud/Datadog tier).
- **Tracing:** OpenTelemetry spans across action → DB → queue → real-time so a
  slow `collectQuest` is traceable end-to-end.
- **Analytics pipeline (module 08):** gameplay events (`QUEST_DONE`, `LEVEL_UP`,
  `PURCHASE`, `FTUE_STEP`) are emitted at the same seam as juice events and land
  in a **cheap append sink** (e.g. Tinybird/ClickHouse/warehouse) — *not* the
  transactional Postgres — so analytics volume never contends with gameplay.

### 9.3 Error tracking & alerting

Sentry-class error tracking on client + server (source-mapped). Alerts on: error-
rate spikes, p95 SLO breaches, queue backlog, failed money webhooks, ledger drift
(§6.7), and anti-cheat flag surges. Alerts page a human for money/data-integrity
issues; everything else is dashboarded.

### 9.4 CI/CD

- **CI on every PR:** typecheck, lint (eslint config exists), unit tests,
  `prisma migrate diff` **additive-only guard** (fail the build on a destructive
  migration), integration tests against a Neon preview branch, e2e smoke.
- **CD:** merge → Vercel deploy; `prisma migrate deploy` as a gated step;
  automatic preview deploys per PR with their own DB branch (§3.6).

### 9.5 Testing strategy

- **Unit — the priority.** `game.ts` is pure and deterministic-by-design; it gets
  the deepest coverage (reward curves, level-ups, battle resolution with a
  **fixed seed**, loot tables, affix rolls). This is where correctness of the
  *game* is proven cheaply. Seeded RNG (§6.4) makes combat unit-testable.
- **Integration:** server actions against a real (branch) Postgres — auth,
  ownership rejection, idempotency replay, ledger correctness, transaction
  atomicity.
- **E2E:** Playwright through the real UI for the core loops (register → quest →
  collect → shop → fight → guild) on every deploy.
- **Load/soak:** before M4 launch, simulate season rollover + leaderboard
  recompute + a chat storm at target DAU.

### 9.6 Feature flags & experiments

`FeatureFlag`/`Experiment` (§2.4), KV-fronted. Every risky launch (new event,
monetization surface, balance change) ships behind a flag with % rollout and a
kill switch. A/B variant assignment is stable per player and logged to analytics
so Growth (08) can measure. Flags are also our **live-ops safety valve** — turn
off a broken event without a deploy.

---

## 10. Client Platform (PWA, Offline, Push, CDN)

### 10.1 PWA / installability

Ship a web manifest + service worker so the game is installable on mobile home
screens and desktop (the "browser + mobile (PWA)" mandate). App-shell caching
gives a native-feel instant open; the SW precaches the shell and static assets
and network-firsts dynamic data.

### 10.2 Offline & optimistic UI

- **Optimistic UI** is how we hit "instant perceived response": on a tap the
  client immediately renders the *predicted* result (quest started, gold spent)
  while the server action runs, then **reconciles** with the authoritative
  response (`revalidatePath`). The server always wins (§1.3, §6). This is a feel
  feature, not an authority shortcut.
- **Offline** is graceful-degrade, not offline-play (server authority forbids
  offline mutation): cache the last authoritative view, queue at most a single
  intent to replay on reconnect (idempotency-keyed so a reconnect can't
  double-apply), and show a clear "reconnecting" state. Idle rewards accrue
  server-side regardless (lazy settle, §5.3), so being offline never costs
  progress.

### 10.3 Push infrastructure (for module 08)

**Web Push (VAPID)** for "quest ready," "you were attacked in the arena," guild
pings, and live-ops nudges — the retention spine. `PushSubscription` stores
per-device endpoints; sends are **queued fan-out jobs** (§5) with per-(player,
campaign) dedupe and quiet-hours/consent respect (ethical-monetization pillar).
On iOS this rides installed-PWA push. A native wrapper (Capacitor) is a later
option if store presence or richer push is needed — the PWA-first architecture
keeps that door open without committing now.

### 10.4 Asset / CDN strategy

Sprites, portraits, audio stems (module 07), and generated images live in
**object storage (Vercel Blob or Cloudflare R2) behind a CDN**, content-hashed
for immutable long-cache. Audio is lazy-loaded per screen; large art is
responsive/lazy. Generated per-player art (if any) is rendered by a job and
cached, never on the request path.

---

## 11. Milestone Phasing, Risks & KPIs

### 11.1 What tech unblocks each milestone

| Milestone | Platform deliverables (this module) | Unblocks |
|---|---|---|
| **M1 — Foundation** | **SQLite→Postgres (Neon) cutover**; pooled+direct URLs; `db.ts` adapter swap; CI with additive-migration guard; Vercel prod/preview envs + secrets; `secure` cookie + session hardening pass 1; error tracking + basic metrics; PWA shell | Durable, deployable service; every module now has a real DB and preview branches. Art/audio hooks get CDN asset hosting. |
| **M2 — Depth** | `Session` table + rotation; **`CurrencyLedger`**; action wrapper (auth/rate-limit/idempotency/validate) as the standard seam; satellite tables for talents/skills (03) & affixes/crafting (04); seeded RNG for loot/combat; feature flags | Talent/craft/skill systems land safely (additive); ledger makes economy auditable before it gets complex. |
| **M3 — Endgame** | **Real-time layer** (chat/presence/arena/world) + fallback ladder; **scheduler/queue** (seasons, leaderboards, events); `LeaderboardSnapshot`; guild/chat/rating tables (05); season/event/tower/raid tables (06); read replica for leaderboards | Chat, seasons, ladders, events, raids — the reasons to stay. Scale reads without hurting writes. |
| **M4 — Launch** | Full **anti-cheat** framework (bot/multi-account/economy detectors, `AntiCheatFlag`); analytics pipeline (08) off-DB sink; monetization money-grade path (webhooks, `Purchase`/`Entitlement`, audit, reconciliation); push fan-out; load/soak tests; SLO alerting; GDPR export/delete jobs | Ship & scale safely; fair ladders; honest, reconciled monetization; growth instrumentation. |
| **M5 — Live** | Cost/scale tuning; DR/backup drills (PITR restore rehearsals); ongoing experiment platform; capacity headroom for seasonal spikes; incident runbooks | Sustainable live-ops cadence, tournaments, community scale. |

### 11.2 Dependencies & sequencing notes

- Everything depends on **M1's Postgres cutover** — it is the critical path; no
  sibling can ship durable state until it lands.
- The **action wrapper + ledger (M2)** must precede complex economy/crafting
  (04) and monetization (08), or we'll retrofit anti-cheat and auditability under
  fire.
- The **scheduler (M3)** must precede seasons/events (06); the **real-time
  layer (M3)** must precede chat/presence (05).
- **Seeded RNG (M2)** must precede competitive ladders (M3) so results are
  auditable before they're ranked.

### 11.3 Top risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Data loss / corruption** | Catastrophic (player trust) | Neon PITR backups + *rehearsed* restores; append-only ledger reconstructs balances; additive migrations only; money in transactions with audit rows. |
| **Migration breaks prod** | Downtime | Expand/contract discipline (§2.1); CI additive-only guard; `migrate deploy` gated, never `migrate dev` in prod; preview branches test every migration. |
| **Cheating / economy exploit** | Ruins ladders & economy | Server authority everywhere; ledger + anomaly detection (§6.7); seeded auditable RNG; ownership + idempotency; flag-and-review before auto-ban. |
| **Serverless scaling pitfalls** (connection exhaustion, cold starts, cron gaps) | Latency, errors | Pooled connections; queue for fan-out; lazy-settle over cron dependence; read replica; load test before launch. |
| **Real-time cost/complexity** | Cost or ops burn | Managed vendor + tight channel scoping + SSE fallback behind one abstraction. |
| **Vendor lock-in** (Neon/Vercel/real-time) | Strategic | Standard Postgres + Prisma (portable); transport abstraction; assets on portable object storage; keep the exit cost known. |

### 11.4 KPIs this module owns

| KPI | Target |
|---|---|
| **p95 server-action latency** | < 300 ms (excluding client) |
| **First load (LCP)** | < 2 s on mid-tier mobile |
| **Uptime / availability** | ≥ 99.9% monthly |
| **Error rate** | < 0.1% of actions |
| **Confirmed cheat / exploit rate** | < 0.5% of DAU flagged; economy faucet/sink within ±5% of model |
| **Ledger integrity** | zero unexplained balance drift (reconciled daily) |
| **Infra cost / DAU** | < $0.10 / DAU / month, trending down |
| **Migration safety** | 100% additive; zero destructive migrations to prod |
| **Push deliverability** | > 90% to subscribed, consented devices |

---

## Appendix A — Environment & Secret Inventory

| Key | Purpose | Scope |
|---|---|---|
| `DATABASE_URL` | Pooled Postgres (runtime) | all envs |
| `DIRECT_URL` | Direct Postgres (migrations) | all envs |
| `SESSION_SECRET` | Token hashing / signing pepper | all envs |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Upstash KV (rate limit, idempotency, presence, flags) | all envs |
| `REALTIME_APP_KEY` / `REALTIME_SECRET` | Real-time vendor (server publish) | all envs, per-env namespace |
| `REALTIME_PUBLIC_KEY` | Client subscribe key | public |
| `QUEUE_TOKEN` / `INNGEST_SIGNING_KEY` | Queue/scheduler auth | all envs |
| `BLOB_READ_WRITE_TOKEN` | Object storage (assets) | server |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push | public / server |
| `STORE_WEBHOOK_SECRET` | Verify purchase webhooks | prod/preview |
| `SENTRY_DSN` | Error tracking | all envs |
| `OTEL_EXPORTER_*` | Tracing/metrics export | all envs |
| `ANALYTICS_INGEST_TOKEN` | Analytics sink (08) | server |
| `FEATURE_FLAG_*` / flag store creds | Flags/experiments | all envs |
| `CRON_SECRET` | Authenticate Vercel Cron → endpoints | prod/preview |

Rules: distinct values per environment; stored only in Vercel encrypted env
(local `.env`, gitignored); rotated on a schedule and on suspected exposure;
never logged.

## Appendix B — Cross-Module Interface Registry

The stable seams other modules build against (owned here):

- **`withAction(name, schema, handler)`** — the mutation wrapper (§6.1). Every
  gameplay mutation registers here; gets auth, rate-limit, idempotency,
  validation, event-emit for free.
- **`ledger.credit/debit(characterId, currency, delta, reason, ref, idemKey)`**
  — the only sanctioned way to move currency (§2.4). Economy (04), monetization
  (08), and rewards (06) call it; direct writes to `Character.gold/mushrooms` are
  forbidden.
- **`emit(event)`** — the juice + analytics event bus (step 10). Game Feel (07)
  owns the event enum/schema; Tech guarantees delivery to client (real-time) and
  analytics sink.
- **`rng(seed)`** — the seeded, logged PRNG (§6.4) for all reward/competitive
  randomness. Combat (03) and Economy/loot (04) use it; `Math.random()` in a
  reward path is a review-blocker.
- **`realtime.publish(channel, payload)`** — server-side publish to the real-time
  layer (§4). Social (05) and Live-Ops (06) publish; clients only subscribe.
- **`enqueue(job, payload, opts)`** — durable job submission (§5) with
  idempotency keys. Live-Ops (06) and Growth/push (08) are the main callers.
- **`flag(key, player)`** — feature-flag/experiment read (§9.6). Any module
  gating a launch.

All seven seams enforce the master contract — **server authority, additive
schema, auditable economy** — so a module using them inherits the platform's
guarantees for free.
