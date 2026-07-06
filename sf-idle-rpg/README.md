# Quest & Cudgel — a Shakes & Fidget–style idle RPG

A small, satirical browser idle-RPG in the spirit of **Shakes & Fidget**, built
entirely on a React stack. Roll a hero, send them on daft quests for gold and
experience, and fight other real players (or NPCs when you're alone) in the
arena. Menu-driven and asynchronous — no real-time netcode required.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Prisma 7 · SQLite ·
Tailwind CSS v4. One language end to end, one codebase for UI *and* server.

---

## Why this shape

Shakes & Fidget is a **PBBG** (persistent browser-based game): stat-based async
combat, PvP against stored character snapshots, a Hall of Fame, a gold loop —
and crucially, **all the game math must live on the server** so players can't
edit their stats in devtools. This project is built that way from day one:

- Every reward and combat outcome is computed in **`src/lib/game.ts`**, which is
  imported *only* by server actions. The browser never decides what you earn.
- Mutations go through **server actions** (`src/lib/actions.ts`) that re-read the
  hero from the database by session, never trusting numbers from the client.

## Project layout

```
prisma/schema.prisma     # Player, Character, QuestLog, BattleLog
src/lib/game.ts          # pure game rules: classes, stats, quests, combat  (server-only)
src/lib/actions.ts       # server actions: createCharacter, goOnQuest, fightArena, abandonHero
src/lib/data.ts          # read helpers: loadCharacter, loadLeaderboard
src/lib/db.ts            # Prisma client (better-sqlite3 driver adapter)
src/lib/session.ts       # cookie-based session (swap for NextAuth later)
src/app/page.tsx         # the dashboard (server component)
src/components/          # CreateHero + ActionButton (client components)
```

## Getting started

```bash
npm install
cp .env.example .env        # DATABASE_URL="file:./dev.db"
npm run db:migrate          # create the SQLite database
npm run dev                 # http://localhost:3000
```

Open two browsers (or a normal + private window) and create a hero in each — the
second hero's arena fights will match against the first. That's the real PvP.

## Gameplay loop

- **Classes** — Warrior (strength/tanky), Mage (intelligence/glass cannon),
  Scout (dexterity/fast & lucky). Each has a primary stat that drives damage.
- **Quests** — the idle earner. Randomised gold + XP, occasional 🍄 drop, scaled
  by level and luck. Enough XP triggers a level-up (stats grow).
- **Arena** — turn-based duel resolved server-side against another real hero
  (falls back to a scaled NPC if you're the only player). Win gold, or lose a
  small stake. Every blow is logged in the Battle Chronicle. Equipped gear
  counts toward both fighters' stats.
- **Magic Shop & equipment** — each hero has a personal shop stocked with
  randomised gear (Common → Legendary, scaled to level). Buy with gold, equip
  into weapon/armor/amulet slots for stat bonuses, sell what you don't need.
  Refresh the stock to reroll the offers.
- **Hall of Fame** — top heroes by level.

## Ideas for where to take it next

- **Auth** — replace the cookie session with NextAuth/Auth.js for real accounts.
- **Guilds** — a `Guild` model + shared raids.
- **Dungeons** — staged multi-fight PvE with boss rewards.
- **Timed quests** — make quests take real minutes (the classic S&F drip),
  resolved on collect.
- **Postgres** — swap the SQLite datasource for Postgres (Neon/Supabase) to
  deploy on Vercel.

## Notes

- The game logic in `src/lib/game.ts` is deliberately dependency-free and pure,
  so it's easy to unit-test and to reason about balance.
- `src/generated/prisma/` and `dev.db` are git-ignored; `npm install` and
  `npm run db:migrate` regenerate them.
