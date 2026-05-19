#!/bin/bash
set -e

echo "╔════════════════════════════════╗"
echo "║        Billar - Bill Maker     ║"
echo "╚════════════════════════════════╝"

# Ensure data directories exist
BILLS_DIR="${BILLS_DIR:-./bills}"
TEMPLATES_DIR="${TEMPLATES_DIR:-./templates}"

mkdir -p "$BILLS_DIR" "$TEMPLATES_DIR"
echo "✓ Data directories ready: $BILLS_DIR, $TEMPLATES_DIR"

if [ "$NODE_ENV" = "production" ]; then
  echo "→ Starting in production mode..."
  node server.js
else
  echo "→ Starting in development mode..."
  # Install deps if node_modules is missing
  if [ ! -d "node_modules" ]; then
    echo "→ Installing dependencies..."
    npm install
  fi
  npm run dev
fi
