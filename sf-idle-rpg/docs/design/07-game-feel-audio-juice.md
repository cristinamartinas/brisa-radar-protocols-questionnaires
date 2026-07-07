# 07 — Game Feel, Audio & Juice

> **Status:** ✅ Complete
> **Owner:** Senior Game Feel / Audio Designer · **Milestone focus:** M1–M5 · **Version:** 1.0
> **Depends on:** 01, 02, 08 · **Last updated:** 2026-07-07

**Module summary.** This module owns the polish layer that makes *Quest & Cudgel*
feel expensive — the sound, motion, and haptic response behind every tap, and the
shared **Juice Event schema** every other module emits into. It turns a
server-authoritative, menu-driven idle-RPG into something that *thumps*: a quest
collect that lands like a slot-machine payout, a legendary drop that stops the
screen, a boss kill that punches the whole viewport. The doctrine is restraint
with teeth — pillar #1 ("every tap has weight") delivered through a strict
two-channel minimum, a fixed screen-shake budget, and full parity for
reduced-motion and sound-off players so the juice is felt, never endured. It is
built web-native (CSS/transform/canvas, Web Audio, Vibration API) at a hard 60fps
with a tiny asset budget, and it phases cleanly from M1 audio hooks to M5 seasonal
set-pieces.

---

## Table of contents

