#!/bin/sh
set -e

# Release-phase DB setup before the server starts (see ADR 0001): apply migrations
# then seed reference data. Seed is idempotent, so a container restart is safe.
# This runs once per container start, NOT from the app runtime.

echo "→ Applying migrations (prisma migrate deploy)…"
npx prisma migrate deploy

echo "→ Seeding reference data (idempotent)…"
# Use the compiled seed (node dist), not tsx — tsx is a dev dependency and isn't
# present in the production image (`npm ci --omit=dev`).
npm run prisma:seed:prod

echo "→ Starting API (serves client/dist on the same origin)…"
exec node dist/main.js
