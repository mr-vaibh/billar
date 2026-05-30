#!/usr/bin/env bash
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m'

info()    { echo -e "  ${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "  ${YELLOW}[!]${NC}  $*"; }
section() { echo -e "\n${BOLD}$*${NC}"; }
die()     { echo -e "\n  ${RED}[X]${NC} $*" >&2; exit 1; }
log()     { echo -e "  ${CYAN}...${NC} $*"; }

# Change to the directory where this script lives
cd "$(dirname "$0")"

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}   Billar - One-Click Startup           ${NC}"
echo -e "${CYAN}========================================${NC}"

# ── 1. Check Docker is installed ─────────────────────────────────────────────
section "Checking prerequisites..."

command -v docker >/dev/null 2>&1 || die "Docker is not installed. Get it at https://docs.docker.com/get-docker/"

# ── 2. Start Docker if not running ───────────────────────────────────────────
if ! docker info >/dev/null 2>&1; then
    log "Docker is not running. Attempting to start it..."

    OS="$(uname -s)"
    case "$OS" in
        Darwin)
            open -a Docker 2>/dev/null || die "Could not start Docker Desktop. Please start it manually."
            ;;
        Linux)
            if command -v systemctl >/dev/null 2>&1; then
                sudo systemctl start docker 2>/dev/null || die "Could not start Docker. Try: sudo systemctl start docker"
            elif command -v service >/dev/null 2>&1; then
                sudo service docker start 2>/dev/null || die "Could not start Docker. Try: sudo service docker start"
            else
                die "Docker is not running. Please start it manually."
            fi
            ;;
        MINGW*|CYGWIN*|MSYS*)
            DOCKER_DESKTOP="/c/Program Files/Docker/Docker/Docker Desktop.exe"
            if [ -f "$DOCKER_DESKTOP" ]; then
                start "" "$DOCKER_DESKTOP" 2>/dev/null || true
            else
                die "Docker Desktop not found. Please start it manually."
            fi
            ;;
        *)
            die "Docker is not running. Please start it manually."
            ;;
    esac

    log "Waiting for Docker to become ready (this can take ~30 seconds)..."
    waited=0
    max_wait=120
    while ! docker info >/dev/null 2>&1; do
        sleep 3
        waited=$((waited + 3))
        if [ "$waited" -ge "$max_wait" ]; then
            die "Docker did not become ready after ${max_wait}s. Please start Docker manually and re-run."
        fi
        echo -e "  ${GRAY}... still waiting (${waited}s)${NC}"
    done
fi

info "Docker is running"

# ── 3. Detect Docker Compose ─────────────────────────────────────────────────
if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  die "Docker Compose not found. Install Docker Desktop or the compose plugin."
fi

info "Docker Compose OK ($($COMPOSE version --short 2>/dev/null || echo 'detected'))"

# ── 4. Configure environment ──────────────────────────────────────────────────
section "Configuring environment..."

if [ ! -f .env ]; then
  cp .env.example .env

  if command -v openssl >/dev/null 2>&1; then
    SECRET=$(openssl rand -hex 32)
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

# ── 5. Build and start services ───────────────────────────────────────────────
section "Building and starting services (this may take a few minutes on first run)..."

$COMPOSE up -d --build

# ── 6. Wait for the app to be ready ──────────────────────────────────────────
section "Waiting for the app to be ready..."

APP_PORT=$(grep -E '^APP_PORT=' .env 2>/dev/null | cut -d= -f2 || echo 3000)
URL="http://localhost:${APP_PORT}"

ATTEMPTS=0
MAX=90
until curl -sf "$URL" >/dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge "$MAX" ]; then
    die "App did not become healthy after $((MAX * 2))s.\nRun: $COMPOSE logs billar"
  fi
  if [ $((ATTEMPTS % 5)) -eq 0 ]; then
    echo -e "  ${GRAY}... still waiting ($((ATTEMPTS * 2))s)${NC}"
  fi
  sleep 2
done

# ── 7. Print summary ─────────────────────────────────────────────────────────
ADMIN_EMAIL=$(grep -E '^SEED_ADMIN_EMAIL=' .env 2>/dev/null | cut -d= -f2 || echo 'admin@billar.app')
ADMIN_PASS=$(grep -E '^SEED_ADMIN_PASSWORD=' .env 2>/dev/null | cut -d= -f2 || echo 'change_me_on_first_login')

echo ""
echo -e "${BOLD}${GREEN}========================================${NC}"
echo -e "${BOLD}${GREEN}   Billar is up!${NC}"
echo -e "${BOLD}${GREEN}========================================${NC}"
echo ""
echo -e "  App:      ${BOLD}${URL}${NC}"
echo -e "  Login:    ${ADMIN_EMAIL}"
echo -e "  Password: ${ADMIN_PASS}"
echo ""
echo -e "${GRAY}  Useful commands:"
echo -e "    $COMPOSE logs -f billar              # app logs"
echo -e "    $COMPOSE logs -f pg_backup           # backup logs"
echo -e "    $COMPOSE exec pg_backup ls /backups  # list backups"
echo -e "    $COMPOSE down                        # stop everything"
echo -e "    $COMPOSE down -v                     # stop + delete all data${NC}"
echo ""

# ── 8. Open browser (best-effort) ────────────────────────────────────────────
OS="$(uname -s)"
case "$OS" in
  Darwin)  open "$URL" 2>/dev/null || true ;;
  Linux)   xdg-open "$URL" 2>/dev/null || true ;;
  MINGW*|CYGWIN*|MSYS*) start "$URL" 2>/dev/null || true ;;
esac
