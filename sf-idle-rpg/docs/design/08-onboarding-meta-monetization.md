# 08 — Onboarding, Meta & Monetization

> **Status:** ✅ Complete
> **Owner:** Senior Product Designer (Growth) · **Milestone focus:** M1–M5 · **Version:** 1.0
> **Depends on:** 04, 06, 07, 09 · **Last updated:** 2026-07-07

This module owns the three levers that turn the *Quest & Cudgel* vertical slice
into a durable, honest business: **onboarding** (getting a new hero to their
first "aha" in under a minute and to a formed habit inside a week), **retention
meta** (the daily/weekly/seasonal loops that make logging in reflexive), and
**monetization** (a cosmetic-first, no-pay-to-win store that players *respect*).
Everything here is governed by Pillar #5 — *respect the player's time and trust* —
which we treat not as a slogan but as a set of hard, testable guardrails: no dark
patterns, no fake urgency, no PvP power for sale, no notification we wouldn't want
to receive. The doc is server-authoritative and additive-migration-only by
construction, and it phases every deliverable against M1–M5 so the team can cut
cleanly at any milestone.

---

## Table of Contents

1. [Principles & Guardrails](#1-principles--guardrails)
2. [FTUE — First Session, First Day, First Week](#2-ftue--first-session-first-day-first-week)
3. [New-Player Funnel](#3-new-player-funnel)
4. [Retention Meta Loops](#4-retention-meta-loops)
5. [Notifications & Re-Engagement](#5-notifications--re-engagement)
6. [Monetization Philosophy](#6-monetization-philosophy)
7. [SKUs & Storefront](#7-skus--storefront)
8. [Pricing, Packaging, Receipts & Refunds](#8-pricing-packaging-receipts--refunds)
9. [Analytics & Experimentation](#9-analytics--experimentation)
10. [Data Model Additions](#10-data-model-additions)
11. [Milestone Phasing](#11-milestone-phasing)
12. [Risks & Mitigations](#12-risks--mitigations)
13. [KPIs & Guardrails](#13-kpis--guardrails)
14. [Open Questions & Dependencies](#14-open-questions--dependencies)

---

## 1. Principles & Guardrails

These are the non-negotiables that everything downstream inherits. When a growth
tactic conflicts with a guardrail, the guardrail wins — no exceptions, no A/B test
"just to see."

**G1 — Cosmetic-first, power-never.** Money and premium currency (`mushrooms`)
buy *identity, convenience, and time-shift*, never combat power that a
non-payer cannot also earn. See [§6](#6-monetization-philosophy) for the exact
boundary and [04 economy](./04-economy-items-crafting.md) for the canonical
currency contract.

**G2 — No fake scarcity or fake urgency.** Countdown timers are only ever attached
to things that are *genuinely* time-boxed (a real season, a real daily reset). We
never invent a "24h flash sale!" on an evergreen SKU. Rotating cosmetics rotate on
a *published, predictable* calendar (owned with [06 live-ops](./06-endgame-liveops-events.md)).

**G3 — Every notification earns its send.** Opt-in by default off, granular by
category, hard frequency caps, quiet hours, one-tap unsubscribe. If a push wouldn't
make the player *glad* we sent it, it doesn't ship. See [§5](#5-notifications--re-engagement).

**G4 — Honest storefront math.** Prices show the real per-mushroom rate. "Best
value" badges are true. Bundles show the à-la-carte comparison honestly. No
"buy 3990 to afford a 4000 item" psychological traps in the base pricing (see
[§8](#8-pricing-packaging-receipts--refunds) for our stance on this).

**G5 — Server-authoritative, always.** Entitlements, currency balances, purchase
grants, streak counters, mission completion — all computed and stored server-side.
The client is a renderer and an intent-sender. Purchases are verified against the
payment provider server-to-server before any grant. See [09 tech](./09-technical-architecture-platform.md).

**G6 — Additive migrations only.** Every table/column introduced here is additive
and backward-compatible with the shipped slice. No destructive schema changes.

**G7 — The FTUE never lies about depth.** We never show a stat, currency, or
system the player can't yet act on. Complexity unlocks progressively (Pillar #3).

**G8 — Regret-friendly.** Generous refund stance ([§8](#8-pricing-packaging-receipts--refunds)),
a "try before you equip" preview on every cosmetic, and no purchase is ever a
prerequisite for progression.

---

## 2. FTUE — First Session, First Day, First Week

**Design thesis:** the shipped slice already does the single most important thing
right — *register immediately creates a hero + shop*. There is no empty account.
Our job is to make the first 60 seconds feel like the game is happening *to and
for* the player, teach entirely by doing, and land the first dopamine hit before
any friction. We do **not** build a modal-heavy "tutorial mode"; we build a
**guided first quest** with contextual coach-marks that the game narrates in its
own satirical voice (Pillar #2). Tone and copy are co-owned with
[02 narrative](./02-narrative-world-content.md); juice/celebration beats are
[07 game-feel](./07-game-feel-audio-juice.md).

### 2.1 The First 60 Seconds (minute-by-minute, second-by-second)

The North Star for this window: **hero in the world, first quest launched, first
reward previewed — before the player has to make a single "real" decision.**

| Time | Screen / Beat | What the player does | What the game does (juice + teach) |
|------|---------------|----------------------|-------------------------------------|
| 0:00 | **Cold open** | Lands on register (or one-tap "Play as Guest") | Full-bleed hero art, animated banner, the Narrator hooks: *"Another hero? The realm's insurance premiums thank you."* CTA: **Begin** |
| 0:05 | **Name your hero** | Types a name (pre-filled with a funny random one they can keep) | Live nameplate animates in. No email required yet (guest-first, see §3.2). |
| 0:12 | **Class pick** (see §2.4) | Picks Warrior / Mage / Scout from 3 big cards | Each card animates its fantasy in one line + a 2s idle loop; pick triggers a *transform* flash + signature SFX |
| 0:20 | **Hero reveal** | Watches (skippable) | Hero assembles on screen, cudgel *thunks* into hand, title card: *"Level 1. Rusty. Promising."* |
| 0:26 | **Guided Quest** | One glowing button: **Send on your first quest (10s)** | Coach-mark points at the quest button; the normal 5-min minimum is *overridden to 10s for quest #1 only* so the reward lands in-session |
| 0:36 | **Live countdown** | Watches the 10s bar; taps nothing | Countdown has weight — ticking SFX, the world "works." Narrator teases loot. |
| 0:46 | **Collect!** | Taps **Collect** (the aha) | **First reward celebration** (07): gold coins burst, a common item flies into the bag, XP bar fills toward L2. This is the aha moment. |
| 0:52 | **Equip prompt** | Taps the new item → **Equip** | Coach-mark: "You found a Cudgel of Mild Improvement. Equip it." Stat number ticks *up* with a satisfying pop — teaches the core gear→power loop. |
| 0:58 | **Next-goal handoff** | Sees the goal tracker light up | "Next: reach Level 2 and clear Dungeon Floor 1." Hands off to the checklist (§3.3). First session goal is now legible. |

By 0:60 the player has: named a hero, expressed identity (class), completed the
core loop once (quest → loot → equip → power-up), and been handed a concrete next
goal. **Zero currency stores, zero premium currency, zero stats they can't use**
have been shown (G7).

### 2.2 The First Session (minutes 1–10)

The first quest's 10s override is a one-time trick; quest #2 onward uses the real
timers. To avoid the first "wait" feeling like a wall, we front-load *active*
content in this window:

1. **Quest #2** — offer a 5-min quest, but immediately surface a parallel activity
   so the timer isn't dead air: *"While your hero's away, let's test that new
   cudgel."*
2. **First Arena duel** (guided) — a scripted, winnable duel vs. a deliberately
   weak NPC ghost ("Sir Reginald the Overconfident"). Teaches Arena, guarantees a
   win, celebrates it. Server-authoritative outcome, but matchmaking is fixed for
   this scripted fight.
3. **First Dungeon floor** (guided) — Dungeon 1 / Floor 1, tuned to be a clear.
   Drops a *guaranteed uncommon* so the player sees rarity color for the first
   time (teaches the rarity ladder without explaining it).
4. **First shop visit** — now the player has gold from 3 sources. Coach-mark:
   *"You're rich (for a given value of rich). Spend it."* Teaches buy/equip/sell.
   The **mushroom** currency is *visible in the wallet but greyed with a tooltip*
   — "Premium. You'll earn some soon. No rush." (Honest, non-pushy first contact
   with premium currency — G1/G4.)
5. **Session-end hook** — quest #2 has ~2 min left. We show the "next collect at
   HH:MM" and *offer* (never force) notification opt-in framed as a benefit:
   *"Want a nudge when your hero's back? We'll only ping you for things you'd
   actually care about."* (§5.5).

**First-session success = completed the loop 3×, won a duel, cleared a floor,
made one shop transaction, saw the next-goal tracker.** Target: 70%+ of starts
reach this state (§3).

### 2.3 The First Day & First Week

| Horizon | Goal state | Mechanisms |
|---------|-----------|------------|
| **Session 2 (same day)** | Return once after first quit | Streak-at-risk *not yet* relevant; instead a "quest ready" push (if opted in) or, for the ~60% who didn't opt in, an emailed "your loot is waiting" (if guest→account converted). |
| **First Day (D0–D1)** | Reach L5, first talent point (M2), join-or-see a guild | Daily missions unlock at end of session 1. First **daily reward claim** on day 2 login is oversized (celebration) to cement the daily habit. |
| **D2–D3** | First *comeback* if lapsed; first guild interaction | Guild "recruit me" empty-state CTA; Arena revenge notifications become relevant. |
| **First Week (D1–D7)** | 3+ distinct systems used, in a guild, first weekly mission complete, streak of 3+ | Weekly missions + streak milestone at day 3 and day 7 (§4). First **battle-pass** exposure (free track only, M3) — see [06](./06-endgame-liveops-events.md). |

The **first monetization touch is deliberately late** — no store CTA before the
player has felt the full free loop and formed a habit (typically D2–D3). First
*offer* is the **Starter Bundle** (§7.6), surfaced once, gently, after the player
has clearly engaged (e.g., reached L5 or completed 3 daily missions), never on a
timer, never as an interstitial that blocks play.

### 2.4 Class-Choice Framing

Class choice is the first *identity* decision and the first "aha this world is
funny" moment. We frame it as **fantasy-forward, low-stakes, reversible-ish**:

- **Warrior** — *"Hit it until it stops being a problem."* (STR primary)
- **Mage** — *"Solve problems with concerning amounts of fire."* (INT primary)
- **Scout** — *"Win before they know it started."* (DEX primary)

Framing rules:
- Lead with the *fantasy and joke*, not the stat table. The primary stat is shown
  as a single icon + one word, not a spreadsheet (G7 / Pillar #3).
- Reassure against regret: a small tooltip — *"You can respec your build later;
  your class flavors the journey, not your fate."* (Respec mechanics owned by
  [03 combat](./03-combat-character-progression.md); we only need the *promise*
  to reduce choice paralysis.)
- No "recommended for beginners" label that implies the others are traps. All
  three are first-session-viable by design.

### 2.5 Empty States as Onboarding

Per the quality bar, no screen is mute. Every empty state is a teaching + tone
moment, with a single clear CTA:

| Empty state | Copy (voice) | CTA |
|-------------|--------------|-----|
| No active quest | *"Your hero is standing around. Heroically. But still standing around."* | **Send on a quest** |
| Empty inventory slot | *"This slot is aggressively vacant."* | **Visit shop** |
| No guild | *"You're a lone wolf. Lone wolves have terrible dental plans. Guilds have dental."* | **Find a guild** |
| No arena history | *"No rivals yet. The realm hasn't learned to fear you. Give it time."* | **Enter arena** |
| Cosmetics owned: none | *"Your wardrobe is... functional. Tragic, but functional."* | **Browse looks** (store, cosmetic tab) |
| No daily missions left | *"You've done it all today. Show-off. Come back tomorrow for more."* | (none — celebrate) |

---

## 3. New-Player Funnel

We instrument the funnel end-to-end (events in [§9](#9-analytics--experimentation),
infra in [09](./09-technical-architecture-platform.md)) and diagnose each drop.
Targets below are *launch* targets (M4) for browser + PWA blended; M2 internal
targets are ~10–15% lower as we tune.

### 3.1 Funnel Stages & Target Conversion

| # | Stage | Definition | Target (of prior) | Target (of top) | Primary drop-off cause & fix |
|---|-------|------------|-------------------|-----------------|------------------------------|
| 0 | **Landing** | Hit the app | — | 100% | — |
| 1 | **Start creation** | Tapped Begin/Play | 75% | 75% | Slow load / weak hook → <2s load (quality bar), stronger cold-open art & line |
| 2 | **Class chosen** | Picked a class | 92% | 69% | Choice paralysis → fantasy-forward framing (§2.4), random default name pre-filled |
| 3 | **Hero created** | Hero persisted | 98% | 68% | Registration friction → **guest-first** (§3.2), no email wall here |
| 4 | **First quest launched** | Sent quest #1 | 95% | 64% | Unclear CTA → single glowing button, coach-mark |
| 5 | **First reward collected** (AHA) | Collected quest #1 | 92% | 59% | The 10s override guarantees in-session payoff; drop here = they closed the tab → session-2 re-engage |
| 6 | **First equip** | Equipped an item | 88% | 52% | Teaches gear loop; drop = confusion → coach-mark + stat-up juice |
| 7 | **Loop x3 (session complete)** | 3 quests OR quest+duel+floor | 70% | 36% | The first *real* timer wait → parallel activity (§2.2) |
| 8 | **Account secured** | Guest→registered (email/OAuth) | 55% | 20% | Value-first conversion prompt after aha, not before |
| 9 | **D1 return** | Any session on D1 | 45% | ~9% blended | Daily reward + quest-ready notification |
| 10 | **D7 retained** | Any session on D7 | 45% of D1 | ~4% | Weekly mission, streak, guild membership |

North-star retention targets (blended, per master KPIs): **D1 ≥ 40%, D7 ≥ 20%,
D30 ≥ 10%.** These are ambitious-but-honest for a browser idle-RPG; the guest-first
+ immediate-hero design is our biggest lever on the top of funnel.

### 3.2 Guest-First Registration (the biggest top-of-funnel win)

- **Play as Guest** creates a real, server-side hero with a device-bound
  anonymous session token (no email, no password). Full game access.
- We *earn* the account: after the aha + first session (stage 8), we prompt to
  "secure your hero" with the honest benefit — *"Save your progress across
  devices and never lose your loot."* Offer email/password **and** OAuth
  (Google/Apple) one-tap.
- Guest accounts are first-class in the DB (`account.isGuest = true`), convertible
  in place (additive: set email/passwordHash, flip flag). No data migration, no
  new hero. See [09](./09-technical-architecture-platform.md) for token model.
- Guardrail: guests get a persistent-but-dismissible "secure your hero" banner,
  never a blocking wall. Purchases *do* require securing the account first (to
  protect the buyer) — that's the one hard gate, and it's framed as protection.

### 3.3 Guided Goals / Checklist ("The Adventurer's Ledger")

A persistent, collapsible checklist that surfaces the *next* concrete goal and
never shows more than 3 items at once (G7 — no overwhelming wall of tasks). It is
the connective tissue between FTUE and the daily loop.

- **Onboarding Ledger (first-week arc):** ~10 goals, revealed 3 at a time, each
  with a real reward (gold, first mushrooms, a cosmetic dye). Example arc:
  1. Reach Level 2 · 2. Equip a weapon · 3. Win an Arena duel · 4. Clear Dungeon
  1 Floor 1 · 5. Sell an item · 6. Reach Level 5 · 7. Claim a daily reward ·
  8. Join or found a guild · 9. Complete a daily mission · 10. Reach Level 10.
- Goal #7 grants the player's **first mushrooms** (~50) — a deliberate, honest
  taste of premium currency earned, not sold (G1). Amount coordinated with
  [04 economy](./04-economy-items-crafting.md).
- Completing the full Onboarding Ledger grants a **cosmetic-only** "Newcomer's
  Cloak" — a visible badge of having started, never a stat item.
- After the onboarding arc, the Ledger transitions seamlessly into the **daily
  missions** panel (§4) so the "next goal" surface is permanent.

**Drop-off diagnosis loop:** each Ledger goal fires a `goal_view` / `goal_complete`
event pair; the gap between them per goal is our per-step funnel. Any goal with
<70% completion within its first session of exposure gets a design review.

---

## 4. Retention Meta Loops

The retention spine from the master plan is **daily quests → weekly guild goals →
seasonal ladders.** This section owns the *personal* meta (dailies, weeklies,
streaks, milestones, comeback); the *seasonal* layer (battle pass, events,
ladders) is [06 live-ops](./06-endgame-liveops-events.md). We coordinate cadence
so the player never faces a redundant or conflicting task list.

### 4.1 Cadence Map (coordinated with 06)

| Cadence | Owner | Reset | Player-facing surface | Purpose |
|---------|-------|-------|----------------------|---------|
| **Daily missions** (3–4) | 08 | 05:00 local (server-tracked) | Ledger / "Today" tab | Reflexive daily return |
| **Daily reward calendar** | 08 | daily login | Login modal (celebratory) | Streak anchor |
| **Weekly missions** (5–6) | 08 | Monday 05:00 | "This Week" tab | Deeper weekly engagement |
| **Weekly guild goals** | 05/06 | Monday | Guild hall | Social pressure (positive) |
| **Battle pass** (free + premium) | 06 | Season (~6 wk) | Pass screen | Long-arc progression + monetization |
| **Seasonal ladder** | 06 | Season | Hall of Fame | Prestige chase |

**Anti-overlap rule:** daily missions draw from activities the player *has
unlocked* and are capped at ~10–15 min of directed play so they never crowd out
weeklies or the battle pass. Battle-pass XP is earned *through* doing dailies/
weeklies, not as a separate grind — one set of actions feeds all layers (owned
jointly with 06).

### 4.2 Daily Missions

- **3 missions/day** for new players (levels 1–10), **4/day** thereafter.
- Drawn from a weighted pool scoped to unlocked systems (never "clear Floor 10"
  to a level-3 player — G7). Examples: *Send 3 quests · Win 2 duels · Clear any
  dungeon floor · Sell 5 items · Spend 500 gold.*
- Each completion: instant micro-celebration (07). Completing **all** of a day's
  missions grants a bonus chest + battle-pass XP + a small streak contribution.
- Rewards are **gold, XP, mats, battle-pass XP, occasionally cosmetic dyes** —
  never combat power beyond normal loot, never mushrooms directly (mushrooms come
  from *milestones* and the *free battle pass track*, not daily grind, to keep the
  premium currency feeling earned-but-special — coordinate exact drip with 04/06).

### 4.3 Streaks

- **Login streak**, tracked server-side (`streak.current`, `streak.longest`,
  `streak.lastActiveDay`). A day counts if the player completes ≥1 meaningful
  action (not just opening the app — anti-hollow-engagement).
- **Milestone rewards at day 3, 7, 14, 30, 60, 100**, escalating and *including
  the first "free mushrooms via streak"* at day 7. Milestone rewards are
  previewed ahead ("Day 7: 100 mushrooms + Ember Dye") to pull the player forward
  — honest anticipation, not fake urgency (G2).
- **Streak insurance (ethical):** one **free** "streak freeze" auto-granted per
  month that silently protects a single missed day. We do **not** sell streak
  restores for money in a predatory way; if we ever offer a paid restore it's a
  trivial mushroom cost, capped, clearly optional, and never the primary path
  (leaning against it entirely for launch — flagged in [§12](#12-risks--mitigations)).

### 4.4 Milestone Rewards ("Legend Track")

Beyond streaks, a permanent account-progression track keyed to lifetime
milestones (total quests, total duels won, dungeon floors cleared, level
reached). Purely additive achievement layer that hands out gold, cosmetics, title
unlocks, and the occasional mushroom drip. This is the "always a next goal" safety
net for players between seasons.

### 4.5 "Next Goal" Surfacing

The single most important retention UX: the player should *never* see a screen
without an obvious best next action.

- The Ledger (§3.3) always shows the current top-priority goal.
- The home screen's primary CTA is *contextual* — it's "Collect" if a quest is
  ready, else "Send Quest" if idle, else "Claim daily," else "Push a floor."
  (Priority resolver is server-hinted, client-rendered.)
- A subtle "recommended" glow marks exactly one action at a time (Pillar #1 —
  every tap has weight; we never let the player feel lost).

### 4.6 Comeback Flows (lapsed players)

Tiered by absence length, all *generous and non-guilt-trippy*:

| Absence | Trigger | Experience |
|---------|---------|------------|
| 1–2 days | Return | Normal daily reward, "welcome back" one-liner. Streak intact (or insurance consumed silently). |
| 3–6 days | Return | **Comeback chest** (gold + mats + a dye), Narrator: *"The realm assumed the worst. The realm is delighted to be wrong."* Streak resets but longest-streak is honored with a nod. |
| 7–29 days | Return | **Homecoming quest line** — a short catch-up arc that grants roughly the progression they'd have earned passively (idle accrual is generous per Pillar #5), so they don't feel hopelessly behind. Preview of what's new since they left. |
| 30+ days | Return | Full "what's new" tour of shipped features + a returning-hero cosmetic. Treated almost like a re-onboard (mini-FTUE for new systems). |

Comeback rewards are **cosmetic + soft-currency + catch-up**, never a
pay-to-skip-the-catchup upsell. We win lapsed players back with generosity, not by
selling them the fix for the pain we caused.

---

## 5. Notifications & Re-Engagement

**Governing principle (G3):** notifications are a *service to the player*, not a
retention crowbar. Default off, granular opt-in, hard caps, quiet hours, one-tap
off. We would rather under-notify and be trusted than over-notify and be muted.

### 5.1 Channels

- **Web Push** (PWA + desktop browser, via the platform's push service — infra
  owned by [09](./09-technical-architecture-platform.md)). Primary channel for
  time-sensitive nudges.
- **Email** (transactional + lifecycle). Secondary, used for account, receipts,
  and lower-urgency re-engagement. Requires a secured (non-guest) account.
- **In-app inbox** — a persistent, non-intrusive message center for everything
  (so nothing *depends* on push permission; push is a convenience layer over the
  inbox, never the only place a reward or message lives).

### 5.2 Notification Taxonomy

Every notification has a **category** the player can independently toggle. Copy is
in-voice (02).

| Category | Example trigger | Example copy | Channel | Default | Urgency/Cap |
|----------|-----------------|--------------|---------|---------|-------------|
| **Quest Ready** | Timed quest completes | *"Your hero's back — and they brought stuff."* | Push | On (post opt-in) | Max 1 per quest; only if quest ≥30min & app backgrounded |
| **Energy/Idle Full** | Idle accrual cap reached (if applicable per 04) | *"Your coffers are full. It'd be a shame to waste the overflow."* | Push | Off | Max 1/day |
| **Arena Revenge** | Another player beat your defending hero | *"Sir Reginald just beat you in the arena. Rude. Do something about it."* | Push | On | Max 1 per attacker per day; batched |
| **Guild Ping** | @mention, guild-goal near completion, guild event | *"Your guild needs 3 more floors to hit the weekly goal."* | Push | On | Max 2/day, batched |
| **Streak at Risk** | Streak will break at reset & player inactive today | *"Your 12-day streak ends at midnight. Two minutes saves it."* | Push | On | **Max 1/day, only if streak ≥3, only after 18:00 local** |
| **Daily Ready** | Daily missions/reward refreshed | *"New day, new missions. The realm resets; the grind is eternal."* | Push | Off | Max 1/day, morning window |
| **Battle Pass / Event** | Season ending soon, event live | *"Season ends Sunday. Your pass rewards are waiting."* (06) | Push + Email | On | Max 2/week |
| **Comeback** | Lapsed 3+ days | *"We saved your spot. And a chest."* | Push + Email | On | Escalating: D3, D7, D14, D30 — then stop |
| **Social/Friend** | Friend joins, guild invite | *"A friend just entered the realm."* | Push | On | Max 1/day |
| **Transactional** | Receipt, security, account | *"Your purchase is confirmed."* | Email | Always on | No cap (but these are rare & wanted) |
| **Product/News** | Major update, new season | *"Update: talent trees are live."* | Email | On | Max 1/week |

### 5.3 Timing & Frequency Governance

- **Global cap:** ≤ **2 push notifications per day** per user across *all*
  categories (transactional email excluded). Batching merges same-window nudges
  into one ("3 things happened: …").
- **Quiet hours:** default 22:00–08:00 local, no push (streak-at-risk is the *only*
  exception and only if it's the player's genuine last window, capped at one).
- **Send-time optimization:** we learn each player's active window and prefer it
  (infra 09). Never send a "quest ready" while the player is *currently in the app*.
- **Fatigue backoff:** if a player ignores N consecutive pushes in a category, we
  auto-reduce that category's frequency and eventually prompt a friendly "want us
  to ease off?" rather than grinding them until they hard-disable everything.
- **Deep links:** every push deep-links to the *exact* action (collect screen,
  arena revenge duel, guild goal), never a generic home dump.

### 5.4 Ethics & Opt-In Flow

- **Opt-in is earned, not grabbed at 0:03.** We ask for push permission only after
  the player has felt value (end of session 1, §2.2), framed as a benefit with a
  concrete category preview, and with a "not now" that we honor for ≥3 sessions
  before asking again (max 2 asks, ever).
- **Preference center** (in settings + a link in every email footer): per-category
  toggles, quiet-hours editor, "pause all for 7/30 days," and one-tap unsubscribe.
- **No dark-pattern permission prompts** (no "Are you sure you want to miss out?"
  guilt gates on the native permission dialog).
- **Measurement:** we track opt-in rate, per-category mute rate, and — critically —
  **push-attributed churn** (do notified cohorts retain *better* and complain
  *less*?). If a category's mutes spike or it correlates with uninstall, we cut it.

### 5.5 Email Lifecycle (secured accounts)

- **Welcome/secure-your-hero** (post guest-conversion), **receipt**,
  **streak-at-risk digest** (for push-declined users, gentler cadence),
  **weekly recap** (opt-in; "here's what your hero did"), **season kickoff/wrap**
  (06), **win-back** (D7/D14/D30 lapsed). All CAN-SPAM/GDPR-compliant with visible
  unsubscribe; win-back stops permanently after D30 if no re-engagement (we don't
  spam the departed).

---

## 6. Monetization Philosophy

**The pledge, stated plainly:** *In Quest & Cudgel you can buy how your hero
looks, how much of your own time you save, and a season pass of cosmetic and
convenience rewards. You cannot buy power, and you can never lose a fair fight to
someone's credit card.* This is Pillar #5 rendered as a business model. It is also
a competitive *feature*: in a genre riddled with pay-to-win, "the honest idle-RPG"
is a positioning we own and market.

### 6.1 The Power/Convenience/Identity Boundary

| Category | Buyable with money/mushrooms? | Rationale |
|----------|------------------------------|-----------|
| **Combat power** (raw stats, exclusive gear power, damage multipliers, better affix rolls) | **NEVER** | Hard line. All power is earned; see 03/04. |
| **PvP/ladder advantage** | **NEVER** | Fairness is sacred (§6.3). |
| **Randomized power (gacha/loot boxes for gear)** | **NEVER** | No paid RNG for anything that affects outcomes. |
| **Identity/cosmetics** (skins, portraits, dyes, name effects, guild banners, titles, pets/companions [visual], emotes) | **YES** | The heart of our store. Pure self-expression. |
| **Convenience/time-shift** (extra quest slots, extra loadout slots, shop reroll, quest speed-ups within earnable bounds, offline-cap extension) | **YES, bounded** | Saves *your* time; a free player reaches the same place, just slower. Never uncaps power. |
| **Premium currency** (mushrooms) | **YES** | The soft-premium wallet that buys the above. Also earnable in-game (G1). |
| **Season pass** (battle pass, cosmetic + convenience track) | **YES** (premium track) | Free track exists; premium adds cosmetics/QoL, no exclusive power. (06) |
| **QoL that removes friction for everyone eventually** (auto-collect, loadout presets) | **Mixed** — some free, some pass perks | Never gate *core* readability behind pay. |

**The convenience test (applied to every QoL SKU):** *"Can a dedicated free
player reach the same outcome, just slower — and does buying this only compress
time, never raise the ceiling?"* If yes, it's fair to sell. If it raises the
ceiling or is required to compete, it's forbidden.

### 6.2 What Mushrooms Buy vs. Don't

- **Buy:** cosmetics, convenience/QoL SKUs, battle-pass tiers/skips, shop rerolls,
  cosmetic bundles, name/guild customization. (Canonical mushroom sinks live in
  [04 economy](./04-economy-items-crafting.md); this doc defines the *storefront*
  and *SKUs*, 04 defines currency faucets/sinks balance.)
- **Don't buy:** gear power, stat points, talent points, arena wins, dungeon
  clears, guild-goal completion, or anything that shows up on a leaderboard as
  *power*. Mushrooms earned in-game and mushrooms purchased are **identical and
  fungible** (no "premium-only" second tier that soft-cheats free earners).

### 6.3 How PvP / Ladders Stay Fair (explicit)

This deserves its own subsection because it's where "cosmetic-first" is most often
quietly violated in other games.

- **Arena & Hall-of-Fame power is 100% earned.** Matchmaking and outcomes (server-
  authoritative, 09) consider only earned stats/gear/talents. Cosmetics are
  invisible to combat math.
- **No paid consumables in PvP.** No "revive potion," no "arena token" that buys
  extra attempts for money in a way that converts to ranking. Arena attempt
  refreshes (if any) are earned or trivially/equally available, never a money moat.
- **Convenience never compounds into power.** Extra quest slots let you *earn
  faster*, but earning is capped by the same progression curves for everyone (03/
  04); a whale saturates the same ceiling a diligent free player reaches, just
  sooner. We validate this with a **"whale-vs-free power parity" audit** each
  season: simulate a max-spend account vs. a max-effort free account and confirm
  combat power converges (KPI in §13).
- **Cosmetic prestige ≠ power prestige.** Leaderboards rank power; cosmetics
  signal *taste and tenure*, celebrated separately (a "drip" flex, not a "might"
  flex).

### 6.4 Whale-Friendly, Yet Fair

We *welcome* high spenders — the cosmetic economy is deep enough that someone can
spend a lot on *identity* (exclusive skin lines, evolving cosmetics, guild-wide
banners they gift, prestige cosmetic collections) without ever buying an unfair
edge. Whale love is expressed through **breadth and prestige of expression**, not
power. This keeps ARPPU healthy *and* the ladder honest — the two are not in
tension when the deep spend is cosmetic.

---

## 7. SKUs & Storefront

Prices below are **USD launch targets** for the browser/PWA (card + wallet).
Regional pricing and platform fees in [§8](#8-pricing-packaging-receipts--refunds).
Mushroom values and in-game sink pricing are reconciled with
[04 economy](./04-economy-items-crafting.md); battle-pass contents with
[06](./06-endgame-liveops-events.md).

### 7.1 Mushroom Packs (premium currency)

Honest per-unit pricing; bonus grows with size but the *base rate is never
manipulated to strand the player just short of a common item* (G4, and see §8.3).

| SKU | Mushrooms | Bonus | Price (USD) | Rate (🍄/$) | Notes |
|-----|-----------|-------|-------------|-------------|-------|
| Handful | 100 | — | $0.99 | 101 | Entry / impulse |
| Satchel | 550 | +10% | $4.99 | 110 | |
| Chest | 1,200 | +20% | $9.99 | 120 | "Popular" (true) |
| Hoard | 2,600 | +30% | $19.99 | 130 | |
| Wagon | 7,000 | +40% | $49.99 | 140 | "Best value" (true) |
| Dragon's Hoard | 15,000 | +50% | $99.99 | 150 | Whale tier |

First-purchase of *any* pack grants a **one-time bonus** (e.g., +100% mushrooms
on the first buy, or a free exclusive cosmetic) — honest, clearly labeled, once.

### 7.2 Battle Pass (with 06)

- **Free track** (everyone) + **Premium track** (~$9.99 or ~1,000🍄 per season).
- Premium track is **cosmetic + convenience only** — skins, portraits, dyes,
  banners, titles, QoL tokens, and mushrooms drip-back. **No exclusive power.**
- **Premium+ / tier-skip** SKU (buy pass + N levels) for time-poor players — pure
  convenience, capped so it can't front-load power.
- Full tier tables, season theming, and pass XP sourcing owned by
  [06](./06-endgame-liveops-events.md); we own the *purchase surface* and the
  fairness guarantee.

### 7.3 Cosmetics (the core store)

| Type | Examples | Price band (🍄) | Notes |
|------|----------|-----------------|-------|
| **Hero skins** | Alt outfits, themed sets, evolving skins | 400–1,500 | Preview-before-buy mandatory (G8) |
| **Portraits / frames** | Animated frames, seasonal portraits | 150–600 | |
| **Name effects** | Color/gradient/animated nameplates, titles | 200–800 | Visible in arena/HoF as *drip*, not power |
| **Guild banners & crests** | Custom guild heraldry, animated banners | 500–2,000 | Bought by officers, benefits whole guild (giftable prestige) |
| **Dyes** | Recolor gear/cosmetics | 50–200 | Cheap, collectible, high-volume |
| **Emotes / flourishes** | Victory poses, arena taunts (visual) | 150–500 | |
| **Companions/pets (visual)** | Cosmetic critters that follow the hero | 600–1,800 | Zero combat effect |

Cosmetics rotate on a **published calendar** (06), with a permanent evergreen
catalog *and* rotating featured/seasonal drops. Nothing "leaves forever" without
a stated, honest return policy (most items vault and return; truly-exclusive items
are rare, clearly labeled, and never power).

### 7.4 QoL / Convenience SKUs

Every one passes the convenience test (§6.1). Prices reconciled with 04.

| SKU | Effect | Price | Fairness note |
|-----|--------|-------|---------------|
| **Extra quest slot** | +1 concurrent quest (cap ~+2 total) | 800🍄 each | Earn faster, not stronger; hard cap |
| **Extra loadout slot** | Save an additional gear/talent loadout | 500🍄 | Pure organization |
| **Shop reroll** | Refresh shop inventory now | 50🍄 or earnable | Also earnable free daily |
| **Offline-cap extension** | Longer idle accrual before cap | 1,000🍄 (or pass perk) | Bounded; free cap is generous per Pillar #5 |
| **Auto-collect quest** | Quest auto-collects & re-sends chosen length | Pass perk / 700🍄 | Convenience; outcomes identical & server-rolled |
| **Instant-finish token** | Finish current quest now | Small 🍄 (also earnable) | Time-shift only; capped daily to avoid pay-to-rush-power |

**Guardrail on instant-finish:** capped and bounded so it can only compress *your*
idle time within the same earning curve — it can never let a spender out-earn the
progression ceiling that gates power (03/04). Audited each season (§6.3).

### 7.5 Name / Identity Customization

Hero rename, guild rename, custom heraldry — small mushroom sinks, cosmetic-only,
first hero-name change free.

### 7.6 Starter Bundle (first-purchase design)

- Surfaced **once**, gently, after clear engagement (L5 or 3 daily missions — §2.3),
  never as a blocking interstitial, never on a fake timer.
- Contents: strong *value* skewed to **cosmetics + convenience + a mushroom stack**
  (e.g., an exclusive starter skin + 1,200🍄 + an extra loadout slot for $4.99).
  Honest comparison shown ("$14 of value for $4.99"). No power.
- Purpose: convert the *habit* into the *first transaction* at a fair, high-trust
  price — the hardest and most important conversion in F2P.

### 7.7 Storefront UX — Wireframe

Design/visual language owned by [01 art & UI](./01-art-direction-ui-ux.md); we
specify structure, IA, and fairness affordances.

```
┌──────────────────────────────────────────────────────────────┐
│  ⌂ Home   ⚔ Play   🛡 Guild   ★ Pass   🛍 Store*   ⚙          │  <- global nav
├──────────────────────────────────────────────────────────────┤
│  STORE                                     Wallet: 🪙 12,340  🍄 640 │
│  ┌────────────┬────────────┬────────────┬────────────┐        │
│  │ Featured   │ Cosmetics  │ Battle Pass│ Mushrooms  │  <- tabs│
│  └────────────┴────────────┴────────────┴────────────┘        │
│                                                                │
│  ▛▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▜        │
│  ▌  FEATURED THIS WEEK   (rotates Mon — see calendar) ▐        │
│  ▌  ┌─────────┐  Emberforged Skin Set                 ▐        │
│  ▌  │ [3D hero│  "Cosmetic. Zero stats. All drip."    ▐        │
│  ▌  │  preview│  1,200🍄   [ Preview ] [ Get ]         ▐        │
│  ▌  │  ↻ spin ]│  Returns to vault Aug 4 (honest)      ▐        │
│  ▌  └─────────┘                                         ▐        │
│  ▙▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▟        │
│                                                                │
│  ── Cosmetics ─────────────────────────────────────────       │
│  [skin] [skin] [portrait] [name fx] [banner] [dye] [pet] …     │
│   each card: thumbnail · name · 🍄price · [Preview]            │
│                                                                │
│  ── FAIRNESS FOOTER (always visible) ──────────────────       │
│  "Everything here is cosmetic or convenience. No item          │
│   sold in this store makes your hero stronger in battle.       │
│   Read our Fair-Play Pledge →"                                 │
└──────────────────────────────────────────────────────────────┘
   * Store tab is NOT shown until after FTUE session 1 (G7 / §2.3)
```

**Storefront rules:**
- **Preview-before-purchase** on every cosmetic (3D spin / try-on), and a "see it
  on your hero" toggle. No blind buys (G8).
- **Wallet always visible**; buying a SKU you can't afford routes to the mushroom
  tab with the *exact* pack that covers it highlighted — but **we never
  auto-inflate** the item price to force an over-purchase (G4).
- **The Fairness Footer** is permanent, links to the public Fair-Play Pledge — the
  store literally reminds you it can't sell power. This is a trust *feature*.
- **No confirm-shaming, no fake timers, no "only 2 left!"** on evergreen items.
  Real season/vault dates are shown honestly.
- **Owned items** are clearly marked; nothing is ever sold to a player who already
  owns it.

---

## 8. Pricing, Packaging, Receipts & Refunds

### 8.1 Regional Pricing

- **Purchasing-power-parity (PPP) tiers** per market rather than naive FX (so a
  player in a lower-income market pays a fair local price, not a $-converted one).
  Implemented via provider price tiers keyed to locale/store.
- Mushroom *pack sizes* stay constant globally; **local price** varies by tier.
  Battle-pass and bundle prices likewise localized.
- Tax-inclusive display where legally required (EU/UK VAT, etc.); the price shown
  is the price paid.

### 8.2 Payment & Platform

- **Browser/PWA:** card + digital wallets via a PCI-compliant provider (e.g.,
  Stripe-class) — no card data touches our servers (09). Server-to-server webhook
  verification before any grant (G5).
- **PWA on mobile:** where installed via browser, web payments apply; if we ever
  wrap for app stores, we honor store IAP rules and their fee/refund policies
  (flagged as a later-milestone dependency, §11).
- **Purchase flow:** intent → provider checkout → *server verifies webhook* →
  entitlement/currency grant → client reconciles. Idempotent grant keys prevent
  double-grants (09).

### 8.3 Pricing Ethics (the "just short" problem)

A classic dark pattern is pricing packs so you're always ~40 mushrooms short of
what you want, forcing an extra pack. **We reject this.** Our stance:
- Pack sizes are round and item prices are set so common purchases resolve
  *without* stranding leftover you can't use (G4).
- Leftover mushrooms are always spendable on cheap evergreen items (dyes at
  50–200🍄) so no balance is ever "dead."
- We publish the per-mushroom rate on every pack. "Best value" is arithmetic, not
  marketing.

### 8.4 Receipts & Refunds

- **Instant emailed receipt** for every purchase (transactional, always-on).
- **Refund stance (generous / regret-friendly, G8):** honor provider/legal refund
  windows *and* run a lenient discretionary policy — accidental purchase, a
  cosmetic that didn't look as expected (despite preview), or genuine buyer regret
  within a reasonable window gets refunded, no interrogation. Refunded cosmetics
  are revoked cleanly (server-authoritative entitlement flip).
- **Chargeback handling:** revoke entitlements + soft-flag account; but we aim to
  make chargebacks *unnecessary* by being refund-friendly upstream (keeps the
  master-KPI "refund/complaint rate near zero" honest — we get there by being fair,
  not by making refunds hard).
- **No purchase is ever required to progress** (G8), so no refund ever strands a
  player mid-progression.

---

## 9. Analytics & Experimentation

Event infrastructure, the pipeline, warehouse, and privacy/consent plumbing are
owned by [09 tech](./09-technical-architecture-platform.md). This section defines
the **growth event taxonomy**, the funnels/dashboards we build on it, our A/B
framework, and the north-star + guardrail metric set.

### 9.1 Core Event Taxonomy

Naming: `object_action`, snake_case, with a shared property envelope
(`account_id`, `hero_id`, `session_id`, `ts`, `platform`, `app_version`,
`ab_buckets[]`, `is_guest`). All events server-emitted where the outcome is
server-authoritative (G5); client emits only for pure UI intent/telemetry.

**Onboarding / FTUE**
- `app_open`, `session_start`, `session_end`
- `ftue_start`, `class_viewed`, `class_selected {class}`, `hero_created`
- `ftue_quest_launched`, `ftue_reward_collected` (**AHA event**), `ftue_item_equipped`
- `ftue_duel_completed {result}`, `ftue_floor_cleared`, `ftue_first_shop_txn`
- `ftue_complete`, `ftue_step_skipped {step}`, `ftue_dropoff {last_step}`
- `goal_view {goal_id}`, `goal_complete {goal_id}` (Ledger per-step funnel)

**Account / conversion**
- `guest_created`, `secure_prompt_shown`, `account_secured {method}`
- `login`, `logout`

**Core loop / engagement**
- `quest_started {length}`, `quest_collected {rewards}`
- `duel_started`, `duel_completed {result, opponent_type}`
- `dungeon_floor_attempt {dungeon, floor}`, `dungeon_floor_cleared`
- `item_equipped`, `item_sold`, `shop_purchase {gold_spent}`
- `level_up {level}`, `talent_point_spent` (M2)

**Retention meta**
- `daily_mission_assigned`, `daily_mission_complete {mission_id}`, `daily_all_complete`
- `daily_reward_claimed {day_index}`
- `weekly_mission_complete`, `streak_incremented {current}`, `streak_broken {longest}`
- `streak_milestone_reached {day}`, `streak_insurance_used`
- `comeback_triggered {absence_days}`, `comeback_reward_claimed`
- `next_goal_surfaced {goal}`, `next_goal_actioned`

**Notifications**
- `push_permission_prompted`, `push_permission_result {granted}`
- `notif_sent {category}`, `notif_delivered`, `notif_opened {category}`, `notif_dismissed`
- `notif_category_muted {category}`, `notif_all_paused {duration}`, `notif_unsubscribed`

**Monetization**
- `store_viewed {tab}`, `sku_viewed {sku_id}`, `cosmetic_previewed {sku_id}`
- `starter_bundle_shown`, `starter_bundle_purchased`
- `checkout_started {sku_id, price}`, `purchase_verified {sku_id, price, currency}`
  (**server, post-webhook — the canonical revenue event**)
- `purchase_failed {reason}`, `first_purchase {sku_id}`
- `mushrooms_earned {source, amount}`, `mushrooms_spent {sink, amount}`
- `battle_pass_purchased {tier}`, `refund_issued {sku_id, reason}`

**Fairness/guardrail telemetry**
- `power_parity_sample {account_type, power_index}` (feeds the whale-vs-free audit)

### 9.2 Funnels & Dashboards

- **FTUE funnel** — stages 0–7 (§3.1) with per-step conversion, segmented by
  platform, class, and traffic source. Alerts on any step dropping >5pp week-over-week.
- **Conversion funnel** — `store_viewed` → `sku_viewed` → `checkout_started` →
  `purchase_verified`; plus the full path to `first_purchase` and time-to-first-
  purchase distribution.
- **Retention curves** — D1/D7/D30 by cohort, guild-member vs. not, notified vs.
  not, guest vs. secured.
- **Notification health** — per-category open rate, mute rate, and push-attributed
  retention lift / churn.
- **Economy health mirror** — mushroom faucet/sink and gold faucet/sink (canonical
  in [04](./04-economy-items-crafting.md); we surface the *monetization* slice:
  earned vs. purchased mushroom ratio, sink mix).
- **Revenue** — ARPDAU, ARPPU, conversion %, revenue by SKU category (target:
  cosmetics ≥ 60% of revenue — proof the model is identity-led, not convenience-led).

### 9.3 A/B Experimentation Framework

- **Bucketing:** deterministic hash of `account_id` → stable buckets, recorded in
  `ab_buckets[]` on every event; server-assigned (G5). Mutually-exclusive layers
  so overlapping tests don't confound.
- **What we test:** FTUE copy/pacing, class-framing, Ledger goal ordering,
  notification timing/copy, store layout, starter-bundle price/contents,
  first-purchase incentive size.
- **What we NEVER A/B test:** anything that would violate a guardrail — no testing
  "does fake urgency convert better," no testing pay-to-win, no testing
  manipulative permission prompts. Ethics guardrails are not experiments.
- **Rigor:** pre-registered primary metric + guardrails per test, minimum
  detectable effect + power calc before launch, no peeking / fixed horizon or
  sequential-testing correction, holdout for long-run retention effects.
- **Guardrail auto-stop:** any experiment that moves a guardrail metric (refund
  rate, complaint rate, D7, mute rate) beyond threshold auto-halts.

### 9.4 North-Star & Guardrail Metrics

- **North Star:** **D7-retained players who completed the core loop ≥3 days** —
  it captures healthy, habitual, non-purchased engagement. Growth that doesn't
  move this isn't real growth.
- **Guardrails (a win on any other metric that hurts these is not a win):**
  refund/complaint rate (near zero), notification mute/unsubscribe rate,
  cosmetics-share-of-revenue (≥60%), whale-vs-free power parity (Δ ≈ 0), and D1/D7
  retention.

---

## 10. Data Model Additions

All additive, backward-compatible with the shipped slice (G6). Proposed to Tech
([09](./09-technical-architecture-platform.md)) for canonical schema ownership;
sketch only.

- `account.isGuest: boolean` (default true for guest-first; existing rows backfill
  `false`), `account.email?`, `account.pushSubscriptions[]`, `account.notifPrefs (jsonb)`.
- `Streak { accountId, current, longest, lastActiveDay, insuranceAvailable }`
- `DailyMission { id, accountId, missionKey, progress, target, completed, dayKey }`
- `WeeklyMission { … weekKey }`
- `LedgerGoal { accountId, goalKey, state, completedAt }`
- `Entitlement { accountId, skuId, source (purchase|earn|pass|grant), grantedAt,
  revokedAt? }` — cosmetics & QoL ownership, server-authoritative.
- `WalletTxn { accountId, currency (gold|mushrooms), delta, reason, refId, ts }` —
  audit ledger; mushroom balance is a projection (04 owns currency canon).
- `Purchase { id, accountId, skuId, provider, providerRef, priceMinor, currency,
  status (pending|verified|refunded|chargeback), idempotencyKey, ts }`
- `NotifLog { accountId, category, channel, sentAt, deliveredAt?, openedAt?,
  dismissedAt? }`
- `AbAssignment { accountId, experimentKey, bucket, assignedAt }`

Grants, balances, streaks, and mission completion are **only ever mutated
server-side**; the client reads projections.

---

## 11. Milestone Phasing

Cut cleanly at any milestone; nothing below blocks a prior milestone from shipping.

| Milestone | Onboarding | Retention Meta | Notifications | Monetization | Analytics |
|-----------|-----------|----------------|---------------|--------------|-----------|
| **M1 Foundation** | Guest-first accounts; polish register→hero; empty-state copy pass; class-framing copy | — (spine designed on paper) | In-app inbox only | — (pledge published) | Core event bus + `session_*`, loop events wired to 09 pipeline |
| **M2 Depth** | **Full FTUE** (guided first quest, coach-marks, aha, Ledger onboarding arc); funnel instrumented | Daily missions, daily reward calendar, streaks, next-goal surfacing, comeback (basic) | Web push infra + Quest Ready / Streak-at-Risk / opt-in flow | — | FTUE funnel dashboards, A/B framework live |
| **M3 Endgame** | Re-onboard flows for new systems (talents, raids) | Weekly missions, milestone Legend Track, comeback tiers, cadence coordination w/ 06 pass | Guild ping, Arena revenge, Battle-pass/Event categories, batching + caps | **Battle pass** purchase surface (w/06); mushroom wallet UI; earned-mushroom faucets | Notification health + retention dashboards |
| **M4 Launch** | Final FTUE tuning to launch conversion targets | Full cadence live, streak insurance | Full taxonomy, send-time optimization, preference center | **Full store**: mushroom packs, cosmetics catalog, QoL SKUs, starter bundle, first-purchase, payments + receipts + refunds, regional/PPP pricing | Conversion funnels, revenue dashboards, guardrail auto-stop |
| **M5 Live** | Seasonal re-onboards, win-back at scale | Seasonal meta refresh, evolving comeback | Lifecycle email program, fatigue backoff maturity | Rotating cosmetic calendar (06), whale-prestige lines, per-season parity audit | Continuous experimentation, LTV modeling |

---

## 12. Risks & Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|-----------|
| R1 | **FTUE drop before aha** (tab close pre-collect) | Med | High | 10s first-quest override guarantees in-session payoff; strong cold-open; session-2 re-engage |
| R2 | **First real timer feels like a wall** | Med | Med | Parallel activities during quest #2 wait (§2.2); generous idle |
| R3 | **Notification fatigue → mass mute/uninstall** | Med | High | Hard 2/day cap, quiet hours, earned opt-in, fatigue backoff, per-category mute telemetry with auto-cut |
| R4 | **Pay-to-win *perception*** even though we're cosmetic-first | Med | High | Permanent Fairness Footer + public Fair-Play Pledge; store literally states "no power"; seasonal parity audit published |
| R5 | **Convenience creep** — a QoL SKU quietly compounds into power | Low | High | The convenience test on every SKU; hard caps on slots/instant-finish; per-season whale-vs-free parity audit as a gate |
| R6 | **Guest churn / lost progress** | Med | Med | Persistent (non-blocking) secure-your-hero prompt; conversion after aha; cross-device on secure |
| R7 | **Streak insurance abused / streaks feel coercive** | Low | Med | One free freeze/month, no aggressive paid restore at launch; "day counts" requires real action not just open |
| R8 | **Late first-monetization touch depresses early revenue** | Med | Med | Accept it — trust-first is the thesis; starter bundle converts *habit*; monitor time-to-first-purchase, don't rush it earlier |
| R9 | **Regional/PPP pricing arbitrage** (VPN abuse) | Low | Low | Provider-side locale enforcement; accept minor leakage rather than punish legit players |
| R10 | **Cadence collision** with 06 (pass/events crowd dailies) | Med | Med | Shared cadence map (§4.1); one action feeds all layers; joint review with Live-Ops |
| R11 | **Refund generosity exploited** | Low | Low | Discretionary policy + soft-flag repeat abusers; cost of leniency < cost of eroded trust |

---

## 13. KPIs & Guardrails

Ties to master KPIs (§9 of 00). Targets are M4 launch targets, blended.

**Acquisition / Onboarding**
- Start→hero-created ≥ 68% · **FTUE aha (`ftue_reward_collected`) ≥ 59% of starts**
- FTUE full completion (Onboarding Ledger) ≥ 40% · Guest→secured ≥ 55%

**Retention (north-star region)**
- **D1 ≥ 40% · D7 ≥ 20% · D30 ≥ 10%**
- Daily-mission completion (of DAU) ≥ 50% · Median streak length ≥ 4 days
- % in a guild by D7 ≥ 35% (social retention lever, co-owned 05)

**Notifications**
- Push opt-in (of asked) ≥ 45% · Per-category mute rate ≤ 8%
- Push-attributed D7 *lift* ≥ +5pp with **no** rise in complaint rate

**Monetization**
- Conversion to first purchase ≥ 3% (of MAU) · ARPDAU on target band (04/finance)
- **Cosmetics ≥ 60% of revenue** (proof of identity-led model)
- Time-to-first-purchase healthy (not artificially compressed)

**Guardrails (must-not-regress)**
- Refund + complaint rate **near zero** (< 1% of transactions)
- Whale-vs-free **power parity Δ ≈ 0** (seasonal audit, §6.3)
- Notification unsubscribe rate ≤ 2% · No guardrail-metric loss accepted for any
  growth or revenue win.

---

## 14. Open Questions & Dependencies

**Depends on:**
- **[04 economy](./04-economy-items-crafting.md)** — canonical mushroom faucets/
  sinks, earned-mushroom drip amounts, gold pricing of QoL SKUs, currency-balance
  authority. *We define the storefront; 04 defines currency balance.*
- **[06 live-ops](./06-endgame-liveops-events.md)** — battle-pass tier tables &
  season cadence, cosmetic rotation calendar, event notification categories,
  weekly-guild-goal cadence. *Shared cadence map (§4.1) is the contract.*
- **[07 game-feel](./07-game-feel-audio-juice.md)** — the celebration/juice beats
  for the aha, daily-reward, streak-milestone, and purchase-confirm moments (via
  the shared juice-event bus).
- **[09 tech](./09-technical-architecture-platform.md)** — event pipeline/warehouse,
  web-push infra, payment-provider integration + webhook verification, entitlement/
  currency ledger authority, A/B bucketing service, guest token model.
- **[03 combat](./03-combat-character-progression.md)** — respec promise (class-
  framing), the progression *ceiling* that guarantees convenience never becomes power.
- **[05 multiplayer](./05-multiplayer-guilds-pvp.md)** — arena matchmaking fairness
  hooks, guild-ping triggers, guild membership as retention lever.
- **[01 art/UI](./01-art-direction-ui-ux.md)** & **[02 narrative](./02-narrative-world-content.md)**
  — storefront visual language and all in-voice copy.

**Open questions (for cross-module resolution):**
1. Exact first-mushroom grant amount and drip cadence (04) vs. pack pricing here —
   reconcile so earned mushrooms feel meaningful without cannibalizing packs.
2. Do we ever ship a paid streak-restore? Current stance: **no at launch** —
   revisit only with strong evidence it's player-*wanted*, and only trivially priced.
3. App-store wrapper timing (M5+?) and its IAP/fee/refund implications (09/finance).
4. Cosmetic "true exclusivity" policy — how many items *never* return, and how we
   communicate it without violating G2.

---

*End of Module 08. Cosmetic-first. Player-first. Trust is the product.*
