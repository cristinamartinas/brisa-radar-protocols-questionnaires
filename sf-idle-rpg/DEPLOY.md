# Deploying Quest & Cudgel

The app is a standard Next.js 16 App Router project backed by **Postgres** (via
Prisma 7 + the `pg` driver adapter). Two supported paths:

- **[Docker self-host](#option-a--docker-self-host-one-command)** — one command
  brings up the game *and* its database on any machine with Docker. Best for
  running it yourself.
- **[Vercel + Neon](#option-b--vercel--neon-hosted)** — a managed, public URL on
  free tiers. Best for sharing it on the internet.

The code, migrations, and build pipeline are already wired for both.

> The Next.js app lives in the **`sf-idle-rpg/`** subdirectory of this repo.
> Wherever a host asks for a "root directory," use `sf-idle-rpg`.

---

## Option A — Docker self-host (one command)

Everything is containerized: a multi-stage `Dockerfile` builds a production
image, and `docker-compose.yml` runs it alongside a Postgres 16 service.
Migrations are applied automatically when the app container starts, so there is
no manual DB setup.

```bash
cd sf-idle-rpg
docker compose up --build      # build the image + start app and Postgres
# → open http://localhost:3000 and register a hero
```

That's it. Notes:

- **Data persists** in the named `qc-pgdata` volume across restarts. To wipe and
  start fresh: `docker compose down -v`.
- **Migrations on start:** `docker-entrypoint.sh` runs `prisma migrate deploy`
  before launching the server. It's idempotent — restarting is always safe, and
  a schema change ships simply by adding a migration and rebuilding.
- **No database at build time:** the image builds with a placeholder
  `DATABASE_URL`; the real connection is only needed at runtime and is provided
  by compose (`postgresql://questcudgel:questcudgel@db:5432/questcudgel`).
- **Change the port** by editing the `ports:` mapping in `docker-compose.yml`
  (e.g. `"8080:3000"`).
- **Deploy the image anywhere** (a VPS, Fly.io, Render, a home server): build it
  with `docker build -t quest-cudgel .`, point `DATABASE_URL` at any reachable
  Postgres, publish port 3000, and run it. The entrypoint migrates on boot.
- For stable Server Actions across container restarts, set
  `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` (see the commented line in the compose
  file; generate with `openssl rand -base64 32`).

---

## Option B — Vercel + Neon (hosted)

### 1. Create a Postgres database (Neon — free tier)

1. Sign in at <https://neon.tech> and create a project (pick a region near your users).
2. In the project's **Connection Details**, copy the **Pooled** connection string
   (it contains `-pooler`). It looks like:
   ```
   postgresql://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require
   ```
   Keep `?sslmode=require` on the end. Use the **pooled** string — serverless
   functions open many short-lived connections and the pooler prevents exhaustion.

_(Supabase works too: use its "Connection pooling" / Transaction-mode string.)_

### 2. Import the repo into Vercel

1. At <https://vercel.com/new>, import this GitHub repository.
2. **Root Directory:** set to `sf-idle-rpg`.
3. **Framework Preset:** Next.js (auto-detected).
4. **Build/Install commands:** leave the defaults — `package.json` already does the
   right thing:
   - `postinstall` → `prisma generate`
   - `build` → `prisma generate && prisma migrate deploy && next build`
     (so migrations run automatically on every deploy).

### 3. Set environment variables (Vercel → Project → Settings → Environment Variables)

| Name | Value | Environments |
|------|-------|--------------|
| `DATABASE_URL` | the Neon **pooled** string from step 1 | Production, Preview, Development |

That's the only required variable. `NODE_ENV=production` is set by Vercel
automatically, which turns on the `Secure` flag for the session cookie.

Optional but recommended for stable Server Actions across deploys:

| Name | Value |
|------|-------|
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | any fixed 32-byte base64 string (generate with `openssl rand -base64 32`) |

### 4. Deploy

Click **Deploy**. On build, Vercel runs `prisma migrate deploy`, which applies
`prisma/migrations/` to your Neon database (creating all tables on the first
deploy). When it finishes you get a live URL — register an account and play.

---

## Local development

Dev now uses Postgres too (single provider). Two easy options:

**A. Local Postgres via Docker**
```bash
docker run --name qc-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
cp .env.example .env   # DATABASE_URL already points at localhost:5432
npm install
npm run db:migrate     # prisma migrate deploy
npm run dev            # http://localhost:3000
```

**B. A Neon dev branch** — create a separate Neon branch and put its connection
string in `.env`. Then `npm install && npm run db:migrate && npm run dev`.

## Notes / operations

- **Migrations** are applied automatically at build (`prisma migrate deploy`).
  To add a schema change: edit `prisma/schema.prisma`, create a migration
  (`prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script`),
  commit it, and the next deploy applies it. Migrations are additive by policy.
- **Connection pooling:** always use the pooled Neon string in serverless. The
  Prisma client is a warm singleton (`src/lib/db.ts`) to reuse connections.
- **Server authority & data integrity** are already in place: all game math is
  server-side, combat is seeded/deterministic, and every currency move is
  written to the append-only `CurrencyLedger`.
- **Cost:** Neon + Vercel free tiers comfortably cover early traffic.
