#!/bin/sh
# Apply any pending database migrations, then hand off to the app (CMD).
# `migrate deploy` is idempotent — it only runs migrations not yet recorded in
# the target database, so restarting the container is always safe.
set -e

echo "[entrypoint] Waiting for the database and applying migrations…"
node_modules/.bin/prisma migrate deploy

echo "[entrypoint] Migrations up to date. Launching Quest & Cudgel."
exec "$@"
