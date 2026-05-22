#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Section($msg) { Write-Host "`n$msg" -ForegroundColor White }
function Write-Ok($msg)      { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn($msg)    { Write-Host "  [!]  $msg" -ForegroundColor Yellow }
function Write-Fail($msg)    { Write-Host "`n  [X] $msg" -ForegroundColor Red; exit 1 }

Write-Section "Checking prerequisites..."

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Fail "Docker is not installed. Get it at https://docs.docker.com/get-docker/"
}

try { docker info 2>&1 | Out-Null } catch {
    Write-Fail "Docker is not running. Please start Docker Desktop and re-run this script."
}

# Prefer 'docker compose' (v2), fall back to 'docker-compose' (v1)
$Compose = $null
try { docker compose version 2>&1 | Out-Null; $Compose = "docker compose" } catch {}
if (-not $Compose) {
    if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
        $Compose = "docker-compose"
    } else {
        Write-Fail "Docker Compose not found. Install Docker Desktop or the compose plugin."
    }
}

Write-Ok "Docker OK"
Write-Ok "Docker Compose OK ($Compose)"

Write-Section "Configuring environment..."

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"

    # Auto-generate SESSION_SECRET using .NET crypto
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    $secret = ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""

    $content = Get-Content ".env" -Raw
    $content = $content -replace "change_me_min_32_chars", $secret
    Set-Content ".env" -Value $content -NoNewline

    Write-Ok "Generated SESSION_SECRET"
    Write-Ok ".env created from .env.example"
    Write-Warn "Review .env before deploying to production (credentials, email, admin password)"
} else {
    Write-Ok ".env already exists - skipping"
}

Write-Section "Building and starting services..."

Invoke-Expression "$Compose up -d --build"

Write-Section "Waiting for the app to be ready..."

# Read APP_PORT from .env
$AppPort = 3000
$envLines = Get-Content ".env" -ErrorAction SilentlyContinue
foreach ($line in $envLines) {
    if ($line -match "^APP_PORT=(.+)") { $AppPort = $Matches[1].Trim(); break }
}
$Url = "http://localhost:$AppPort"

$attempts = 0
$max = 60
$ready = $false
while ($attempts -lt $max) {
    try {
        Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3 | Out-Null
        $ready = $true
        break
    } catch {
        $attempts++
        Start-Sleep -Seconds 2
    }
}

if (-not $ready) {
    Write-Fail "App did not become healthy after $($max * 2)s.`nRun: $Compose logs billar"
}

# Read admin credentials from .env for the welcome message
$adminEmail = "admin@billar.app"
$adminPass  = "change_me_on_first_login"
foreach ($line in $envLines) {
    if ($line -match "^SEED_ADMIN_EMAIL=(.+)")    { $adminEmail = $Matches[1].Trim() }
    if ($line -match "^SEED_ADMIN_PASSWORD=(.+)") { $adminPass  = $Matches[1].Trim() }
}

Write-Host ""
Write-Host "Billar is up!" -ForegroundColor Green
Write-Host ""
Write-Host "  App:      $Url"
Write-Host "  Login:    $adminEmail"
Write-Host "  Password: $adminPass"
Write-Host ""
Write-Host "  Useful commands:"
Write-Host "    $Compose logs -f billar            # app logs"
Write-Host "    $Compose logs -f pg_backup         # backup logs"
Write-Host "    $Compose exec pg_backup ls /backups  # list backups"
Write-Host "    $Compose down                      # stop everything"
Write-Host "    $Compose down -v                   # stop + delete all data"
Write-Host ""
