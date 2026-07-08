# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Quest & Cudgel — production image.
#
# Multi-stage: install deps → build the Next.js app → ship a lean runner. All
# stages use Alpine (musl) so the Prisma engines copied between them match.
# Database migrations are applied at container START (see docker-entrypoint.sh),
# NOT at build time — so the image builds with no database in reach.
# ---------------------------------------------------------------------------

# --- deps: install node_modules (postinstall runs `prisma generate`) ---------
FROM node:22-alpine AS deps
WORKDIR /app
# Prisma's postinstall generate needs the schema + config, so bring them in
# before `npm ci`.
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

# --- builder: generate the client and compile the Next.js production build ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# A placeholder satisfies any DATABASE_URL read at module load; no real database
# is touched during the build (migrations happen at container start instead).
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npx next build

# --- runner: the image that actually runs in production ----------------------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# `prisma` is a devDependency and is required at startup for `migrate deploy`,
# so we carry the full node_modules (with the matching musl engines) rather than
# a prod-only prune. Reliability over image size for a self-hosted game.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/package.json ./package.json
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# Run as an unprivileged user.
RUN addgroup -g 1001 -S nodejs \
  && adduser -u 1001 -S nextjs -G nodejs \
  && chmod +x ./docker-entrypoint.sh \
  && chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0"]