1. [Juice philosophy & the "every tap has weight" contract](#1-juice-philosophy--the-every-tap-has-weight-contract)
2. [The Juice Event Schema (owned here)](#2-the-juice-event-schema-owned-here)
3. [Feedback catalog (per-action specs)](#3-feedback-catalog-per-action-specs)
4. [Audio direction](#4-audio-direction)
5. [VFX & motion](#5-vfx--motion)
6. [Haptics & accessibility](#6-haptics--accessibility)
7. [Web implementation plan](#7-web-implementation-plan)
8. [Signature "wow" moments](#8-signature-wow-moments)
9. [Milestone phasing, risks & KPIs](#9-milestone-phasing-risks--kpis)
10. [Appendix: quick-reference tables](#10-appendix-quick-reference-tables)

---

## 1. Juice philosophy & the "every tap has weight" contract

### 1.1 What "juice" means here

Juice is the layer of non-authoritative feedback that sits between a player's
intent and the game's response and makes the response feel *physical*. The server
decides what happened (see 09). Juice decides how it *feels* to have it happen.
Our north star is the tactile density of a Supercell reward screen married to the
restraint and cohesion of a Rockstar UI: nothing is silent, nothing is gratuitous.

We are an **asynchronous, menu-driven** game. That is a constraint and a gift. We
have no twitch combat to sell, so every ounce of "gameyness" lives in menus,
transitions, and reward moments. The taps are few, so each one must carry more.
A player might tap "Collect" eight times a day for a year — that button *is* the
game's handshake, and it must never feel cheap.

### 1.2 The contract: every meaningful action has ≥2 feedback channels

Per the Master Plan quality bar, every meaningful action ships with **at least two
of three feedback channels** — **Visual**, **Audio**, **Haptic** — and ideally all
three on capable devices. This is a hard review gate, not a nicety:

- **Meaningful action** = anything the player intended that changes state or
  advances the fantasy: collect, buy, equip, attack, level up, join a guild.
- **Incidental action** (hover, scroll, open a menu) gets ≤1 channel, usually a
  quiet UI tick or none, so meaningful actions stay loud by contrast.

If a channel is unavailable (sound muted, no haptic hardware, reduced-motion on),
the remaining channels must still fully communicate the outcome. **No information
is ever audio-only or motion-only** (see §6).

### 1.3 The 2-channel rule *and* the restraint budget

More juice is not better juice. The failure mode of this discipline is a slot
machine that never stops screaming, which trains players to tune it out — and then
the legendary drop lands with no headroom left to celebrate it. We enforce
restraint structurally:

- **Intensity tiers.** Every feedback is graded T0–T4 (see table). The vast
  majority of interactions are T0–T1. T3–T4 are rationed to a handful of moments
  per session so they stay special.
- **Screen-shake budget.** A global shake accumulator (see §5.4) hard-caps how
  much the viewport can move per second. Two big events at once share the budget
  rather than stacking into nausea.
- **Audio headroom.** The mix reserves the loudest ~6 dB for T3–T4 stingers only
  (see §4.6). Routine SFX are mixed deliberately quiet.
- **The "would a veteran mute this?" test.** If a feedback would annoy a player on
  their 500th repetition, it's too strong. Tune the routine down, the rare up.

| Tier | Name | Frequency | Channels | Example |
|------|------|-----------|----------|---------|
| T0 | Tick | constant | 1 (subtle) | button hover, tab switch |
| T1 | Confirm | very common | 2 | purchase, equip, quest send |
| T2 | Reward | common | 2–3 | quest collect, common/uncommon loot, crit |
| T3 | Celebrate | occasional | 3 | level up, epic loot, boss kill, rank-up |
| T4 | Set-piece | rare | 3 + screen takeover | legendary drop, season rank-up, first clear |

### 1.4 Relationship to sibling modules

- **01 (Art Direction & UI/UX)** owns the *motion grammar* — the canonical easing
  curves, the type scale, transition choreography, the particle art. This doc
  *consumes* that grammar and specifies *when* and *how hard* to apply it. Where
  we cite an easing or a color, it is the 01 token; we do not invent our own.
- **02 (Narrative)** owns tone: boss death lines, the voice/VO register, item
  flavor that our stingers punctuate. Our stingers *carry* their words.
- **08 (Onboarding, Meta & Monetization)** owns the celebration/monetization
  *moments* (reward chests, battle-pass tier-ups, purchase confirmation flows).
  We provide the juice *vocabulary*; 08 decides which moments deserve a set-piece
  and where the "wow" reinforces (never manipulates) a purchase.

---

## 2. The Juice Event Schema (owned here)

Game Feel owns the canonical juice-event contract. Every other module emits these
events; the client subscribes and renders feedback. This decouples *what happened*
(each system's job) from *how it feels* (our job) and means a designer tuning a
loot drop never touches audio code.

### 2.1 Design principles

1. **Server is the source of truth.** Juice events are *derived from* authoritative
   server results, never a substitute for them. The client may render optimistic
   juice immediately (§7.5) but reconciles against the server payload.
2. **Events are declarative, not imperative.** An emitter says `LOOT_DROP` with a
   rarity; it does **not** say "play sound X, shake 4px." The mapping from event →
   feedback lives entirely in this module's client-side registry, so we can retune
   game feel globally without a single gameplay code change.
3. **Payloads are small and typed.** Every event carries only what the feedback
   layer needs to choose intensity and copy. No secrets, no full entity blobs.
4. **One event, one moment.** Events are discrete and celebratory-grained. A
   dungeon floor clear is one `BOSS_KILL`, not fifty `DAMAGE_TICK`s.

### 2.2 Canonical event list

| Event | Tier | Emitted by (module) | When |
|-------|------|---------------------|------|
| `QUEST_SEND` | T1 | Quests | Player dispatches a hero on a timed quest |
| `QUEST_READY` | T2 (ambient) | Quests | A quest timer completes (may fire while away) |
| `QUEST_COLLECT` | T2 | Quests | Player collects a finished quest's rewards |
| `XP_GAIN` | T0–T1 | Combat/Quests | XP awarded (bar fill) |
| `LEVEL_UP` | T3 | Combat/Progression (03) | Hero crosses a level threshold |
| `CRIT` | T2 | Combat (03), Arena, Dungeons | A critical hit resolves |
| `HIT` / `BLOCK` / `DODGE` | T1 | Combat (03) | Per-exchange combat beats (throttled) |
| `LOOT_DROP` | T2–T4 | Dungeons, Quests, Shop, Economy (04) | An item is granted; `rarity` sets tier |
| `PURCHASE` | T1 | Shop, Meta (08) | Buy confirmed (gold or mushrooms) |
| `SELL` | T0 | Shop, Economy (04) | Item sold to vendor |
| `EQUIP` | T1 | Inventory (04) | Item equipped into a slot |
| `CRAFT_SUCCESS` / `CRAFT_FAIL` | T2 / T1 | Crafting (04) | Affix roll / forge resolves |
| `VICTORY` | T3 | Arena (05), Dungeons | Player wins a fight/floor |
| `DEFEAT` | T2 | Arena (05), Dungeons | Player loses a fight/floor |
| `BOSS_KILL` | T3 | Dungeons, Raids (06) | A floor/raid boss dies |
| `RANK_UP` | T3–T4 | Arena/Ladder (05), Seasons (06) | Ladder or season tier increases |
| `GUILD_EVENT` | T1–T3 | Guilds (05) | Join/contribute/goal-met/war result |
| `QUEST_GIVER_NUDGE` | T0 | Live-Ops (06) | Idle nudge: something is collectable |
| `CURRENCY_GAIN` | T0–T1 | Economy (04) | Gold/mushroom/season-currency delta |
| `STREAK` / `DAILY_CLAIM` | T2–T3 | Meta (08) | Daily login / streak milestone |
| `ERROR` / `INVALID` | T0 | Any | Action rejected by server (gentle negative) |

Rarity for `LOOT_DROP` and its tier mapping is canonical here:
`common → T2`, `uncommon → T2`, `rare → T3`, `epic → T3`, `legendary → T4`.
(Rarity *names and drop rules* are owned by Economy/04; we own only the feel map.)

### 2.3 Payload shape

```ts
// Owned by Game Feel. Additive-only changes; never remove a field.
type JuiceEventName =
  | 'QUEST_SEND' | 'QUEST_READY' | 'QUEST_COLLECT'
  | 'XP_GAIN' | 'LEVEL_UP'
  | 'CRIT' | 'HIT' | 'BLOCK' | 'DODGE'
  | 'LOOT_DROP' | 'PURCHASE' | 'SELL' | 'EQUIP'
  | 'CRAFT_SUCCESS' | 'CRAFT_FAIL'
  | 'VICTORY' | 'DEFEAT' | 'BOSS_KILL'
  | 'RANK_UP' | 'GUILD_EVENT'
  | 'QUEST_GIVER_NUDGE' | 'CURRENCY_GAIN'
  | 'STREAK' | 'DAILY_CLAIM'
  | 'ERROR';

interface JuiceEvent<N extends JuiceEventName = JuiceEventName> {
  name: N;
  id: string;              // uuid — for dedupe on reconcile & animation keys
  ts: number;              // client epoch ms at render time
  source: 'server' | 'optimistic'; // reconcile tags optimistic → server
  tier?: 0 | 1 | 2 | 3 | 4;        // optional override; else derived from registry
  // Positioning: where on screen the feedback should originate.
  anchor?: { selector?: string; x?: number; y?: number };
  payload: JuicePayload;
}

// Discriminated payloads (only the fields feedback needs):
type JuicePayload =
  | { kind: 'loot'; rarity: 'common'|'uncommon'|'rare'|'epic'|'legendary';
      itemName: string; slot?: string; icon?: string }
  | { kind: 'levelup'; level: number; unlocks?: string[] }
  | { kind: 'combat'; amount: number; crit?: boolean; target?: 'enemy'|'self';
      dead?: boolean; bossName?: string }
  | { kind: 'currency'; gold?: number; mushrooms?: number; season?: number }
  | { kind: 'rank'; ladder: 'arena'|'season'|'tower'; from: number; to: number;
      tierName: string }
  | { kind: 'guild'; type: 'join'|'contribute'|'goalMet'|'warWin'|'warLoss';
      actor?: string; amount?: number }
  | { kind: 'quest'; questName: string; rewards?: { gold?: number; xp?: number } }
  | { kind: 'purchase'; itemName: string; currency: 'gold'|'mushrooms'; cost: number }
  | { kind: 'generic' };
```

### 2.4 How modules emit & how the client subscribes

**Server → client delivery.** Server actions (Next.js server actions / route
handlers, see 09) return their authoritative result *plus* a `juice: JuiceEvent[]`
array. Because our loop is request-driven (tap → server action → revalidate), the
common path is:

```
Player taps Collect
  → optimistic juice fires instantly on the client (source:'optimistic')
  → server action resolves, returns { result, juice:[{QUEST_COLLECT…}, {LOOT_DROP…}] }
  → client reconciles: matches optimistic events by intent, upgrades to source:'server',
    fires any server-only events (e.g. a surprise legendary) that optimism couldn't predict
```

For **ambient / away events** (a quest finishing while the tab is backgrounded, a
guildmate contributing) we do not hold a socket in M1–M2. Instead the client
**diffs server state on focus/poll** and the sync layer (09) emits the
corresponding juice events on return — e.g. opening the app to three `QUEST_READY`
badges plays a single batched nudge, not three stingers (see §4.6 batching). A
real-time channel (SSE/WebSocket) is an M3+ upgrade for live guild/raid feel; the
schema does not change — only the transport.

**Client event bus.** A tiny typed pub/sub, framed for React 19:

```ts
// juiceBus.ts — singleton, framework-agnostic core
const bus = createJuiceBus();          // emit(event) / subscribe(handler)

// Any module (or the server-action wrapper) emits:
bus.emit({ name:'LOOT_DROP', id, ts:Date.now(), source:'optimistic',
           anchor:{ selector:'#reward-slot' },
           payload:{ kind:'loot', rarity:'epic', itemName:'Cudgel of Mild Regret' }});

// The Juice layer subscribes once, high in the tree:
function JuiceProvider({ children }) {
  useJuiceSubscription((e) => {
    const spec = REGISTRY[e.name](e);   // event → {vfx, sfx, haptic} at a tier
    scheduler.enqueue(spec);            // §5/§7 orchestrator applies budgets
  });
  return <JuiceLayerPortal>{children}</JuiceLayerPortal>;
}
```

The **registry** (`REGISTRY`) is the single place event → feedback mapping lives.
It is data, not logic: retuning game feel = editing one table. Reduced-motion and
sound-off preferences are applied at the *scheduler*, so every consumer inherits
accessibility parity for free.

---

## 3. Feedback catalog (per-action specs)

Every spec below lists **Visual / Audio / Haptic** with concrete numbers. Easing
names (`ease-out-quart`, `ease-spring-soft`, etc.) refer to the **01 motion-grammar
tokens** — coordinate there for exact curves; values here are the intended feel.
All durations in milliseconds. "Pop" = the standard number/badge spring (§5.1).

### 3.1 Quest send (`QUEST_SEND`) — T1

- **Visual:** button depresses 2px on `pointerdown` (`ease-out-quad`, 60ms); on
  confirm, the hero portrait slides off toward the map edge (translateX 24px +
  fade, 220ms `ease-in-cubic`); a small dust puff (6 particles) at the departure
  point; the quest slot flips to a live countdown chip that scales 0.9→1 (pop).
- **Audio:** `ui_confirm_soft` (warm wooden click) + a short `whoosh_depart`
  (120ms, low-passed) layered under. Total ≤ –12 dBFS.
- **Haptic:** single light tap, 10ms.

### 3.2 Quest ready (`QUEST_READY`) — ambient T2

- **Visual:** the quest slot's countdown chip morphs into a pulsing "Collect!" pill
  — gold glow breathes (opacity 0.6↔1, 1400ms loop, `ease-in-out-sine`); a soft
  particle ember rises every ~2s. A numeric badge pops on the bottom-nav Quests
  icon. This is a *persistent invitation*, deliberately low-energy so it doesn't
  nag.
- **Audio:** if the app is focused when it completes, a gentle `quest_ready_chime`
  (rising two-note, –18 dBFS). If it completed while away, **no sound on return** —
  the batched focus nudge (§4.6) handles it to avoid a stinger pile-up.
- **Haptic:** none while away; a 10ms tap only if it completes with app focused.

### 3.3 Quest collect (`QUEST_COLLECT`) — T2 (the signature everyday moment)

This is the handshake the player performs most. It must feel like a small,
reliable payout every single time.

- **Visual (choreographed, ~700ms total):**
  1. 0ms: button squash (scale 1→0.94, 50ms) then release with `ease-spring-soft`.
  2. 60ms: the "Collect!" pill bursts — 10 gold coin particles arc from the slot
     toward the gold counter (staggered 0–180ms, gravity arc, `ease-out-quart`),
     each landing with a 3px pop on the counter.
  3. 120ms: reward numbers rise-and-fade above the slot: `+{gold}` (gold),
     `+{xp}` (blue), each pop-in scale 0.8→1.1→1, translateY –18px over 600ms.
  4. XP bar fills with a leading shimmer (`ease-out-cubic`, 500ms). If it crosses a
     level threshold, it hands off to `LEVEL_UP` (§3.5) — the collect *causes* the
     level-up, and the two chain rather than collide.
- **Audio:** layered coin cascade `coin_payout_sm` (granular, count-scaled: more
  gold → a longer, richer cascade, capped at ~600ms) + a soft `ui_reward_pluck`
  downbeat. Ducks music –3 dB for 250ms.
- **Haptic:** a light "double-tick" pattern `[0,12,40,12]` — a satisfying
  two-beat that reads as "cha-ching."

### 3.4 Crit hit (`CRIT`) — T2

- **Visual:** the damage number pops **larger (1.6×) and hot** (crit-red→white
  gradient, per 01 palette), with a sharp 8px overshoot before settling; a quick
  radial slash streak (single sprite, 120ms) behind it; a **micro screen-shake**
  (2px, 90ms, decays — draws from budget §5.4). Enemy sprite flashes white for 60ms.
- **Audio:** `hit_crit` — a meatier version of `hit_normal` with an added high
  transient + short tail. Pitch varies ±2 semitones per hit to avoid machine-gun
  sameness.
- **Haptic:** medium tap, 18ms.

### 3.5 Level up (`LEVEL_UP`) — T3

- **Visual (~1100ms set-piece, but non-blocking):**
  1. A radial burst of light behind the hero portrait (canvas glow, scale 0→1.4,
     opacity 1→0, 500ms `ease-out-quint`).
  2. 24–32 particles (motes, class-tinted) erupt and drift upward with slight
     turbulence, fading over 900ms.
  3. A **"LEVEL {n}"** banner drops from above the portrait, overshoots (spring),
     holds 700ms, lifts away. Number counts 1 tick with a mechanical roll.
  4. Any unlocks (`payload.unlocks`) list in, one line per 90ms stagger, each with
     a tick — coordinated with 08's progression reveals.
- **Audio:** `level_up_fanfare` — a short, bright 3-note rising motif (≤1.2s) that
  sits *above* the music in a reserved register; a sub "whoomp" on the burst frame.
  Ducks music –6 dB, 400ms recovery.
- **Haptic:** ascending pattern `[0,15,60,15,60,25]` (builds to a firmer final beat).

### 3.6 Loot drop by rarity (`LOOT_DROP`) — T2→T4

Rarity is the primary intensity dial. Each step adds a channel and a flourish; the
*color and audio motif* stay in the same family so the ladder reads as one system
escalating, not five unrelated effects. Colors are 01 rarity tokens.

| Rarity | Tier | Visual | Audio | Haptic |
|--------|------|--------|-------|--------|
| Common | T2 | icon pops in slot (scale 0.8→1, 200ms), thin gray outline sweep | `loot_common` — soft single pluck | 8ms light |
| Uncommon | T2 | as common + green outline, 6 sparkle particles | `loot_uncommon` — pluck + shimmer tail | 8ms light |
| Rare | T3 | blue burst, 14 particles, icon does a slow 1 flip, gentle 1.5px shake | `loot_rare` — pluck + rising chime pair | `[0,12,40,12]` |
| Epic | T3 | purple radial beam + 20 particles, item card slides in and holds, faint bloom pulse | `loot_epic` — chord swell + shimmer, small stinger | `[0,15,50,20]` |
| Legendary | T4 | **screen set-piece** — see §8.1 | `loot_legendary` — full stinger + optional VO barb (02) | `[0,20,60,20,60,35]` |

**Restraint note:** common/uncommon are the 95% case and are deliberately *quiet
and fast* (≤300ms, one particle burst) so rare+ has contrast to spend. If loot
feels "too calm" in playtest, the fix is dropping *fewer* commons, not juicing them
(coordinate with Economy/04).

### 3.7 Purchase (`PURCHASE`) — T1

- **Visual:** buy button fills with a gold sweep left→right (240ms), the item icon
  hops from shelf to inventory (arc, 300ms), gold counter *ticks down* with a
  rolling number (never a hard cut — the spend should feel deliberate). If bought
  with **mushrooms** (premium), the sweep is the mushroom-purple token and the hop
  gets one extra sparkle — celebratory but honest, never a slot-machine tease
  (guardrails owned by 08).
- **Audio:** `ui_purchase` — a satisfying "ka-chunk" register clack + coin settle.
  Mushroom purchases add a soft chime layer.
- **Haptic:** medium tap, 15ms.

### 3.8 Equip (`EQUIP`) — T1

- **Visual:** item snaps into its slot with a spring (scale 1.15→1, 180ms); the
  affected stat lines on the character sheet **flash and tick** to their new value
  (green if up, red if down, per 01), a subtle equip "shine" sweeps across the
  paper-doll. Slot glows its rarity color for 400ms then settles.
- **Audio:** `equip_{light|medium|heavy}` — material-aware (cloth swish / leather
  creak / metal clank) chosen from `payload.slot`. Small, tactile.
- **Haptic:** light tap, 12ms.

### 3.9 Defeat (`DEFEAT`) — T2 (failure with character)

Failure has *character*, never punishment. Per pillar #2, the world is in on the
joke — a loss is a comedic beat, not a shaming.

- **Visual:** brief desaturation + slight zoom-out of the combat frame (150ms), the
  hero does a comedic slump/pratfall animation (01 asset), a dust cloud. A wry
  defeat card slides up with a 02 flavor line ("You have been *thoroughly*
  inconvenienced."). No red-flash aggression; muted, warm-gray palette.
- **Audio:** `defeat_sting` — a descending "wah-wah" trombone-adjacent motif, played
  with comic timing (a beat of silence, then the sting). Kept short and gentle.
- **Haptic:** a single soft, longer buzz (30ms) — a "thud," not a jolt.

### 3.10 Victory (`VICTORY`) — T3

- **Visual:** hero does a flourish/pose, confetti or class-appropriate particles
  (18–24), a "VICTORY" banner with spring overshoot, reward summary counts up.
  Combat frame brightens +8%.
- **Audio:** `victory_fanfare` (short, ≤1.4s, brighter cousin of level-up motif),
  music resumes on a triumphant bar.
- **Haptic:** `[0,15,50,15,50,25]`.

### 3.11 Boss kill (`BOSS_KILL`) — T3 (→ set-piece at raid scale, §8.2)

- **Visual:** hit-stop — the frame *freezes ~80ms* on the killing blow (huge
  perceived weight), then the boss sprite flashes white, cracks, and dissolves into
  particles (30–40, falling + rising mix, 900ms); a **shockwave ring** expands from
  center; screen-shake spends a T3 chunk of budget (5px, 160ms decay). Boss name
  plate shatters. Loot drop chains in after 400ms so the kill and the reward don't
  overlap-mud.
- **Audio:** `boss_death` — impact "BOOM" sub + debris + a resolving musical
  cadence; if 02 supplies a boss death VO line, it plays in the 400ms gap before
  loot. Music cuts to a held chord then resolves.
- **Haptic:** the firmest routine pattern `[0,25,70,25,70,40]`.

### 3.12 Rank up (`RANK_UP`) — T3, season tier = T4 set-piece (§8.3)

- **Visual (arena/tower T3):** the ladder tier badge does a "level-up" style
  upgrade — old badge cracks/peels, new badge stamps down with a spring and a
  metallic shine sweep; rank number rolls; a laurel/particle flourish in the tier
  color. Position-on-ladder marker slides up.
- **Audio:** `rank_up` — a proud, brassy 2-second cue; distinct from level-up so
  the player learns "this is *competitive* progress."
- **Haptic:** `[0,18,55,18,55,30]`.

### 3.13 Guild event (`GUILD_EVENT`) — T1–T3

- **Join (T2):** doors-open flourish on the guild crest, warm chord, roster row
  slides in. Haptic `[0,12,40,12]`.
- **Contribute (T1):** the guild goal bar fills with a shimmer; a small "+{amount}"
  pop; soft `ui_contribute` tick. Haptic 10ms.
- **Goal met / war win (T3):** crest bursts with guild-color particles, a banner
  ("The {GuildName} prevails!"), celebratory cue; shared across all online members
  when the realtime channel exists (M3+). Haptic `[0,15,50,15,50,25]`.
- **War loss (T2):** dignified, muted — a somber horn, crest dims briefly, a 02
  flavor line. We lose with grace.

### 3.14 Idle nudge (`QUEST_GIVER_NUDGE`) & currency (`CURRENCY_GAIN`)

- **Nudge (T0):** the bottom-nav icon for a ready feature gets a gentle breathing
  glow + numeric badge; *no sound, no haptic* unless the app just gained focus and
  a batched summary plays (§4.6). This is the idle layer's polite tap on the
  shoulder — never a notification-spam feeling.
- **Currency gain (T0–T1):** counter rolls to the new value with a leading tick;
  small denominations silent, large gains (>X% of balance) add a coin shimmer.

---

## 4. Audio direction

### 4.1 Sonic identity

*Quest & Cudgel* sounds like a lavish, slightly tongue-in-cheek fantasy tavern
band that takes the music seriously and the sound effects *just* less so. Warm
acoustic instruments (lute, hand percussion, hurdy-gurdy, a cheeky bassoon for
comedy beats) over a clean, modern low end. The mix is **cozy, wooden, and
tactile** — think physical objects (coins, leather, wood, forged metal) rather
than synthetic UI blips. Comedy is delivered through *timing and instrument choice*
(the defeat trombone, the bassoon pratfall), never through zany overload. This
sonic register is set jointly with 02 (voice/tone) — we own the SFX/music
*production*, 02 owns *what characters say*.

### 4.2 Adaptive music

Music is **layered stems**, not fixed loops, so screens and states blend without
hard cuts.

- **Per-screen / biome themes.** Each major screen and each dungeon biome has a
  theme built from a shared harmonic bed so cross-screen transitions crossfade in
  key:
  - *Town/Home* — relaxed tavern lute, welcoming.
  - *Quest board* — anticipatory, plucky, forward motion.
  - *Arena* — tense, rhythmic, competitive percussion.
  - *Dungeon biomes* (crypt / forest / forge, etc.) — mood per biome, owned in feel
    with 01/02 art & narrative.
  - *Guild hall* — communal, warm, a touch grand.
  - *Shop* — light, mercantile, a hint of huckster charm.
- **Vertical layering.** Each theme is 2–4 stems (bed / harmony / melody / tension)
  that fade in with context: e.g. the dungeon adds a "tension" stem as boss HP
  drops below 30%, and a "triumph" stem on the win bar. Combat intensity, floor
  depth, and boss phases drive stem gain — all from server state / juice events.
- **Transitions.** Screen changes crossfade over 400–600ms; we never hard-cut
  music. A `BOSS_KILL` or `RANK_UP` can trigger a **musical stinger that resolves
  into** the next screen's theme (transition choreography coordinated with 01).
- **Idle/away.** After ~90s of inactivity music thins to just the bed stem
  (battery + politeness); full mix returns on interaction.

### 4.3 SFX library taxonomy & naming

Flat, greppable, category-prefixed. Lowercase, snake_case, category-first:

```
category_descriptor_variant

ui_*        ui_tap, ui_confirm_soft, ui_back, ui_error, ui_toggle, ui_tab
loot_*      loot_common, loot_uncommon, loot_rare, loot_epic, loot_legendary
coin_*      coin_payout_sm, coin_payout_lg, coin_settle, coin_spend
combat_*    combat_hit_normal, combat_hit_crit, combat_block, combat_dodge, combat_boss_death
equip_*     equip_light, equip_medium, equip_heavy
music_*     music_town_bed, music_town_melody, music_arena_tension, music_dungeon_crypt_bed
stinger_*   stinger_levelup, stinger_victory, stinger_defeat, stinger_rankup, stinger_legendary
voice_*     voice_boss_{id}_death, voice_narrator_* (assets owned/scripted by 02)
guild_*     guild_join, guild_contribute, guild_goal, guild_war_win, guild_war_loss
```

Every SFX ships **3–5 pitch/round-robin variants** where it repeats often
(hits, coins, ui_tap) to defeat ear fatigue. Variant selection is round-robin +
slight random pitch (±1–2 semitones), handled by the audio engine, not authored.

### 4.4 UI sound set

The connective tissue. Deliberately *quiet and short* (≤120ms, mixed –18 to
–24 dBFS) so they never compete with reward audio:

- `ui_tap` — generic actionable tap (very subtle, T0).
- `ui_confirm_soft` — commit an action (T1).
- `ui_back` / `ui_cancel` — reverse/close (softer, descending).
- `ui_tab` — switch bottom-nav tab (a soft wooden knock).
- `ui_toggle` — settings on/off (two-state clack).
- `ui_error` — gentle, non-alarming "nope" (a soft muted thunk, never a harsh
  buzzer — failure has character, §3.9).
- `ui_scroll_tick` — optional, for spinner/carousel detents.

### 4.5 Stingers

Short, mixed *above* the music in a reserved register (§4.6), reserved for T3–T4:
`stinger_levelup`, `stinger_victory`, `stinger_defeat`, `stinger_rankup`,
`stinger_legendary`, `stinger_boss_death`. Each ≤ ~1.5s (legendary/season up to
~2.5s). Composed in the same key-family as the music beds so they resolve rather
than clash.

### 4.6 Mix, ducking, batching & headroom

- **Bus structure:** `master → [music, sfx, ui, stinger, voice]`. Each with
  independent gain (see volume UX §4.7).
- **Sidechain ducking:** stingers and reward SFX duck the music bus –3 to –6 dB
  with a fast attack (~30ms) and gentle release (250–400ms) so celebrations pop
  without silencing the score.
- **Reserved headroom:** routine SFX peak ≈ –12 dBFS; stingers may reach ≈ –4 dBFS.
  That ~8 dB gap *is* the celebration budget — never spend it on routine sounds.
- **Voice priority:** `voice_*` ducks both music and SFX so boss death lines (02)
  are always intelligible.
- **Batching (critical for idle/away):** when the app regains focus after time
  away, the sync layer may surface many events at once (3 quests ready, 5 guild
  contributions). The audio scheduler **coalesces**: it plays *one* summary cue
  ("welcome back, N things await") rather than N stingers, and visual badges carry
  the rest. Simultaneous same-frame events are de-duped and the highest-tier one
  wins the audio slot. This prevents the single worst failure mode of an async
  game: the stinger avalanche.

### 4.7 Mute, volume & settings UX

- **Master, Music, SFX** sliders (0–100), plus a one-tap **Mute all**. Settings
  persist to `localStorage` and (M2+) to the account so they follow the player.
- A **speaker toggle** is reachable from the top bar in one tap — muting is never
  buried.
- **Respect the system.** Honor `(prefers-reduced-motion)` for motion parity and a
  first-run default that keeps sound **off until first explicit interaction**
  (autoplay policy, §4.8) — the first tap that unlocks audio also shows a tiny
  "sound on 🔊 / tap to mute" affordance so it's discoverable and consensual.

### 4.8 Mobile & browser autoplay handling

Browsers block audio until a user gesture. We embrace it:

- The `AudioContext` is created **suspended** and `resume()`d on the **first user
  gesture** (any tap/click), wrapped in a one-time unlock handler.
- Until unlocked, all sound calls are no-ops (queued? no — dropped; pre-unlock
  events are visual/haptic only, which is correct since nothing has happened yet
  that the player didn't just initiate).
- We show no intrusive "click to enable audio" wall; the first natural tap unlocks
  it, and the mute affordance (§4.7) confirms state.
- On iOS, we also handle the `AudioContext` interruption/`statechange` (calls,
  route changes) by resuming on next gesture.
- **Never autoplay music on load.** Music fades in *after* unlock, on the first
  screen the player lands on post-interaction.

---

## 5. VFX & motion

All motion consumes **01's motion-grammar tokens** (easing curves, durations
scale, particle art atlas). This section specifies *application and budget*, and
flags every place we must coordinate with 01.

### 5.1 The number/badge pop (the workhorse)

One reusable spring drives 90% of our motion: `scale 0.8 → 1.1 → 1.0` over 260ms
with `ease-spring-soft`, optional translateY for rising numbers. Damage numbers,
`+gold`, badges, banners, stat ticks all use it, parameterized by
magnitude/tier. Consistency here *is* cohesion.

### 5.2 Floating number pop-ups

- Rise 16–24px while fading (600ms, `ease-out-quart`), slight horizontal jitter so
  stacked numbers don't overlap into a smear.
- Crits: 1.6× scale, hot color, overshoot (§3.4). Heals/positive: green. Costs:
  the number *sinks* instead of rising (spending feels different from gaining).
- Pooled and canvas/transform-rendered (§7) — never React-reconciled per frame.

### 5.3 Particle language

- **One atlas, tinted.** A small shared sprite set (mote, spark, coin, shard, ring,
  ember) recolored per context (rarity/class/guild color). Consistency over
  variety. Atlas owned jointly with 01.
- **Counts are budgeted** (see table §10): common loot 0–6, epic 20, boss kill
  30–40, legendary set-piece up to ~80 (its own frame, §8.1). Hard cap **120
  live particles** on screen at once; the emitter drops the oldest past cap.
- **Physics is cheap:** simple gravity + drag + initial velocity, integrated on a
  single canvas rAF loop. No per-particle DOM nodes.

### 5.4 Screen-shake budget

Shake is the most abused juice tool; we govern it hard.

- A global **shake energy accumulator**: each event *requests* an amplitude
  (2–6px) and duration; the manager adds it but **caps total displacement at 6px**
  and total "shake time" so overlapping events (crit during a boss kill) share
  rather than stack into motion sickness.
- Shake is applied to a single wrapper transform (GPU), never layout.
- Shake **scales to 0 under reduced-motion** and has a user "screen effects"
  intensity setting (Full / Reduced / Off) independent of the OS flag.
- Tier budget: T2 ≤2px, T3 ≤5px, T4 ≤6px (+ hit-stop instead of more shake).

### 5.5 Rarity flourishes

A single escalating visual grammar (color + particle count + added frame), never
five bespoke effects — see the §3.6 table. The *shape language* (outline sweep →
burst → beam → screen-frame) is the escalation, so players read rarity at a glance
even color-blind (shape + label + rarity icon carry it, §6).

### 5.6 Transitions & hit-stop

- **Screen/route transitions:** shared-element where possible (the tapped card
  expands into the next screen), 300–450ms, `ease-in-out-cubic`. Choreography and
  the transition *catalog* are owned by 01; we own the *audio-visual sync* (the
  stinger that lands on the transition's peak).
- **Hit-stop:** the highest-value cheap trick we own — freezing animation 60–90ms
  on impactful frames (crit, boss kill) multiplies perceived weight at zero asset
  cost. Used sparingly (T2+ combat, T3+ kills).

---

## 6. Haptics & accessibility

### 6.1 Vibration API patterns

Haptics are the third channel on mobile, delivered via `navigator.vibrate()`.
Support is uneven (iOS Safari does **not** support the Vibration API; many Android
browsers do), so **haptics are always additive, never required** — every haptic
has a visual+audio equivalent.

Canonical patterns (`ms` on/off arrays):

| Pattern | Array | Used for |
|---------|-------|----------|
| Light tap | `[10]` | ui confirm, equip, contribute |
| Double tick ("cha-ching") | `[0,12,40,12]` | quest collect, rare loot, guild join |
| Medium | `[18]` | crit, purchase |
| Rising build | `[0,15,60,15,60,25]` | level up, victory |
| Firm triple | `[0,25,70,25,70,40]` | boss kill |
| Soft thud | `[30]` | defeat |
| Legendary | `[0,20,60,20,60,35]` | legendary drop, season rank-up |

Rules: **debounce** (min 120ms between vibrations, coalesce bursts), respect a
dedicated **Haptics on/off** setting *and* fold into the reduced-motion pref by
default (some users find vibration a motion-adjacent discomfort), and never
vibrate for ambient/away events. Feature-detect (`'vibrate' in navigator`) and
degrade silently.

### 6.2 Accessibility parity (non-negotiable)

- **Reduced-motion parity.** Honoring `(prefers-reduced-motion: reduce)` **plus**
  an in-game "Motion: Full / Reduced / Off" toggle: particles→minimal, shake→0,
  slides→cross-fades, springs→quick fades. **The *reward still lands*** — a
  reduced-motion level-up still shows the banner and plays audio; it just doesn't
  fly. We do not punish these players with a dead UI.
- **Sound-off parity.** Every audio cue has a visual equivalent. A crit is legible
  with sound off (size + color + shake). Defeat/victory read from the card and
  animation, not the trombone. Muted players lose *flavor*, never *information*.
- **No essential info in a single channel.** Rarity is color **+ shape + icon +
  text label** (color-blind safe). "Quest ready" is a badge + copy, not just a
  chime. Combat outcome is a card, not just a sting. This is a review gate.
- **Vestibular safety.** Global shake cap (§5.4), hit-stop kept ≤90ms, no
  full-screen zoom/rotation on repeatable actions, parallax opt-out.
- **Photosensitivity.** No flashing >3Hz; the white hit-flash is a single 60ms
  frame, never strobing; legendary/level bursts ramp, not strobe.
- **Timing independence.** No feedback requires reaction; celebrations are
  non-blocking and dismissible; nothing gates progress behind an animation.
- **Respect `prefers-contrast` / dark-mode** for pop-up legibility (with 01).

---

## 7. Web implementation plan

### 7.1 Libraries & architecture

- **Audio:** Web Audio API via a thin wrapper (**Howler.js**-style, or Howler
  itself) for cross-browser sprite playback, gain buses, and unlock handling.
  Custom mix graph on top for ducking/sidechain. ~10–12 KB gz.
- **VFX/particles:** **custom lightweight canvas engine** (single `<canvas>`
  overlay, rAF loop, pooled particles) — a full engine (PixiJS) is overkill and
  too heavy for our budget; we render numbers/particles/shake here. DOM/CSS
  transforms for banners, badges, and slot animations (cheap, accessible,
  animatable via the Web Animations API).
- **Event bus:** ~1 KB in-house typed pub/sub (§2.4); no dependency.
- **Orchestration:** a `JuiceScheduler` that receives specs from the registry,
  applies budgets (shake, particle cap, audio batching), respects a11y prefs, and
  dispatches to the canvas engine / audio engine / vibration. Single entry point =
  single place to tune and to test.
- **React 19:** juice lives *outside* the reconciler where possible — a portal
  overlay + imperative canvas so 60fps animation never triggers React renders.
  Components emit events; they don't animate frame-by-frame.

### 7.2 Asset formats & budget

- **Audio format:** ship **`.webm`/Opus** (primary) with **`.m4a`/AAC** fallback
  (iOS). Opus at ~64–96 kbps is transparent for our material and tiny.
- **Audio sprites:** SFX packed into a few **audio sprite sheets** (one file +
  JSON offset map) to minimize requests and decode overhead:
  `ui.webm` (all UI), `loot_coins.webm`, `combat.webm`, `stingers.webm`. Music
  stems stream separately.
- **Particle art:** one small texture atlas (~32–64 KB PNG/WebP), tinted at
  runtime — no per-color assets.
- **Budgets (hard):**
  - Core UI+loot+combat audio sprites (needed for M1 loop): **≤ 400 KB** total,
    gz/compressed, lazy-loaded after first paint.
  - Music stems: streamed, **≤ 300 KB per screen theme**, fetched on screen enter,
    cached.
  - Particle atlas + engine JS: **≤ 80 KB**.
  - Total *blocking* juice payload on first load: **~0 KB** — nothing juice-related
    is in the critical path; audio + canvas init lazily post-interaction.

### 7.3 Lazy-loading & caching

- **Nothing juice-related blocks first paint.** The canvas engine and audio unlock
  initialize on first interaction (which is also the autoplay unlock, §4.8).
- **Route-scoped audio:** each screen preloads only its theme + the SFX it can
  trigger; a service worker (PWA, M4) caches sprites so repeat sessions are
  instant and offline-friendly.
- **Priority hints:** core UI sprite prefetched at idle after the loop is
  interactive; rare stingers (legendary) fetched on first *near-miss* signal or
  lazily on demand (a 300ms delay on a once-a-week event is invisible).

### 7.4 60fps guardrails

- Animate **only `transform` and `opacity`** (compositor-only); never animate
  layout properties.
- All particles/numbers on **one canvas, one rAF loop**, pooled objects, no GC
  churn; cap 120 live particles (§5.3).
- `will-change` used surgically and removed after; no long-lived heavy layers.
- Audio decode off the main thread; pre-decode sprite buffers at load.
- **Auto-degrade:** a lightweight FPS monitor; if frame time exceeds budget for N
  frames (weak device), the scheduler drops particle counts and disables shake
  before it drops the *reward legibility*. Feel scales down gracefully; it never
  jank-stutters.
- Cap concurrent audio voices (~16); steal oldest/lowest-tier voice when exceeded.

### 7.5 Optimistic UI + server reconcile (instant feel)

The core trick that makes an async, request-driven game feel instant:

1. **On tap, fire optimistic juice immediately** (`source:'optimistic'`) from a
   predicted result the client can safely assume (button press, whoosh, the
   *start* of a collect animation). Perceived latency ≈ 0.
2. **Server action resolves** and returns authoritative result + `juice[]`.
3. **Reconcile:** match optimistic events by intent/id; **upgrade** them to
   `source:'server'` (usually seamless — the animation was already playing), and
   fire **server-only surprises** optimism couldn't know (the crit, the legendary,
   the exact gold). The floating `+gold` number fills in from server truth as the
   coins land.
4. **On rejection/error** (`ERROR`): gently reverse — no jarring snap-back; the
   optimistic motion eases out and a soft `ui_error` + shake-free wobble plays.
   Because we never *committed* state client-side (server is authority, 09), this
   is purely cosmetic cleanup.

This means the *feel* is instant while correctness stays server-authoritative —
satisfying pillar #1 and the Master Plan's "instant perceived response" bar
without ever lying to the player about outcomes.

---

## 8. Signature "wow" moments

A handful of designed set-pieces carry the "AAA soul." They are **rare by
construction** (rationed by drop rates and progression pacing, coordinated with
04/06/08) so they never lose their charge. Each is a *takeover* — it briefly earns
the whole screen — but stays **skippable/non-blocking** (tap to dismiss, auto-clears
in ~2.5s) and fully a11y-parity'd.

### 8.1 Legendary drop (`LOOT_DROP`, legendary) — T4

The rarest routine moment; most players see a few per week. Sequence (~2.2s,
skippable):

1. **Anticipation:** the world dims (backdrop → 40% brightness, 300ms), music ducks
   to a held chord, a low sub-rumble builds. A beam of light forms where the item
   will appear.
2. **Reveal:** the item card *slams* in with a hit-stop (90ms freeze) and a white
   flash frame; ~60–80 gold particles erupt in a slow, luxurious fountain; the
   rarity ring (legendary-gold) expands and rotates.
3. **Payoff:** the full item name + 02 flavor barb types/reveals; `stinger_legendary`
   resolves; an optional 02 narrator/VO one-liner ("Well. *That's* going to make
   people talk."). Firm legendary haptic.
4. **Release:** backdrop lifts, the card docks into inventory with a trailing shimmer.

Restraint guidance: this is the ceiling. Nothing routine may approach it. If epic
drops start feeling like this, we've overspent — pull epic back down. 08 may reuse
this frame for a battle-pass *grand* reward, but never for an ordinary purchase.

### 8.2 Boss kill (raid scale) (`BOSS_KILL`, raid) — T4

Escalation of §3.11 for named/raid bosses (06): a longer hit-stop, the boss
dissolves in phases, the camera-frame pushes in, a shockwave + the firmest
allowed shake, `voice_boss_{id}_death` (02) delivered in a clean silence beat, then
the loot fountain. For guild raids (M3+), the moment broadcasts to online members
via the realtime channel so the kill is *shared* — the strongest expression of
pillar #4 ("asynchronous, never lonely").

### 8.3 Season rank-up (`RANK_UP`, season) — T4

The competitive apex (06/05). When a player crosses a **season tier** (Bronze→Silver
… →Legend): a full badge-forging set-piece — the new tier badge is *struck* like a
coin (metallic slam + shine sweep + sparks), the ladder background shifts to the new
tier's color world, a proud brass `stinger_rankup` (extended), laurels, and a
"You are now {Tier}" proclamation. Tie-in with 08 for any season-reward reveal that
chains off it. Legend tier gets a bespoke, once-a-season flourish.

### 8.4 First-time moments

First dungeon clear, first legendary, first guild joined, first level 10 — each
first gets a slightly amplified version + a 02 flavor beat (coordinated with 08's
FTUE). Firsts are singular by nature, so we can afford to make them sing.

---

## 9. Milestone phasing, risks & KPIs

### 9.1 Phasing (M1 → M5)

| Milestone | Game Feel / Audio deliverables |
|-----------|-------------------------------|
| **M1 – Foundation** | Ship the **Juice Event schema + client event bus + scheduler**. Wire optimistic-UI reconcile into existing server actions. Core SFX sprite (ui/loot/coins/combat), audio unlock + mute/volume UX, `(prefers-reduced-motion)` parity, base number-pop + particle engine. Juice on the everyday loop: quest send/ready/collect, purchase, equip, hit/crit, victory/defeat, loot common–rare. **No music yet** beyond one town bed (proves the pipeline). |
| **M2 – Depth** | Adaptive **music stems** for core screens + biomes; level-up & rank-up (arena) set-pieces; epic loot; crafting success/fail feel; guild join/contribute; FTUE-tuned first-time moments (with 08); settings persisted to account; haptics full pattern set. |
| **M3 – Endgame** | **Legendary + boss-kill + season rank-up set-pieces**; raid/tower audio layering & boss-phase stems; realtime (SSE/WS) so guild/raid juice is *shared*; season theme worlds; batched away-event summary polish. |
| **M4 – Launch** | PWA service-worker audio caching & offline; mobile haptics QA matrix; per-device auto-degrade tuning; full mix master & loudness pass; analytics events for opt-out/feature-touch KPIs; localization-safe stinger timing. |
| **M5 – Live** | Seasonal audio/VFX refreshes (new biome themes, event stingers, holiday set-pieces) on the LiveOps cadence (06); ongoing A/B of feedback intensity vs. retention/opt-out; community-requested accessibility options. |

### 9.2 Dependencies

- **01** — motion-grammar tokens, particle atlas, transition catalog, palette
  (rarity/class/guild colors). Blocking for final VFX polish; we can prototype with
  placeholders in M1.
- **02** — boss death lines/VO scripts, defeat/flavor copy, narrator register.
  Needed for M2 set-piece text and M3 VO.
- **08** — which moments become celebrations, monetization-moment guardrails,
  FTUE reveal pacing. Needed for M2 first-time moments and M3 legendary/battle-pass
  reuse.
- **09** — server actions returning `juice[]`, the sync/focus-diff layer, and the
  M3 realtime channel. Blocking for server→client event delivery.
- **03/04/05/06** — each must *emit* the canonical events from their authoritative
  code paths. We publish the schema + a lint/typecheck so emissions stay valid.

### 9.3 Risks & mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Autoplay policy** blocks audio | Players think the game is mute | Suspended context + first-gesture unlock; visible mute affordance; never gate content on audio (§4.8) |
| **Stinger avalanche** on focus/away | Overwhelming, spammy | Audio batching + de-dupe + highest-tier-wins (§4.6); ambient events are visual-only |
| **Perf / jank** on low-end mobile | Breaks the "expensive" feel worse than no juice | Single canvas + rAF, pooled particles, transform-only, FPS auto-degrade (§7.4); hard particle/voice caps |
| **Over-juicing** trains tune-out | Legendary loses its punch | Tier system + budgets + "would a veteran mute this?" gate (§1.3); rare gets the headroom |
| **iOS haptics unsupported** | Uneven feel across devices | Haptics always additive; feature-detect; degrade silently (§6.1) |
| **Accessibility gaps** (audio/motion-only info) | Excludes players, review-blocker | Parity review gate; no single-channel essential info (§6.2) |
| **Asset bloat** hurts load KPI | Slower first load | Sprites, Opus, lazy-load, nothing in critical path (§7.2–7.3) |
| **Reconcile mismatch** (optimistic ≠ server) | Ugly snap-backs | Only predict safe outcomes; cosmetic-only cleanup; server is authority (§7.5) |

### 9.4 KPIs — measuring an unmeasurable thing

"Session feel" resists direct measurement, so we track **behavioral proxies** and
**opt-out signals**:

- **Feature-touch retention.** D1/D7 retention *conditioned on having triggered a
  juiced moment* (first collect, first level-up set-piece) vs. cohort that didn't —
  isolates whether the feel earns return visits.
- **Opt-out rate (the canary).** % of players who mute sound, drop to
  Reduced/Off motion, or disable haptics. A *rising* opt-out rate is our clearest
  "too much / annoying" signal; we target keeping it low and watch it per-feature.
- **Interaction repeat depth.** Do players tap "Collect"/"Quest" *more per session*
  after juice ships? Voluntary re-engagement with a juiced action is a feel proxy.
- **Time-to-first-mute / re-enable.** How long before muting, and do players turn
  sound back on? Re-enabling is a strong positive signal.
- **Set-piece skip rate.** % who skip legendary/boss set-pieces — low = they enjoy
  them, spiking = they've become a chore (retune length/frequency).
- **Perf floor.** p95 frame time and % of sessions hitting auto-degrade — feel KPIs
  are meaningless if the frame rate is bad, so this is a gating metric.
- **Qualitative:** in-playtest "does this feel expensive?" surveys, and monitoring
  app-store/community sentiment for "juicy / satisfying / cheap / annoying" language.

**Targets (initial):** sound opt-out < 15%, motion-off < 10%, set-piece skip < 25%,
p95 frame time < 16.6ms on the reference mid-tier Android, and a measurable
feature-touch retention lift over the pre-juice baseline (the honest bar: if juice
doesn't move return-visit behavior, it's decoration — we iterate until it does).

---

## 10. Appendix: quick-reference tables

### 10.1 Action → tier → channels → budget

| Action / Event | Tier | Vis | Aud | Hap | Particles | Shake | Duration |
|----------------|------|-----|-----|-----|-----------|-------|----------|
| ui tap / hover | T0 | ✓ | ○ | – | 0 | 0 | ≤120ms |
| Quest send | T1 | ✓ | ✓ | ✓ | 6 | 0 | ~250ms |
| Quest ready (ambient) | T2 | ✓ | ○ | ○ | rising | 0 | loop |
| Quest collect | T2 | ✓ | ✓ | ✓ | 10 | 0 | ~700ms |
| Crit | T2 | ✓ | ✓ | ✓ | 0–4 | 2px | ~120ms |
| Purchase | T1 | ✓ | ✓ | ✓ | 1 | 0 | ~300ms |
| Equip | T1 | ✓ | ✓ | ✓ | 0 | 0 | ~180ms |
| Loot common/uncommon | T2 | ✓ | ✓ | ✓ | 0–6 | 0 | ≤300ms |
| Loot rare | T3 | ✓ | ✓ | ✓ | 14 | 1.5px | ~500ms |
| Loot epic | T3 | ✓ | ✓ | ✓ | 20 | 2px | ~700ms |
| Loot legendary | T4 | ✓ | ✓ | ✓ | ~80 | 6px | ~2.2s |
| Level up | T3 | ✓ | ✓ | ✓ | 24–32 | 0 | ~1100ms |
| Victory | T3 | ✓ | ✓ | ✓ | 18–24 | 0 | ~1200ms |
| Defeat | T2 | ✓ | ✓ | ✓ | dust | 0 | ~900ms |
| Boss kill (floor) | T3 | ✓ | ✓ | ✓ | 30–40 | 5px | ~1300ms |
| Boss kill (raid) | T4 | ✓ | ✓ | ✓ | 40+ | 6px | ~2s |
| Rank up (arena/tower) | T3 | ✓ | ✓ | ✓ | flourish | 0 | ~1200ms |
| Rank up (season) | T4 | ✓ | ✓ | ✓ | flourish+ | 6px | ~2.5s |
| Guild contribute | T1 | ✓ | ✓ | ✓ | shimmer | 0 | ~300ms |
| Guild goal / war win | T3 | ✓ | ✓ | ✓ | 20+ | 0 | ~1200ms |

(✓ = required, ○ = conditional/subtle, – = none)

### 10.2 Audio bus & headroom

| Bus | Typical peak | Ducks | Notes |
|-----|-------------|-------|-------|
| music | –14 dBFS | ducked by stinger/voice/reward | layered stems |
| sfx | –12 dBFS | – | round-robin + pitch variance |
| ui | –18 to –24 dBFS | – | short, quiet, T0–T1 |
| stinger | up to –4 dBFS | ducks music –6 dB | reserved celebration headroom |
| voice | –6 dBFS | ducks music+sfx | boss lines always intelligible (02) |

### 10.3 Ownership boundaries (who owns what)

| Concern | Owner |
|---------|-------|
| Juice event schema, event bus, scheduler, registry | **07 (this doc)** |
| Feedback intensity/budget tuning, mix, SFX/music production | **07** |
| Easing tokens, particle atlas, transition catalog, palette | 01 |
| Boss/defeat/flavor copy, VO scripts, tone register | 02 |
| Which moments celebrate; monetization-moment guardrails; FTUE pacing | 08 |
| Server actions returning `juice[]`, sync/realtime transport | 09 |
| Emitting canonical events from authoritative code | 03 / 04 / 05 / 06 |

---

*End of module 07. This doc owns the juice-event contract; sibling modules emit
into it and inherit accessibility parity through the shared scheduler.*
