#!/usr/bin/env bash
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "  ${GREEN}✓${NC} $*"; }
warn()    { echo -e "  ${YELLOW}!${NC} $*"; }
section() { echo -e "\n${BOLD}$*${NC}"; }
die()     { echo -e "\n  ${RED}✗${NC} $*" >&2; exit 1; }

section "Checking prerequisites..."

command -v docker >/dev/null 2>&1 || die "Docker is not installed. Get it at https://docs.docker.com/get-docker/"
docker info >/dev/null 2>&1      || die "Docker is not running. Please start Docker and re-run this script."

# Prefer 'docker compose' (v2), fall back to 'docker-compose' (v1)
if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  die "Docker Compose not found. Install Docker Desktop or the compose plugin."
fi

info "Docker OK"
info "Docker Compose OK ($($COMPOSE version --short 2>/dev/null || echo 'v1'))"

section "Configuring environment..."

if [ ! -f .env ]; then
  cp .env.example .env

  # Auto-generate SESSION_SECRET
  if command -v openssl >/dev/null 2>&1; then
    SECRET=$(openssl rand -hex 32)
    # macOS sed needs a backup extension; Linux does not — handle both
    if sed --version 2>/dev/null | grep -q GNU; then
      sed -i "s/change_me_min_32_chars/$SECRET/" .env
    else
      sed -i '' "s/change_me_min_32_chars/$SECRET/" .env
    fi
    info "Generated SESSION_SECRET"
  else
    warn "openssl not found — set SESSION_SECRET in .env before going to production"
  fi

  info ".env created from .env.example"
  warn "Review .env before deploying to production (credentials, email, admin password)"
else
  info ".env already exists — skipping"
fi

section "Building and starting services..."

$COMPOSE up -d --build

section "Waiting for the app to be ready..."

APP_PORT=$(grep -E '^APP_PORT=' .env 2>/dev/null | cut -d= -f2 || echo 3000)
URL="http://localhost:${APP_PORT}"

ATTEMPTS=0
MAX=60
until curl -sf "$URL" >/dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge "$MAX" ]; then
    die "App did not become healthy after ${MAX}s.\nRun: $COMPOSE logs billar"
  fi
  sleep 2
done

# Read seeded admin credentials from .env for the welcome message
ADMIN_EMAIL=$(grep -E '^SEED_ADMIN_EMAIL=' .env 2>/dev/null | cut -d= -f2 || echo 'admin@billar.app')
ADMIN_PASS=$(grep -E '^SEED_ADMIN_PASSWORD=' .env 2>/dev/null | cut -d= -f2 || echo 'change_me_on_first_login')

echo ""
echo -e "${BOLD}${GREEN}Billar is up!${NC}"
echo ""
echo -e "  App:      ${BOLD}${URL}${NC}"
echo -e "  Login:    ${ADMIN_EMAIL}"
echo -e "  Password: ${ADMIN_PASS}"
echo ""
echo "  Useful commands:"
echo "    $COMPOSE logs -f billar      # app logs"
echo "    $COMPOSE logs -f pg_backup   # backup logs"
echo "    $COMPOSE exec pg_backup ls /backups  # list backups"
echo "    $COMPOSE down                # stop everything"
echo "    $COMPOSE down -v             # stop + delete all data"
echo ""
