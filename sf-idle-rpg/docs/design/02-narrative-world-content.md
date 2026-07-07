# 02 — Narrative, World & Content

> **Status:** ✅ Complete
> **Owner:** Senior Narrative Designer · **Milestone focus:** M1–M5 · **Version:** 1.0
> **Depends on:** 01 (Art Direction & UI/UX), 03 (Combat & Character Progression), 06 (Endgame, Live-Ops & Events) · **Last updated:** 2026-07-07

**Module summary.** This document is the voice of the game. It defines the world of *Quest & Cudgel* — its setting, history, factions, and the exact reason it is funny — and turns that world into a scalable, data-driven **content engine** that lets writers ship names, quests, boss lines, and flavor text without touching code. It owns Pillar 2, *"The world is in on the joke,"* and enforces the one-tone rule from item tooltip to raid finale. Everything here is built **on** the shipped slice (three classes, timed quests, arena, three dungeons, the Magic Shop, guilds, gold + mushrooms) and phased against M1–M5. Where a topic belongs to another module — combat math, art, live-ops calendars — this doc links rather than duplicates.

---

## Table of Contents

1. [World Bible](#1-world-bible)
2. [Tone & Voice Guide](#2-tone--voice-guide)
3. [Character Cast](#3-character-cast)
4. [Content Systems](#4-content-systems)
   - 4.1 [Quest-Writing Framework](#41-quest-writing-framework)
   - 4.2 [Dungeon & Boss Narrative Framework](#42-dungeon--boss-narrative-framework)
   - 4.3 [Item Flavor-Text System](#43-item-flavor-text-system)
   - 4.4 [Ambient Copy: Tips, Empty States, Notifications, Victory/Defeat](#44-ambient-copy-tips-empty-states-notifications-victorydefeat)
5. [Seasonal Story Arcs & Episodic Model](#5-seasonal-story-arcs--episodic-model)
6. [Localization Strategy](#6-localization-strategy)
7. [Content Pipeline & Tooling](#7-content-pipeline--tooling)
8. [Milestone Phasing, Risks & KPIs](#8-milestone-phasing-risks--kpis)
9. [Appendix A: Variable Banks](#appendix-a-variable-banks)

---

## 1. World Bible

### 1.1 The elevator pitch (the comedic premise)

The realm of **Addendum** was, several ages ago, a *proper* high-fantasy world — prophecies, a Dark Lord, a Chosen One, the works. Then the Chosen One won. The Dark Lord was defeated so thoroughly, so completely, that the world simply... **kept running afterward, with no plot to organize it.** Addendum is a fantasy world in its *sequel era*: the epic is over, the monsters remain, and everyone is trying to make a living inside the ruins of a story that already ended.

That is the engine of every joke in the game:

> **Addendum is an epic fantasy world being run by its middle management.**

The gods still exist but have moved into an advisory capacity. The great prophecies have all been "fulfilled," so the Prophecy Guild now writes *forecasts* ("70% chance of doom, scattered heroics"). Dragons hoard gold but must file the paperwork. The Dark Lord's old fortress is now a **timeshare**. And you, the hero, are not the Chosen One — you're a **freelancer** in a gig economy of glory, taking quests off a board because the Chosen One retired and someone still has to clear the goblins out of the turnip cellar.

**Why this is the right comedic premise (and not just "haha fantasy is silly"):**

1. **It justifies the idle-RPG loop diegetically.** You take quests, grind dungeons, and climb ladders because that is literally the *job market* of a post-heroic world. The gameplay *is* the joke.
2. **It punches up, not down.** The satire targets bureaucracy, hustle culture, self-importance, and institutions — never the player, never marginalized groups, never cruelty for its own sake. (See §2.4.)
3. **It has genuine heart.** Under the jokes is a real feeling: *the small, unglamorous work of ordinary people keeping a world alive after the heroes have gone home.* That warmth is the difference between a meme and a game people love. Pillar 2 says "satire **and heart**."
4. **It scales infinitely.** "Institutions coping with the absurd" is a bottomless well of content. Every new system we ship (crafting, raids, seasons) already has a comedic frame waiting for it: some department of Addendum is mismanaging it.

### 1.2 A brief, unreliable history of Addendum

Told as it appears in-world — via the **Codex**, a collectible lore system (§4.4) narrated by our unreliable **Narrator** (§3.5). History is deliberately fuzzy because *nobody kept good records*, which is itself a joke and a license.

- **The First Age — The Age of Making.** The gods made Addendum. Reviews were mixed. The Sun and Moon were, per surviving invoices, "installed on a provisional basis" and never signed off. This is why eclipses still feel like unscheduled maintenance.
- **The Second Age — The Age of Heroes.** Prophecies! Chosen Ones! Sword-in-stone, that whole product line. Ended when the last prophecy was fulfilled and the industry, frankly, over-hired.
- **The Third Age — The War of the Long Shadow.** The Dark Lord **Malgrath the Inevitable** rose. It was very serious. There were montages. He was defeated by a hero whose name has been lost because the commemorative plaque was ordered in the wrong font and never re-cut.
- **The Fourth Age — The Great Anticlimax (now).** The Dark Lord is gone. The prophecies are spent. The monsters, however, **did not get the memo**, and neither did the loot. So the guilds formed, the boards went up, and the Age of Heroes quietly became the **Age of Freelancers**. You are here.

The load-bearing joke: **evil was defeated, but the *paperwork* of evil is eternal.** Goblins still need clearing, crypts still need whispering, and someone incorporated all of it.

### 1.3 Geography & biomes

Addendum is a **single continent** shaped, according to cartographers, "like a dog that has given up." It is organized around one hub city and radiating danger-zones. The map's structure serves the game map (see 01-art-direction for the visual atlas; this section owns the *fiction* of each region).

| Region | Biome | Comedic frame | Houses (gameplay) |
|---|---|---|---|
| **Fanfare** | The hub city | A boomtown built on the tourism of a war that's over. Every third building is a museum. Heroes are its main industry and its main nuisance. | Town hub, Magic Shop, Tavern, Guild Hall, Arena, Quest Board |
| **The Turnip Marches** | Rolling farmland | Aggressively pastoral. The starter zone. The most dangerous thing is usually a very committed goose. | Early quests, Goblin Warren |
| **The Whispering Reach** | Fog moor & barrow-fields | Everything whispers. Nobody knows what about. The dead are chatty and passive-aggressive. | Whispering Crypt |
| **Cinderpeak** | Volcanic highlands | Dragons, timeshares, and an aggressive HOA. | Dragon's Keep |
| **The Sopping Fens** | Swamp | Where things go to ferment. Alchemists love it; everyone else holds their nose. | *(New)* The Bogologist's Folly |
| **Gilt Hollow** | Abandoned dwarven mint | The dwarves dug too greedily and hit *compound interest*. | *(New)* The Overdraft |
| **The Hush** | The edge of the map | Where the world was never finished. Reality has "known issues." | *(New)* The Unfinished |

### 1.4 Factions

Factions exist to (a) frame quests, (b) give guilds and seasons a home, and (c) generate infinite bickering. Each is a real institution with a real dysfunction. Alignment/reputation systems belong to 03/06; this doc owns their *character*.

- **The Adventurers' Guild ("the Guild").** The gig platform. Runs the Quest Board, takes a cut, insists it's "for insurance reasons." Motto: *"Glory, Provided It's Bonded."* Your professional home. Registrar: **Quill Pennant** (§3.3).
- **The Merchants' Concord.** Owns the Magic Shop and the money. Believes every problem is a pricing problem. Prints the currency; also prints the complaints form.
- **The Prophecy Guild (in decline).** Once foretold destiny; now does horoscopes and weather. Downsizing. Deeply bitter that the future became *unstructured*. Great source of ominous-but-useless flavor.
- **The Grave Circle.** Necromancers rebranded as a "legacy continuity service." Manage the dead of the Whispering Reach. Very into forms. The dead file grievances; the Circle files them back.
- **The Cinder Compact.** Dragons and their tenants. A homeowners' association with claws. Hoarding is a tax strategy.
- **The Unmade.** Not a faction so much as a *rumor with a membership fee* — the things living in The Hush, in the parts of the world that were never finished. The only faction that isn't a joke. Reserved for the darker, later-season arcs where the game earns a moment of real awe. Use sparingly; it's the pepper, not the meal.

### 1.5 Cosmology (light, because the joke needs a frame not a theology)

- **The gods** are real, retired, and reachable only by **prayer-tickets** (a support-desk metaphor). They rarely respond; when they do it's a shrug with authority. Pantheon kept small: **Fortuna** (luck, RNG, our patron of loot — she's the reason drops feel personal), **the Ledger** (an accountant-god of gold and fate), and **the Unnamed Draftsman** (who made The Hush and stopped mid-sentence).
- **Magic** is real and heavily regulated. Mages carry licenses. Wild magic is "operating without a permit."
- **Death** is a bureaucratic inconvenience in Addendum, not an ending — which is why heroes respawn, why the arena is bloodless-ish, and why the dead in the Reach are so *annoyed*. This diegetically explains the idle-RPG's lack of permadeath. The joke does the exposition for free.

**Design rule:** cosmology is a *comedy scaffold*, never a lore quiz. A player should be able to ignore all of it and lose nothing. A player who reads every Codex entry should feel the world has a spine. That's Pillar 3 (*depth you can ignore*) applied to narrative.

---

## 2. Tone & Voice Guide

This is the single most reused section in the studio. Art, Systems, Live-Ops, and Growth all pull the voice from here. If a line of text ships in the game, it obeys these rules.

### 2.1 The one-sentence voice

> **Quest & Cudgel sounds like a witty, warm friend narrating a fantasy world that takes itself far too seriously — and being unable to keep a straight face, but never being cruel about it.**

Reference stars, calibrated: the **structural wit of Terry Pratchett's Discworld** (institutions are funny; footnotes are jokes), the **deadpan-of-the-absurd of Douglas Adams** (the universe is bureaucratic and vast), the **warmth and character-first comedy of great RPGs** (Stardew's kindness, Undertale's heart), and the **cohesion discipline of Rockstar** (every barber-shop sign is on-brand). We are *not* the try-hard randomness of "so-random" internet humor. Bananas are not funny. **A dragon filing his hoard as a business expense is funny.**

### 2.2 Comedy rules (the mechanics of the joke)

1. **Specificity is funny; vagueness is not.** Not "a scary monster." **"a goose with opinions about property lines."** Always reach for the concrete, unexpected noun.
2. **The mundane collides with the epic.** The formula is *[grand fantasy thing] + [banal modern institution]*. Prophecy → forecast. Dragon → HOA. Necromancy → HR.
3. **Play it straight.** The world *believes in itself.* Characters are earnest; the *situation* is absurd. Never wink at the camera except through the Narrator, and even he only half-winks.
4. **Escalation, then a hard button.** Flavor text builds a little tower of absurdity and ends on a short, dry final beat. (See sample lines.) The button lands the joke.
5. **Rule of three.** Lists of two feel unfinished; lists of four dilute. Three items, with the third subverting: *"bring your sword, your wits, and a note from your mother."*
6. **Undercut the hero, elevate the world.** The player's grandiosity is gently deflated; the *world* is rich and lovingly detailed. We never make the world stupid — we make it *over-organized.*
7. **Heart is the payoff, not the setup.** At least once per content beat, land something genuinely kind or wistful under the joke. A retention driver, not a garnish.
8. **Brevity.** Mobile screens are small and sessions are short. Best jokes are the shortest. If a tooltip joke needs two sentences, it needs to be one.

### 2.3 Register & do/don't

**Register:** literate but never smug. Contemporary sentence rhythm, lightly archaic vocabulary flavoring (thee/thou only in-character, ironically). Reads aloud well. Grade-8 readable even when clever — cleverness is in the *idea*, not the vocabulary.

| ✅ Do | ❌ Don't |
|---|---|
| Make institutions and self-importance the butt | Make the player or real groups the butt |
| Land jokes with a specific, unexpected noun | Rely on randomness ("a fish! lol") |
| Keep the world earnest and internally consistent | Break the fiction with real-world/pop-culture refs (no memes, no brand names) |
| Use dry understatement and the hard button | Over-explain a joke or add "…lol" energy |
| Let NPCs have real feelings under the comedy | Be mean, edgy, or cynical for its own sake |
| Write short; trust the reader | Pad tooltips; bury the joke |
| Reserve awe for rare moments (The Hush) | Make *everything* a punchline (comedy fatigue) |

**Content boundaries (hard):** No slurs, no punching down, no real-world tragedy, no gross-out for shock, no sexual content, no gambling framed as skill (loot boxes handled ethically per 08). Death is bloodless and bureaucratic. Alcohol at the Tavern is played for warmth, never dependency. **Localization- and age-rating-safe by construction** (target: Teen / PEGI 12).

### 2.4 Punching-up ethics (explicit, because it's load-bearing)

Our satire has a **direction**: upward, at power and pretension. The Merchants' Concord (money), the Guild (platform-capitalism gig economy), the Prophecy Guild (institutions that outlived their purpose), the Cinder Compact (landlords). We laugh *with* the little people keeping the world running — the tavernkeep, the clerk, the freelancing hero — and *at* the systems grinding them. This is a **design constraint, not a mood**: it keeps the humor durable, universally likable, and un-cancellable. When in doubt, ask: *"Who does this joke make feel small?"* If the answer is a vulnerable person, cut it. If it's a dragon's tax attorney, ship it.

### 2.5 Sample lines (the voice in the wild)

*Item flavor (common):*
1. **Rusty Cudgel** — *"It has clubbed exactly one goblin and remembers it fondly."*
2. **Sensible Boots** — *"Chosen for the journey, not the destination. The destination has terrible footing."*

*Item flavor (rare/epic):*
3. **Cloak of Mild Concealment** — *"You are 40% harder to see and 100% more smug about it."*
4. **The Ledger's Thumb** *(ring)* — *"Weighs every scale of gold in your favor. The Ledger knows. The Ledger always knows."*

*Boss taunt:*
5. **Grubbo the Persistent** *(Goblin Warren)* — *"You've cleared this cellar four times. I respawn out of spite. It's the only benefit the job offers."*

*Boss death line:*
6. **Malgrath's Answering Machine** — *"You have reached the Dark Lord. He is unavailable, being defeated. Please leave your doom after the tone."*

*Quest flavor:*
7. **"The Case of the Missing Case"** — *"A merchant's strongbox has walked off. It has legs now. Nobody wants to discuss why."*

*Loading tip:*
8. *"In Addendum, the pen is mightier than the sword. This is why the Guild makes you sign so many forms."*

*Level up:*
9. *"You are now Level 12. The goblins have updated their threat assessment from 'nuisance' to 'errand.'"*

*Empty state (no quests):*
10. *"The Quest Board is empty. Somewhere, a goblin is behaving. It won't last."*

*Victory (arena):*
11. *"Victory. Your opponent has filed a formal complaint with the concept of fairness. It was denied."*

*Defeat (arena):*
12. *"Defeat. You fought with honor, which is worth exactly nothing at the Merchants' Concord."*

*NPC (tavernkeep):*
13. *"Sit. Drink. The world ended once already and we're all still here — that's worth a toast, isn't it?"*

*Notification (quest complete):*
14. *"Your hero has returned from 'Escort a Very Nervous Chicken.' The chicken survived. Barely anyone did."*

*Prophecy Guild (ambient / heart under the joke):*
15. *"We used to foretell the fall of kingdoms. Now we do the weather. Rain, mostly. …I miss the kingdoms."*

*Legendary reveal (awe register — earned, rare):*
16. **The Unfinished Blade** — *"The Draftsman never named it. He never finished the world, either. You are holding the place where he stopped."*

---

## 3. Character Cast

Characters are the game's warmth delivery system. Recurring NPCs are the *cast of a sitcom set in a fantasy town* — you should look forward to seeing them. Their portraits/animation belong to 01; their **lines and arcs** live here. All dialogue is data-driven (§7) so writers can extend any character without an engineer.

### 3.1 The three classes, as characters

Classes are mechanically owned by 03; here we give each a **narrative identity** so the player's self-image has a voice. This shapes level-up lines, class-specific quest flavor, and idle "barks."

- **The Warrior — "the Cudgel."** Earnest, literal, emotionally available, hits things. The heart of the trio. Believes problems are just enemies that haven't been introduced to a blunt object yet. Comedy: sincerity in absurd situations. *"I don't understand the prophecy, but I understand its kneecaps."*
- **The Mage — "the Licensed Practitioner."** Overqualified, underemployed, deeply resentful of the magic-permit bureaucracy. Reads the fine print. Comedy: intellect wasted on a broken system. *"I have a doctorate in Applied Doom. They have me de-hexing a well."*
- **The Scout — "the Freelancer's Freelancer."** Cynical, quick, allergic to institutions, secretly sentimental. The one who reads the room. Comedy: the deadpan realist among believers. *"There's no treasure. There's never treasure. …Fine, there's a little treasure."*

**Design note:** These three are an ensemble even though the player picks one. NPCs of the *other* two classes appear as recurring rivals/allies, so the comedic dynamic is always present. This is our cheapest, highest-warmth recurring content.

### 3.2 The Shopkeeper — **Odd Vendrick** ("Odds"), Magic Shop

A retired Merchants' Concord auditor who now runs the shop "for the peace." Prices everything with suspicious precision. Loves his inventory more than his customers, which is the joke and, eventually, the heart (he names every item he sells; §4.3). Sample:

- *(buy)* "A fine choice. Statistically, you'll die in it anyway, but you'll look assessed."
- *(sell)* "I'll give you nine gold. It's worth eleven, but I have to eat, and so does my ego."
- *(broke)* "Come back when your pockets and your prospects align."
- *(rare stock refresh)* "New stock. Fell off a dragon. Legally. Mostly. Don't ask the dragon."

### 3.3 The Guild Registrar — **Quill Pennant**

Runs the Quest Board. A true believer in *process* who joined the Guild for adventure and got a clipboard. Onboards the player (ties to 08 FTUE). Simultaneously the game's tutorial voice and its funniest bureaucrat. Sample:

- *(first quest)* "Welcome to the Adventurers' Guild! Please sign here, here, and here — the third one waives our liability for gerbils. It's a long story. It's always gerbils."
- *(idle nudge)* "Your hero is available. The Board is full. Do the math, hero. I've done the paperwork."
- *(promotion)* "You've been upgraded to Bonded Freelancer. That means when you die, we're *slightly* sad about it now."

### 3.4 The Tavernkeep — **Marta Ironpour**, The Last Anticlimax (tavern)

The soul of the game. Marta was a Second-Age war hero who put down her sword and picked up a tap. She's seen the epic; she *chose* the ordinary. She is where the game's heart lives — every session should be able to end here with a line that means something. Sample:

- *(rest)* "Long day of glory? Sit. Glory doesn't refill a mug. I do."
- *(heart)* "I killed a demon prince once. You know what I remember? Not the demon. The friend who bought the round after."
- *(daily return)* "You came back. In this world, that's the whole trick — coming back. Round's on the house."

Marta is the **anti-cynicism valve.** When the satire risks feeling hollow, she reminds the player the game *likes* them and the world is worth saving-slash-serving-drinks-to.

### 3.5 The Arena Announcer — **Bombast Vainglory III**

A dynasty of hype. Third of his name, none of them modest. Narrates async PvP (05). Over-the-top on purpose — the one place we *do* wink, because sports announcers are supposed to. Sample:

- *(match start)* "IN THE FAR CORNER — a hero of NUMEROUS quests and AT LEAST ONE bath — GIVE THEM NOTHING, BECAUSE THEY EARN IT!"
- *(upset win)* "AN UPSET! The odds are FURIOUS! The Ledger is RECALCULATING! Somebody get Fortuna a chair!"
- *(you lose)* "And they're DOWN — a noble effort, a NOBLE effort, the kind of effort we'll all forget by supper!"

### 3.6 Villains

The world is post-Dark-Lord, so villains are **local, absurd, and escalating**, not a single Sauron. The arc structure (§5) rotates antagonists seasonally.

- **Malgrath the Inevitable** *(defeated, recurring gag).* The old Dark Lord — dead, but his *estate* keeps generating problems (unpaid curses, haunted timeshares, an answering machine). Our reliable comedy villain: evil as an unresolved probate case.
- **The Concord's Auditor-General, Sepulchra Nett.** The season-scale antagonist: not evil, just *optimizing.* Wants to monetize the afterlife, tax the prophecies, foreclose on The Hush. The face of "punching up." Genuinely menacing precisely because she's reasonable.
- **The Unmade** *(rare, late, real).* The only true horror — the parts of the world the Draftsman never finished, now moving. Used once or twice at the top of the pyramid to deliver actual awe. Their power is that they are *not* funny, in a game where everything is. Contrast is the weapon.

### 3.7 The Narrator

A single narrating voice threads the whole game — loading tips, quest resolutions, Codex, the "voice of Addendum." He is a **failed Prophecy Guild forecaster** who has appointed himself chronicler of the Age of Freelancers because someone should. Omniscient-ish, unreliable, fond of the player, prone to footnote-style asides. He is how the game talks to you when no character is on screen. His warmth (he's rooting for you) and his dryness (he's seen it all) are the two channels every ambient line balances.

> *"Our hero set out at dawn, or near enough — dawn had been rescheduled. The gods are behind on maintenance. They're behind on most things. But the road was open, the cudgel was heavy, and that, most mornings in Addendum, is enough."*

---

## 4. Content Systems

The heart of this doc: **reusable machines for making content at scale.** Every system is (a) template + (b) variable bank + (c) worked examples, so a non-engineer writer can produce on-tone content on day one, and the game can procedurally combine banks for volume. Schema shapes are in §7; the banks themselves in Appendix A.

### 4.1 Quest-Writing Framework

**Design goal:** quests already exist mechanically (pick a length, countdown, collect — server-checked). Narrative wraps each quest instance in a **title + flavor beat + resolution line**. Titles must be *scannable and funny at a glance* (they're a list on the Board), flavor sets the scene, resolution pays it off on collect.

**The quest string template (data-driven):**

```
title:      "{QUEST_TITLE}"                       // scannable, funny, ≤ 42 chars
premise:    "{HOOK}. {COMPLICATION}."             // 1–2 lines, sets the job
resolution: "{OUTCOME}. {DRY_BUTTON}."            // shown on collect
```

**Two production modes:**

1. **Hand-authored quests** (hero content): fully written, for FTUE, seasonal beats, and marquee jobs. ~20% of quests, 80% of the delight. Always used for the first-hour experience.
2. **Procedural quests** (volume content): assembled from banks so the Board never repeats and idle players always see fresh titles. Formula:

```
{VERB} the {ADJ} {NOUN} {LOCATION_OR_TWIST}
```

Pulling from banks (full lists in Appendix A):
- **VERB:** Retrieve, Escort, Investigate, Negotiate With, Apologize To, Reorganize, Evict, Babysit, Appraise, Un-curse…
- **ADJ:** Nervous, Overdue, Haunted, Passive-Aggressive, Mildly Cursed, Unionized, Discount, Ceremonial…
- **NOUN:** Chicken, Turnip, Heirloom, Goblin, Ghost, Ledger, Prophecy, Goose, Barrel, Cousin…
- **TWIST (optional tail):** "…Before Lunch", "…For Legal Reasons", "…Again", "…This Time Politely", "…Without Being Seen"

Example auto-generated titles: *"Evict the Unionized Ghost For Legal Reasons," "Babysit the Mildly Cursed Turnip," "Negotiate With the Passive-Aggressive Goose, This Time Politely."* The comedy is structurally guaranteed by the collision rule (§2.2) baked into the banks.

**Quality guardrail:** each bank entry is tone-reviewed once; every *combination* is then automatically on-brand. This is how we scale from 60 to 6,000 quests without a drop in voice. Rarer "beat" quests (multi-step, seasonal) are always hand-authored.

#### Bank of 60+ quest titles (ready to ship)

*Starter / Turnip Marches (earnest, gentle):*
1. Clear the Goblins from the Turnip Cellar
2. Escort a Very Nervous Chicken
3. Retrieve Granny's Aggressive Heirloom
4. Settle a Dispute Between Two Geese
5. Find Out What the Well Is Whispering
6. Return a Library Book (47 Years Overdue)
7. Convince the Scarecrow It Has Done Enough
8. Recover the Mayor's Dignity (Last Seen Tuesday)
9. Count the Sheep (One Is Lying)
10. Deliver a Strongly Worded Letter to a Bear

*Whispering Reach (spooky-but-petty):*
11. Ask the Dead to Keep It Down
12. Notarize a Ghost's Will
13. Evict a Squatter From a Reputable Tomb
14. Investigate the Barrow That Keeps Rescheduling
15. Fetch a Skull (It Left; It's Complicated)
16. Mediate the Crypt's Ongoing HR Dispute
17. Read a Eulogy to Someone Who Objects
18. Reunite a Ghost With Its Unfinished Business (It's Taxes)
19. Silence the Choir of the Mildly Regretful
20. Return a Borrowed Soul (No Late Fee, Please)

*Cinderpeak (money-and-dragons):*
21. Appraise a Dragon's Hoard for Tax Purposes
22. Attend the Cinder Compact HOA Meeting
23. Recover a Deed From a Very Literal Fire Sale
24. Negotiate a Dragon's Rent-Controlled Lair
25. Insulate a Volcano (It's a Comfort Thing)
26. Retrieve the Timeshare Keys From Malgrath's Estate
27. Deliver an Eviction Notice to Something Large
28. Audit the Ashes for Unclaimed Gold
29. Talk a Dragon Down From a Bad Investment
30. Escort a Fireproof Accountant Uphill

*Sopping Fens (gross-but-charming):*
31. Bottle Something That Should Not Be Bottled
32. Find the Alchemist (Follow the Smell)
33. Un-ferment the Village Pond
34. Rescue a Boot From the Bog (Foot Still In It)
35. Catalogue the Fens' New and Alarming Frog
36. Retrieve a Recipe Before It Achieves Sentience
37. Escort a Barrel That Is Definitely Fine
38. Identify Whatever Is Making That Noise
39. Drain the Swamp (Metaphor Not Included)
40. Fetch Bog-Iron for a Very Picky Smith

*Fanfare / civic (bureaucratic):*
41. File a Complaint on Behalf of a Goblin
42. Deliver the Guild's Deliverables
43. Renew a Wizard's Expired Magic Permit
44. Attend a Meeting About Meetings
45. Escort a Very Important Form Across Town
46. Recover the Prophecy Guild's Last Prophecy
47. Reassure a Statue It Is Still Relevant
48. Audit the Tavern (Marta Will Not Cooperate)
49. Return the Mayor's Ceremonial Cudgel
50. Stand in Line So Someone Else Doesn't Have To

*The Hush (uneasy, rare, half-serious):*
51. Map a Street That Wasn't There Yesterday
52. Ask the Edge of the World to Please Stop
53. Retrieve a Name No One Remembers Choosing
54. Investigate the House With Too Many Rooms
55. Return From the Unfinished (Primary Objective)

*Evergreen procedural samples (bank-assembled):*
56. Evict the Unionized Ghost, For Legal Reasons
57. Babysit the Mildly Cursed Turnip
58. Apologize to the Ceremonial Goose, Again
59. Reorganize the Haunted Ledger Before Lunch
60. Negotiate With the Discount Prophecy, Without Being Seen
61. Appraise the Overdue Heirloom, This Time Politely
62. Un-curse the Passive-Aggressive Barrel
63. Investigate the Nervous Cousin (For Legal Reasons)

**Worked full example:**

> **Title:** Escort a Very Nervous Chicken
> **Premise:** "A prize hen must reach the market by dusk, and she has *heard things.* Every shadow is a fox, every fox is a conspiracy. Keep her calm. Keep her moving."
> **Resolution:** "The chicken arrived, molted from stress but alive. She has requested you not make eye contact ever again. Reward disbursed; therapy not included."

### 4.2 Dungeon & Boss Narrative Framework

**Design goal:** each dungeon is a *place with a personality*; each floor boss gets a **three-beat arc** — **Intro** (as you enter the fight), **Taunt** (on a turn/phase or on repeat runs), **Death Line** (on defeat). Boss deaths are the game's biggest single narrative payoff after loot; they must *land*. Death lines are bloodless per §2.3 — bosses are *inconvenienced*, not gorily killed.

**Boss narrative template (data-driven, §7):**

```
boss:  { name, epithet, dungeon, floor }
intro:  "{ENTRANCE_BOAST}"
taunt:  ["{TAUNT_A}", "{TAUNT_B}"]        // rotates; index by turn or run count
death:  "{DEFEAT_BUTTON}"                   // the payoff line
codex:  "{OPTIONAL_LORE_UNLOCK}"            // added to Codex on first kill
```

#### Existing dungeon 1 — **Goblin Warren** (Turnip Marches)

*Fiction:* Not a lair, a *startup.* The goblins have "pivoted" from raiding to "aggressive turnip acquisition." Tone: earnest incompetence, the friendliest dungeon.

- **Floor Boss: Grubbo the Persistent** *(epithet: "Middle Management")*
  - **Intro:** "Halt! You are trespassing on Goblin-Held Turnip Assets. Do you have an appointment? …You never have an appointment."
  - **Taunt A:** "We're not monsters. We're a *collective.* With teeth."
  - **Taunt B:** "You've cleared this cellar four times. I respawn out of spite. It's the only benefit the job offers."
  - **Death:** "Fine. FINE. I'll put it in the minutes: 'hero happened.' …Motion to adjourn my life."
  - **Codex:** *"Grubbo has died 1,204 times realm-wide today. He remains, per his contract, persistent."*

- **Deep Boss: Big Mama Gnash** *(epithet: "The Founder")*
  - **Intro:** "You hurt my boys. My stupid, incorporated boys. Now you deal with the woman who signed their paychecks."
  - **Death:** "Tell the little idiots… I was proud of the branding." *(the game's first "aww" — earnest heart under a goblin joke)*

#### Existing dungeon 2 — **Whispering Crypt** (Whispering Reach)

*Fiction:* The dead are not restful, they're *administrative.* Everyone here has a grievance and the paperwork to prove it. Tone: gothic passive-aggression.

- **Floor Boss: The Wailing Notary** *(epithet: "Grief, Notarized")*
  - **Intro:** "You disturb a place of rest. Well. A place of *filing.* Nobody rests. There's a backlog."
  - **Taunt A:** "I have your death certificate pre-filled. It's very tidy. Would you like to review it?"
  - **Taunt B:** "The whispers? Complaints. All of them. About the temperature, mostly."
  - **Death:** "Denied… my own… paperwork. The irony has been… duly noted, and… filed."
  - **Codex:** *"The Whispering Reach whispers because the dead were never given exit interviews."*

- **Deep Boss: Lord Ashmourn the Adjourned** *(epithet: "Waiting on One Signature")*
  - **Intro:** "I have waited three ages to be at peace. I lack ONE signature. You have hands. Sign, or join the queue."
  - **Death:** "At last… the form is complete… I can finally… oh. There's a *second* form. …Of course there is."

#### Existing dungeon 3 — **Dragon's Keep** (Cinderpeak)

*Fiction:* A dragon's hoard reframed as a *contentious estate.* Wealth, tax, and a very old lizard who is lonelier than he admits. Tone: opulent, prickly, secretly sad.

- **Floor Boss: Vaultwyrm Grimscale** *(epithet: "Asset-Rich, Friend-Poor")*
  - **Intro:** "You come for my gold. Everyone comes for the gold. No one comes for *me.* …The gold. Fight me for the gold."
  - **Taunt A:** "Every coin here is depreciating and so, frankly, are you."
  - **Taunt B:** "I could buy your entire bloodline. I checked. It's affordable."
  - **Death:** "Take it. Take the gold. It was only ever… a very large, very shiny way of not being alone."
  - **Codex:** *"A dragon's hoard is not wealth. It is a wall built one coin at a time against the quiet."*

- **Apex Boss: Malgrath's Answering Machine** *(epithet: "The Estate")* — the recurring gag boss; Malgrath is dead but his cursed estate defends itself.
  - **Intro:** "YOU HAVE REACHED THE DARK LORD. He is unavailable, being *permanently defeated.* Your doom is important to us."
  - **Death:** "Message… not saved. Please… hang up… and try a *smaller* destiny."

#### New dungeon 4 — **The Overdraft** (Gilt Hollow, abandoned dwarven mint)

*Fiction:* The dwarves dug too greedily and struck **compound interest.** The mint is now animate money that wants to be spent and can't be. Tone: golden, glinting, quietly menacing capitalism.

- **Floor Boss: The Chief Cashier** *(epithet: "Insufficient Funds")*
  - **Intro:** "Withdrawal request denied. You lack the collateral. You lack, honestly, the *vibe.*"
  - **Taunt A:** "Every blow you land is a *transaction fee.* You're paying to hurt me."
  - **Death:** "Balancing… the books… one last… oh no. I'm in the red. I'm *literally* in the red now."

- **Deep Boss: The Interest, Compounded** *(epithet: "It Only Grows")*
  - **Intro:** "The dwarves borrowed against tomorrow. I am tomorrow. I have come to collect, with penalties."
  - **Death:** "You can't kill a debt. You can only… restructure it. …We'll be in touch. We're *always* in touch."

#### New dungeon 5 — **The Bogologist's Folly** (Sopping Fens)

*Fiction:* An alchemist's field station where an experiment to "improve" the swamp made it *ambitious.* Tone: squelchy, curious, comedically toxic.

- **Floor Boss: Fenwick the Bogologist** *(epithet: "It Was Peer-Reviewed")*
  - **Intro:** "You're contaminating my study! Also possibly dissolving. Both are data. Hold still — for science, and for the swab."
  - **Taunt A:** "Fascinating. Your screaming has a *pH.*"
  - **Death:** "Note to self… hero was… *reactive*… retract the paper… retract every… blblblb."

- **Deep Boss: The Frog Prince Regent** *(epithet: "Newly and Alarmingly Large")*
  - **Intro:** "I was a small frog with a small pond and small dreams. The alchemist *upgraded* me. I did not consent. I did not need to."
  - **Death:** "Small again… small pond… small dreams… *ribbit.* …That's the nicest thing that's happened to me all age."

#### New dungeon 6 — **The Unfinished** (The Hush) — the awe dungeon

*Fiction:* The endgame place. The part of Addendum the Draftsman never completed. Here the jokes go quiet. Tone: genuine wonder and unease — the earned exception to "everything is funny." One dry line at the entrance to signal the shift, then straight sincerity.

- **Threshold line (Narrator):** *"There are no jokes here. He never wrote them. Mind the edges."*
- **Floor Boss: The Draft** *(epithet: "A Sketch of a Thing")*
  - **Intro:** "…" *(it has no dialogue; it was never given words. The silence is the horror.)*
  - **Taunt (Narrator, on player's behalf):** "It reaches for a name it was never given. Don't offer yours."
  - **Death:** *(the Narrator, softly)* "It unmakes, gently, back into blank page. Somewhere, a story it might have been sighs and lets go."

- **Apex Boss: The Unnamed Draftsman** *(epithet: "He Who Stopped")* — the top of the pyramid.
  - **Intro:** "I made a world. I got tired. Is that so unforgivable? …You, at least, are finished. I *envy* you that."
  - **Death:** "Perhaps… you can finish it. Someone should. It was going to be *beautiful.*" *(hands the player the Unfinished Blade — see §4.3 legendaries. The single most emotionally weighted moment in the game.)*

**Framework rule:** every dungeon carries a **secret sincerity beat** (Big Mama's pride, the dragon's loneliness, the frog's small dreams, the Draftsman's regret). The comedy earns the trust; the sincerity spends it. That one-two is the retention engine — players screenshot the funny lines and *remember* the sincere ones.

### 4.3 Item Flavor-Text System

**Design goal:** the shipped shop already generates **adjective + noun + suffix** names across rarities. Narrative layers **flavor text** on top and **named legendaries** at the peak. The system must (a) never repeat awkwardly, (b) scale tone across rarity, and (c) make legendaries feel *hand-carved.*

**Rarity → voice ladder** (tone escalates with rarity — Odds the shopkeeper "narrates" the world's stuff):

| Rarity | Name pattern | Flavor voice | Length |
|---|---|---|---|
| Common | `{adj} {noun}` | Dry, self-deprecating, mundane | ≤ 12 words |
| Uncommon | `{adj} {noun} {suffix}` | A small brag, undercut | ≤ 16 words |
| Rare | `{adj} {noun} {suffix}` + minor lore | Confident, a little magic | ≤ 20 words |
| Epic | `The {noun} of {proper}` | Grand, one real emotion under it | ≤ 24 words |
| Legendary | **Hand-named, unique** | Awe, history, heart. No jokes at the top tier — or one, perfectly placed | 1–2 lines |

**Procedural flavor template** (for common→epic, assembled from banks in Appendix A):

```
"{OPENER_BY_RARITY}. {UNDERCUT_OR_LORE}."
```
- OPENER bank keyed by slot (weapon/armor/trinket) and rarity.
- UNDERCUT bank for low rarity; LORE bank for high rarity.
Example: weapon + rare → *"Forged in a fire that meant it. {suffix} 'of Consequence' is not a decoration — it's a warning."*

#### 30+ example item names + flavor across rarities

*Common:*
1. **Rusty Cudgel** — "It has clubbed exactly one goblin, and remembers it fondly."
2. **Sensible Boots** — "For the journey, not the destination. The destination has terrible footing."
3. **Damp Buckler** — "Blocks blows and, unfortunately, nothing else. It's very damp."
4. **Secondhand Helm** — "The previous owner isn't using it. Try not to think about why."
5. **Practical Trousers** — "Heroism is 10% courage and 90% not losing your trousers."
6. **Chipped Shortsword** — "The chip has a name. The chip has *seen things.*"

*Uncommon:*
7. **Cutlass of Mild Renown** — "Famous in one tavern. That tavern has since closed. Still counts."
8. **Gauntlets of the Firm Handshake** — "+2 to intimidation, +5 to closing awkward business deals."
9. **Cloak of Mild Concealment** — "You are 40% harder to see and 100% more smug about it."
10. **Boots of the Slightly Faster** — "You will arrive late, but *emphatically* so."
11. **Ring of the Small Favor** — "Fortuna owes you nothing and pays it back precisely."

*Rare:*
12. **Warhammer of Consequence** — "Forged in a fire that meant it. It does not tap. It *concludes.*"
13. **Aegis of the Long Meeting** — "Has endured worse than any blade: the Concord's quarterly review."
14. **Scout's Whispering Dagger** — "It tells you where to strike. It is usually right. It is never kind."
15. **Robe of the Licensed Practitioner** — "Fully permitted. Carries its own paperwork in an extradimensional pocket."
16. **Amulet of the Second Opinion** — "Doubts your enemies for you, so you can focus on the hitting."

*Epic:*
17. **The Cudgel of First Principles** — "Every problem, reduced to its simplest form: this, applied briskly."
18. **The Ledger's Thumb** *(ring)* — "Weighs every scale of gold in your favor. The Ledger knows. The Ledger always knows."
19. **The Mantle of Marta Ironpour** — "She hung up her cloak to pour drinks. It still remembers how to save a life."
20. **Crown of the Adjourned King** — "Rules nothing now but waits with terrible patience for the meeting to resume."
21. **The Forecaster's Broken Compass** — "Points not north, but toward the future the Prophecy Guild lost. It trembles."
22. **Grimscale's Last Coin** — "The one coin a dragon kept for *company.* Still warm. Still lonely."

*Legendary (hand-named, unique — the crown jewels):*
23. **The Unfinished Blade** — "The Draftsman never named it. He never finished the world, either. You are holding the place where he stopped. It is lighter than it should be, the way an unspoken word is light."
24. **Malgrath's Retirement** — "The Dark Lord's own weapon, defeated so long ago it forgot it was evil. Now it just wants to rest. It will fight for you if you promise, afterward, to let it."
25. **The First Cudgel** — "Before swords, before spells, before the paperwork — someone picked this up and decided *no.* Every hero since is a footnote to that first, furious swing."
26. **Fortuna's Loaded Die** — "She rolls it for herself and never shows the result. Now it's yours. The odds have never been honest; today, they're honest *for you.*"
27. **The Eulogy Blade** — "Forged from a hero's name that was lost to a typo. Speak its wielder's deeds aloud and it remembers, for both of you, what the plaque forgot."
28. **The Draftsman's Pen** *(offhand)* — "Not a weapon. A *decision.* It finishes things — sentences, worlds, enemies. Use it gently. It doesn't know how to stop."

*Set / crafted (ties to 04 crafting):*
29. **Turnip-Iron Blade** — "The goblins fought so hard for the turnips that the turnips, eventually, fought back. Peasant steel, prouder than kings' gold."
30. **Bog-Forged Plate** — "Smells of the Fens and always will. Fenwick would call it 'reactive.' You call it 'home, unfortunately.'"
31. **The Freelancer's Kit** *(set bonus flavor)* — "No banner, no oath, no lord. Just you, the road, and a receipt for every heroic deed. It's not glorious. It's *yours.*"

**Named-legendary rule:** every legendary is a **hand-authored micro-story** that ties to a character, faction, or the cosmology. This is where the game's writing wins awards and where the awe register (§2) lives. Budget: **one hero legendary per major content drop.** Never proc-gen a legendary name — that's the line between "content" and "artifact."

### 4.4 Ambient Copy: Tips, Empty States, Notifications, Victory/Defeat

The game is *never mute* (Master Plan §6, "Narrative saturation"). This is the connective tissue — the highest-volume, most-seen writing in the product.

#### Loading tips (25+, the Narrator's voice — funny + occasional real tip + occasional heart)

1. "The pen is mightier than the sword. This is why the Guild makes you sign so many forms."
2. "Goblins respawn out of spite. It's the only benefit the job offers them."
3. "A dragon's hoard is a wall built one coin at a time against the quiet. Bring a bigger bag anyway."
4. "Death in Addendum is a formality. An *annoying* formality, but a formality."
5. "The Prophecy Guild now forecasts weather. It is wrong about that, too."
6. "Tip: higher-rarity gear rolls better stats. Odds will still overcharge you. Haggle."
7. "The Sun and Moon were never signed off. Eclipses are unscheduled maintenance. Don't panic."
8. "Marta killed a demon prince once. Ask her about the *round afterward* instead."
9. "Tip: your idle hero keeps questing while you're away. Addendum doesn't stop for anyone."
10. "Every prophecy has been fulfilled. This is why nothing makes sense and everything is your problem."
11. "The dead whisper because no one gave them an exit interview. Be kind. File your forms."
12. "A goose is a swan that chose violence. Give it space. Give it *all* the space."
13. "Tip: guild members earn a gold perk. Loneliness is expensive; company pays dividends."
14. "The Dark Lord is defeated. His *paperwork* is eternal. Guess which one you'll be fighting."
15. "Fortuna loves you. Fortuna loves everyone. Fortuna is, statistically, lying to most of you."
16. "Tip: sell gear you don't need. Odds pays badly, but the Fens pay in *frogs.*"
17. "Fanfare has more museums than houses. The main exhibit is a war everyone would like to forget."
18. "A hero is just a freelancer with better branding and worse insurance."
19. "The Hush is where the world was never finished. Do not go looking for the edge. It looks back."
20. "Tip: bosses hit harder on deeper floors. So does the loot. So does the regret."
21. "Wild magic is just magic operating without a permit. The fines are… substantial."
22. "You came back today. In this world, coming back is the whole trick. Well done."
23. "Somewhere a goblin is behaving. It won't last. It never lasts. Thank goodness."
24. "Tip: arena wins raise your rank; losses build character. Bombast will announce both, loudly."
25. "The gods answer prayers by ticket. Yours is #4,891,002. They're 'looking into it.'"
26. "The road is open, the cudgel is heavy. Most mornings in Addendum, that's enough."
27. "There's never treasure. …Fine. There's a little treasure. There's always a little treasure."

#### Empty-state copy (turn dead screens into character — Pillar 2, "no filler")

- **No quests on Board:** "The Quest Board is empty. Somewhere, a goblin is behaving. It won't last — check back soon."
- **Empty inventory:** "Your pack is empty. Light on your feet, light in the pocket. The road provides. Eventually. Probably."
- **No guild:** "You have no guild. Addendum is asynchronous, never lonely — find your people, or found your own."
- **Empty mailbox:** "No mail. Even the gods haven't answered — you're #4,891,002 in the prayer queue."
- **No arena history:** "No duels yet. Bombast Vainglory III is *waiting,* and he does not wait quietly."
- **Broke (0 gold):** "Your purse echoes. Odds can hear it from here. Go quest — glory is bonded, but it isn't free."
- **No dungeon progress:** "Every dungeon is untouched. Somewhere, a boss is respawning out of pure optimism. Ruin it for them."

#### Notification / push copy (short, on-tone, respectful — pull, never nag; ties to 08 & 06)

- **Quest complete:** "Your hero is back from '{quest}.' The reward is real; the trauma is billable."
- **Idle quest ready:** "Addendum didn't stop while you were gone. Neither did your loot. Come collect."
- **Arena revenge available:** "Someone beat your hero. Bombast has their name and it would be a *shame* if nothing happened."
- **Daily reset:** "The Board's been restocked, the goblins re-spited. A new day of freelancing awaits."
- **Guild event:** "Your guild needs you. Async, remember? They *can* do it without you — but the perks won't."
- **Season ending (48h):** "The season closes soon. History remembers the top of the ladder and forgets the rest. No pressure."

*Push guardrail (ties to 08):* max cadence honest, never guilt-based ("you abandoned your hero" is **banned** — punching down at the player). Tone is *inviting,* not clingy. This protects the "respect the player's time and trust" pillar.

#### Victory / defeat lines (rotate; keyed by context — quest, arena, dungeon)

*Victory:*
- "Victory. Your opponent filed a complaint with the concept of fairness. It was denied."
- "Won. Bombast is already exaggerating it. By supper you'll have slain a god."
- "Cleared. The dungeon will respawn out of spite, but for now — for *now* — it's yours."

*Defeat:*
- "Defeat. You fought with honor, worth exactly nothing at the Merchants' Concord."
- "Down, but not out — death here is a formality. An embarrassing one. Dust yourself off."
- "Lost. The goblins are updating your threat assessment from 'errand' back to 'nuisance.' Rude."

*Big win (boss kill / rare drop — celebrate, Pillar 1):*
- "THE BOSS FALLS. Somewhere in Fanfare, a museum clears a shelf for you. Bombast is weeping."

---

## 5. Seasonal Story Arcs & Episodic Model

Live narrative is how the world *stays alive* (Pillar 4) and drives M5 retention. This section defines the **model**; the calendar, cadence, and reward tuning are owned by **06-endgame-liveops-events** — we supply the story engine, they supply the schedule.

### 5.1 The "Age of Freelancers Chronicle" — episodic structure

Narrative ships in **Seasons** (~8 weeks, aligned to 06's ladder). Each Season is a **Chapter** in an ongoing anthology with a self-contained arc, a rotating antagonist, and a permanent Codex legacy. Structure per Season:

```
Season = { theme, antagonist, 3 Acts, 1 hero legendary, Codex chapter, cosmetic set }
Act 1 (wk 1–3): "The Inconvenience" — a comedic problem appears (new quests + a limited boss)
Act 2 (wk 4–6): "The Complication" — it's bigger/institutional than it looked (mid-boss, faction drama)
Act 3 (wk 7–8): "The Reckoning" — community/personal climax (raid or apex boss, the legendary drops, a heart beat)
```

Every Season **must** hit: one big laugh (Act 1 hook), one institutional satire (Act 2), one sincere payoff (Act 3). This is the §4.2 one-two at macro scale.

### 5.2 Sample Season slate (first year — ready to build)

| # | Season Title | Antagonist | Comedic premise | Heart beat |
|---|---|---|---|---|
| S1 | **The Great Restock** | The Merchants' Concord | The Concord "optimizes" the Quest Board into a subscription. Heroes unionize. | The little clerks matter |
| S2 | **The Reach Reopens** | Sepulchra Nett | The afterlife gets monetized; the dead are billed for haunting. | A ghost finally rests |
| S3 | **Fire Sale** | The Cinder Compact | Dragons list Cinderpeak on the market; the HOA goes to war over parking. | Grimscale finds a friend |
| S4 | **The Unfinished** | The Unnamed Draftsman | The Hush spreads. The jokes stop. The real one. | You finish his sentence |

S4 is the **tentpole** — a full year of comedy earns one season of awe. This is the shape of the entire game in miniature.

### 5.3 Delivery mechanics (data-driven, live-updatable)

- **Story beats are content rows, not code.** A Season is a bundle of quest/boss/item/Codex rows tagged `seasonId` + `act` + `availableWindow` (§7). Live-Ops flips a flag; the story appears. No deploy.
- **The Codex** is the persistent narrative home: an unlockable in-game book where every Season's chapter lives forever. New players binge past seasons; veterans collect. This is our **narrative retention flywheel** — story you can't lose motivates returning.
- **Async-safe:** because the world is server-authoritative and async (Pillar 4), seasonal beats reach every player regardless of timezone/schedule. No "you missed the event" — you missed the *ladder,* but the *story* stays in the Codex.
- **Micro-episodes:** between Seasons, small 1-week "Interludes" (a single hand-authored quest chain + one boss) keep the world warm cheaply. Great for holidays (reskinned, never off-tone).

### 5.4 Living NPCs

Recurring NPCs (§3) **remember and evolve** across seasons via a lightweight state flag (e.g., `grimscale.hasFriend = true` after S3). Marta references past seasons at the Tavern. This continuity — cheap to build, huge for warmth — is what makes Addendum feel like a *place you've been coming to,* not a content treadmill. **This is the single highest-ROI narrative retention mechanic in the doc.**

---

## 6. Localization Strategy

Comedy is the hardest thing to localize. We plan for it from line one, or we ship jokes that die at the border. Owned jointly with 09-technical-architecture (string infra) and this doc (humor policy).

### 6.1 Principles

1. **Transcreation, not translation.** Loc vendors are briefed to *recreate the joke,* not render the words. A pun that dies in German gets a *new German joke of equal spirit.* Budget and brief for this explicitly.
2. **Voice bible per locale.** §2 is translated into a **localized voice guide** so each language has its own calibrated version of "witty, warm, punches up." Ship it to every loc partner.
3. **No baked-in wordplay dependencies.** Systems (§4) never assume English grammar. Item names are assembled via locale-aware templates (see 6.3), not string concatenation.
4. **Cultural safety review per locale.** The punching-up rule (§2.4) is re-checked per market — a joke about bureaucracy travels; a joke about a specific institution may not. Flag `culturallySensitive` on rows needing local review.

### 6.2 Launch locale tiers

- **Tier 1 (full transcreation, launch):** EN, DE (Shakes & Fidget's heartland — critical), FR, ES-LATAM, PT-BR.
- **Tier 2 (fast-follow):** RU, PL, KR, JP, TR.
- **Tier 3 (community/opportunistic):** IT, ZH, NL, others by demand.

### 6.3 String architecture (comedy-safe)

- **Every player-facing string is a keyed resource** — zero hardcoded text. Keys are namespaced: `quest.title.escort_nervous_chicken`, `boss.grubbo.death`, `tip.pen_mightier`.
- **ICU MessageFormat** for all interpolation (plurals, gender, number) — never string concatenation, which breaks grammatical gender/order across languages.
- **Procedural names use locale-aware grammar tables.** The `{adj} {noun}` pattern carries per-locale agreement rules (gender, adjective position — French/Spanish put the adjective *after*). Each bank entry stores its grammatical metadata so assembly is correct in every language. **This is the make-or-break of loc; specced in §7.**
- **Context notes ship with every string.** Loc keys carry a `note` field ("this is a joke; the humor is X; feel free to replace") so translators aren't guessing. Screenshots/context auto-attached where possible.
- **Length budgets** per string (mobile-first). German runs ~30% longer than English; UI copy carries a `maxLen` hint so translators and layout (01) don't collide.
- **Pseudo-localization in CI:** every build renders strings in accented, +40%-length pseudo-loc to catch truncation and hardcoded text *before* real loc spend.

### 6.4 The untranslatable list

Some jokes are English-structural and must be **flagged `transcreate: true`** so vendors know to invent, not translate (e.g., "The Adjourned" king pun on legal/rest meanings). We maintain a living list; each gets a per-locale creative brief. Budget ~15% of comedic strings as full-transcreation, not machine-assisted.

---

## 7. Content Pipeline & Tooling

The thesis of this doc: **writers ship content without engineers.** That requires (a) a data-driven schema, (b) a validation layer that enforces tone/length, and (c) an authoring surface. Schemas below are proposals to **09-technical-architecture** (who owns canonical Prisma); additive-only per Master Plan §8.

### 7.1 Content-as-data model (proposed Prisma shapes)

All narrative content lives in versioned, translatable rows. Illustrative schema:

```prisma
// A single localizable string. Everything player-facing points here.
model LocString {
  id        String  @id @default(cuid())
  key       String  @unique              // "boss.grubbo.death"
  locale    String                       // "en", "de", ...
  text      String
  note      String?                       // translator context / the joke explained
  maxLen    Int?                          // UI length budget
  transcreate Boolean @default(false)     // must be reinvented, not translated
  culturallySensitive Boolean @default(false)
  @@unique([key, locale])
}

// Procedural name/flavor banks (quests, items).
model ContentBank {
  id       String  @id @default(cuid())
  bank     String                         // "quest.verb", "item.adj.weapon", ...
  value    String                         // "Evict" | "Nervous" | ...
  locale   String
  grammar  Json?                          // { gender:"m", adjPos:"post" } for loc-safe assembly
  weight   Int     @default(1)            // rarity/frequency weighting
  tags     String[]                       // ["turnip-marches","gentle"] for filtering
}

// Quest content wrapper (mechanics live in the Quest system, 03).
model QuestContent {
  id         String @id @default(cuid())
  questKey   String @unique
  titleKey   String                       // -> LocString or assembled from banks
  premiseKey String
  resolutionKey String
  region     String
  handAuthored Boolean @default(false)
  seasonId   String?                       // null = evergreen
}

// Boss narrative (the arc); combat stats live in 03.
model BossNarrative {
  id       String @id @default(cuid())
  bossKey  String @unique                 // "grubbo"
  nameKey  String
  epithetKey String
  introKey String
  tauntKeys String[]                       // rotate by turn/run
  deathKey String
  codexKey String?
  dungeon  String
  floor    Int
}

// Item flavor (names/lore); stats/affixes live in 04.
model ItemFlavor {
  id        String @id @default(cuid())
  itemKey   String @unique
  rarity    String                         // common..legendary
  nameKey   String?                         // set for named legendaries
  namePattern String?                       // set for procedural ("{adj} {noun} {suffix}")
  flavorKey String
  linkedCharacter String?                    // "marta" -> continuity
}

// Persistent lore book.
model CodexEntry {
  id       String @id @default(cuid())
  entryKey String @unique
  chapter  String                          // season or region
  titleKey String
  bodyKey  String
  unlockCondition Json                      // { onKill:"grubbo" } | { season:"S2" }
  order    Int
}

// Seasonal story bundle (Live-Ops flips availability; 06 owns the calendar).
model StorySeason {
  id        String @id @default(cuid())
  seasonId  String @unique
  titleKey  String
  act       Int
  availableFrom DateTime
  availableTo   DateTime
}
```

**Key design choice:** *content references string keys, never literal text.* Mechanics (03/04) reference a content row by key; content rows reference LocStrings by key. Three clean layers — **mechanics ⟶ content ⟶ localized text** — so a designer tunes a boss's HP without touching its taunt, a writer rewrites the taunt without touching HP, and loc translates without touching either.

### 7.2 Authoring surface (non-engineer workflow)

1. **Source of truth: a structured spreadsheet / headless CMS** (e.g., a Google Sheet or Sanity/Airtable) with one tab per content type, columns matching the schema. Writers work here — familiar, no code.
2. **Import script** (owned by 09) validates + upserts sheet → Postgres. Runs in CI and on-demand.
3. **Validation gates (automated, block bad content):**
   - **Length:** enforce `maxLen` per string/UI slot (mobile truncation guard).
   - **Tone lint:** a wordlist/regex + optional LLM check flags banned content (slurs, real brands, pop-culture refs, "punching down" phrases, "lol" energy). Fails the build with a human-readable reason.
   - **Completeness:** every `key` referenced by a mechanic must exist; every EN string must have a `note` if `transcreate:true`.
   - **Bank coverage:** procedural banks must meet minimum-size thresholds so combinations don't feel repetitive.
4. **Preview:** a `/content-preview` internal route renders any quest/boss/item exactly as in-game (pulls from staging DB) so writers see their line in context before merge. Pseudo-loc toggle included.

### 7.3 Reuse & scale

- **One tone review per bank entry, infinite safe combinations.** (§4.1) The pipeline's core efficiency: review atoms, not molecules.
- **Content velocity target:** after M2 tooling lands, a writer can add **a full seasonal quest pack (30 quests + 2 bosses + 1 legendary + Codex chapter) with zero engineering tickets.**
- **Versioning:** content rows are additive and timestamped; rollback = flip a flag. Aligns with Master Plan §8 (additive migrations only).

---

## 8. Milestone Phasing, Risks & KPIs

### 8.1 Phasing (M1 → M5)

| Milestone | Narrative deliverables | Depends on |
|---|---|---|
| **M1 — Foundation** | World bible + voice guide locked (§1–2) · rewrite ALL existing shipped text to voice (3 dungeons' bosses, current items, shop/quests) · loading tips, empty states, notif copy live · Narrator voice established · **LocString architecture** stood up | 01 (portrait/UI slots), 09 (string infra) |
| **M2 — Depth** | Quest-writing framework + full banks live (§4.1) · item flavor system wired to crafting/affixes · FTUE script (Quill Pennant) · recurring NPC cast written (Odds, Marta, Bombast) · **content pipeline + validation gates** shipped · first Codex entries | 03 (talents/skills flavor), 04 (affix names), 08 (FTUE) |
| **M3 — Endgame** | 3 new dungeons written (Overdraft, Bogologist's Folly, The Unfinished) · Season model + S1 "The Great Restock" · raid narrative framework · Codex as a browsable feature · living-NPC state flags | 06 (season calendar/rewards), 05 (raid/guild) |
| **M4 — Launch** | Tier-1 localization (transcreation) shipped · pseudo-loc in CI · launch Season (S2) polished · notification tone audit (08) · marketing-facing lore one-pager | 06, 08, 09, loc vendors |
| **M5 — Live** | Seasonal cadence sustained (S3, S4 + Interludes) · community lore (name-a-boss events) · Tier-2 loc · Codex expansions · narrative live-ops rituals | 06 (live calendar) |

### 8.2 Dependencies & risks

| Risk | Impact | Mitigation |
|---|---|---|
| **Tone drift at scale** (many writers, procedural combos) | Voice cohesion breaks — kills Pillar 2 | Voice guide + tone-lint gate in pipeline (§7.2); one lead reviews all bank atoms; sample-audit procedural output weekly |
| **Comedy fatigue** (everything's a joke → nothing lands) | Players tune out flavor | The sincerity beats (§4.2, §5) and awe register (The Hush) — deliberate tonal dynamics, not constant jokes |
| **Loc kills the humor** | Non-EN markets feel flat (esp. DE, our core) | Transcreation budget + per-locale voice bible (§6); pseudo-loc CI; treat DE as co-primary from M1 |
| **Content becomes an eng bottleneck** | Seasons slip; world goes stale | Data-driven pipeline is a *hard requirement,* not nice-to-have (M2 gate) |
| **Narrative decoupled from systems** | Flavor contradicts mechanics (a "gentle" boss that one-shots you) | Content rows reference mechanic keys (§7.1); joint tone+balance review per boss with 03 |
| **Punching-down slip** | Reputational/PR harm; violates our ethics | §2.4 as a build-blocking lint rule + human review on `culturallySensitive` rows |
| **Over-reliance on a few gag NPCs** | Jokes wear out | Living-NPC evolution (§5.4) keeps recurring cast fresh; rotate antagonists seasonally |

### 8.3 KPIs (narrative's measurable job)

Narrative is not "vibes" — it moves numbers. What we own and measure:

- **Shareability:** screenshot/share rate of boss death lines, legendary reveals, funny quests (instrument a share button on these moments). **Target: narrative moments = top-3 shared content types.** This is our organic-acquisition lever.
- **Codex engagement:** % of D7 players who open the Codex; entries read per player. **Target: >40% of retained players engage the Codex** (proxy for world-love → retention).
- **Retention lift from narrative:** A/B flavor-rich vs. flavor-lite cohorts on D7/D30 (Master Plan §9). **Hypothesis: rich-flavor cohort shows measurable D7 lift.**
- **Seasonal return rate:** % of lapsed players who return for a new Season's Act 1. **Target: Seasons are a top re-engagement driver** (§5 is the flywheel).
- **FTUE completion:** % completing Quill Pennant's onboarding (co-owned with 08) — narrative's job is to make the tutorial *fun enough to finish.*
- **Sentiment:** review/community mentions of writing/humor as a *named reason* people love or recommend the game (qualitative, tracked). For a game whose Pillar 2 is the joke, "the writing" appearing in reviews is a direct win condition.
- **Loc quality:** per-locale sentiment parity — non-EN markets should praise the humor at rates comparable to EN. Guards against §6 failure.

---

## Appendix A: Variable Banks

Starter banks for the procedural systems (§4). These are *seed* sets — the pipeline (§7) grows them; every entry is tone-reviewed once, then combines freely.

### A.1 Quest banks

**VERB** — Retrieve · Escort · Investigate · Negotiate With · Apologize To · Reorganize · Evict · Babysit · Appraise · Un-curse · Notarize · Mediate · Recover · Deliver · Reassure · Audit · Silence · Count · Convince · Reunite · Return · Catalogue · Insulate · Drain

**ADJ** — Nervous · Overdue · Haunted · Passive-Aggressive · Mildly Cursed · Unionized · Discount · Ceremonial · Reluctant · Suspicious · Fireproof · Aggressive · Regretful · Very Literal · Newly Sentient · Rent-Controlled · Legally Distinct · Emotionally Available · Alarmingly Large · Bonded

**NOUN** — Chicken · Turnip · Heirloom · Goblin · Ghost · Ledger · Prophecy · Goose · Barrel · Cousin · Skull · Deed · Well · Scarecrow · Statue · Frog · Recipe · Form · Timeshare · Bear · Boot · Notary · Choir · Hoard

**TWIST (optional tail)** — …Before Lunch · …For Legal Reasons · …Again · …This Time Politely · …Without Being Seen · …And Don't Ask Why · …(Terms Apply) · …Before It Notices · …One Last Time · …For Science

### A.2 Item flavor banks

**OPENER — weapon** — "Forged in a fire that meant it" · "It has clubbed exactly one {enemy}" · "Sharp enough for the job, dull enough for the paperwork" · "It does not tap. It concludes" · "Peasant steel, prouder than kings' gold"

**OPENER — armor** — "Chosen for the journey, not the destination" · "It has endured worse than any blade" · "Blocks blows and little else" · "It remembers its last owner. Try not to" · "Fully permitted; carries its own paperwork"

**OPENER — trinket** — "Fortuna owes you nothing and pays it precisely" · "Doubts your enemies so you don't have to" · "The Ledger weighs it in your favor" · "Small magic, large opinions" · "It points toward a future someone lost"

**UNDERCUT (low rarity)** — "It's very damp." · "Still counts." · "Don't ask why." · "You'll look assessed." · "Worth exactly what you paid." · "The chip has seen things."

**LORE (high rarity)** — "It is warmer than metal should be." · "It remembers a name the plaque forgot." · "The odds, today, are honest for you." · "Lighter than it should be, the way an unspoken word is light." · "It doesn't know how to stop."

**SUFFIX (ties to 04's affix names)** — of Consequence · of Mild Renown · of the Long Meeting · of the Firm Handshake · of the Second Opinion · of the Adjourned · of the Small Favor · of First Principles

### A.3 Ambient rotation tags

Every ambient line carries tags so the game can weight by context and mood: `funny` · `tip` · `heart` · `spooky` · `civic` · `awe` · `region:<x>` · `class:<x>`. The client requests a mix (e.g., 60% funny / 25% tip / 15% heart on load screens) so the *rhythm* of the voice — not just individual lines — stays on-brand. **The mix ratio is itself a tone control**, tunable by Live-Ops without new writing.

---

*End of Module 02. The world is in on the joke. Now go break it in gently — and buy Marta a round.*
