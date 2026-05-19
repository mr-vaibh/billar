#!/bin/sh
set -e

echo "→ Running database migrations..."
node_modules/.bin/prisma migrate deploy

echo "→ Seeding database (no-op if already seeded)..."
node_modules/.bin/tsx prisma/seed.ts || true

echo "→ Starting server..."
exec node server.js
