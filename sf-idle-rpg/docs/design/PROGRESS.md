# Design Program — Progress Dashboard

Single source of truth for the end-game design program. Each module was authored
in parallel by a dedicated senior product/game designer working in an isolated
git worktree, then integrated into `master`.

**Legend:** ✅ Complete · 🚧 In progress · 🔜 Planned · ⛔ Blocked

## Status

**Design sprint: ✅ COMPLETE — 9/9 modules delivered · ~72,300 words total.**

| # | Module | Owner | Status | Words | Doc |
|---|--------|-------|--------|-------|-----|
| 00 | Master Product Plan | Product Lead | ✅ | — | [00-MASTER-PLAN.md](./00-MASTER-PLAN.md) |
| 01 | Art Direction & UI/UX | Art Director / UX Lead | ✅ | 7.1k | [01-art-direction-ui-ux.md](./01-art-direction-ui-ux.md) |
| 02 | Narrative, World & Content | Narrative Designer | ✅ | 10.2k | [02-narrative-world-content.md](./02-narrative-world-content.md) |
| 03 | Combat & Character Progression | Systems Designer | ✅ | 6.9k | [03-combat-character-progression.md](./03-combat-character-progression.md) |
| 04 | Economy, Items & Crafting | Economy Designer | ✅ | 7.1k | [04-economy-items-crafting.md](./04-economy-items-crafting.md) |
| 05 | Multiplayer, Guilds & PvP | Social/Multiplayer Designer | ✅ | 8.6k | [05-multiplayer-guilds-pvp.md](./05-multiplayer-guilds-pvp.md) |
| 06 | Endgame, Live-Ops & Events | Live-Ops Designer | ✅ | 8.8k | [06-endgame-liveops-events.md](./06-endgame-liveops-events.md) |
| 07 | Game Feel, Audio & Juice | Game Feel / Audio Designer | ✅ | 7.8k | [07-game-feel-audio-juice.md](./07-game-feel-audio-juice.md) |
| 08 | Onboarding, Meta & Monetization | Product Designer (Growth) | ✅ | 7.9k | [08-onboarding-meta-monetization.md](./08-onboarding-meta-monetization.md) |
| 09 | Technical Architecture & Platform | Technical Architect | ✅ | 6.7k | [09-technical-architecture-platform.md](./09-technical-architecture-platform.md) |

## Headline idea per module

- **01 Art** — "Gilded Grimoire": rationed gold accent = the color of value; semantic tokens make seasonal reskins a data payload; no-artist-yet pipeline (procedural SVG crests, colorblind-safe rarity language).
- **02 Narrative** — **Addendum**, a post-heroic "sequel era" gig economy ("evil lost; its paperwork is eternal") that justifies the idle grind diegetically; tone as an engineered dynamic; a content engine non-engineers run.
- **03 Combat** — async **skill-rotation DSL** (the build *is* the gameplay); seeded, recomputable fights (free replays/spectating); three-layer prestige with anti-degenerate power caps.
- **04 Economy** — bind-on-equip / no-auction economy (kills RMT & dupes by construction); a two-tier crafting Forge as the primary anti-inflation sink; hermetic currency separation via an append-only ledger.
- **05 Multiplayer** — determinism as keystone (seeded combat → tiny replays, self-auditing ladders, a 1,024-player weekend async tournament); defense snapshots + **Glicko-2** (anti-smurf); transparent guild treasury.
- **06 Live-Ops** — author-without-code events framework (validated data, no deploys); FOMO defused structurally (streak shields, no dead currency, "go live your life" caps); one idempotent RewardGrant ledger.
- **07 Game Feel** — declarative, module-owned **Juice Event schema** (retune all feel globally, zero gameplay changes); restraint enforced structurally (intensity ladder, shared shake cap, anti-avalanche audio batching).
- **08 Growth** — 10-second first-quest override (aha in 60s); guest-first registration; **fairness shipped as a store feature** (public pledge + power-parity audit); ethics-as-hard-guardrails.
- **09 Tech** — append-only **CurrencyLedger** as economy source of truth; a single `withAction()` wrapper making server authority auditable; seeded/replayable RNG replacing ambient `Math.random()`.

## Convergences worth noting

- **The Ledger** independently appears in 04 (economy), 06 (RewardGrant), and 09 (CurrencyLedger) — strong signal to build one canonical append-only ledger first.
- **Deterministic, seeded combat** is jointly demanded by 03, 05, and 09 — the shared M1/M2 critical path that unblocks replays, ranked fairness, and testability.
- **Author-without-code content/events** recurs in 02 and 06 — invest early in a data-driven content pipeline + admin console.

_Design sprint integrated to `master` via octopus merge; each module retains its
own authored commit in history._
