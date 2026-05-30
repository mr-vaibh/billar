#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Section($msg) { Write-Host "`n$msg" -ForegroundColor White }
function Write-Ok($msg)      { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn($msg)    { Write-Host "  [!]  $msg" -ForegroundColor Yellow }
function Write-Fail($msg)    { Write-Host "`n  [X] $msg" -ForegroundColor Red; exit 1 }
function Write-Info($msg)    { Write-Host "  ... $msg" -ForegroundColor Cyan }

# Change to the directory where this script lives
Set-Location -Path $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Billar - One-Click Startup           " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Check Docker is installed
Write-Section "Checking prerequisites..."

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Fail "Docker is not installed. Get it at https://docs.docker.com/get-docker/"
}

# 2. Start Docker Desktop if not running
$dockerReady = $false
try { docker info 2>&1 | Out-Null; $dockerReady = $true } catch {}

if (-not $dockerReady) {
    Write-Info "Docker is not running. Attempting to start Docker Desktop..."

    $dockerDesktopPaths = @(
        "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
        "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe",
        "$env:LOCALAPPDATA\Docker\Docker Desktop.exe"
    )

    $dockerDesktop = $null
    foreach ($path in $dockerDesktopPaths) {
        if (Test-Path $path) { $dockerDesktop = $path; break }
    }

    if (-not $dockerDesktop) {
        Write-Fail "Docker Desktop not found. Please start it manually and re-run this script."
    }

    Start-Process $dockerDesktop
    Write-Info "Waiting for Docker to become ready (this can take ~30 seconds)..."

    $waited = 0
    $maxWait = 120
    while ($waited -lt $maxWait) {
        Start-Sleep -Seconds 3
        $waited += 3
        try {
            docker info 2>&1 | Out-Null
            $dockerReady = $true
            break
        } catch {}
        Write-Host "  ... still waiting ($waited s)" -ForegroundColor DarkGray
    }

    if (-not $dockerReady) {
        Write-Fail "Docker did not become ready after ${maxWait}s. Please start Docker Desktop manually and re-run."
    }
}

Write-Ok "Docker is running"

# 3. Detect Docker Compose
$Compose = $null
try { docker compose version 2>&1 | Out-Null; $Compose = "docker compose" } catch {}
if (-not $Compose) {
    if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
        $Compose = "docker-compose"
    } else {
        Write-Fail "Docker Compose not found. Install Docker Desktop or the compose plugin."
    }
}

Write-Ok "Docker Compose OK ($Compose)"

# 4. Configure environment
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

# 5. Build and start services
Write-Section "Building and starting services (this may take a few minutes on first run)..."

Invoke-Expression "$Compose up -d --build"

# 6. Wait for the app to be ready
Write-Section "Waiting for the app to be ready..."

$AppPort = 3001
$envLines = Get-Content ".env" -ErrorAction SilentlyContinue
foreach ($line in $envLines) {
    if ($line -match "^APP_PORT=(.+)") { $AppPort = $Matches[1].Trim(); break }
}
$Url = "http://localhost:$AppPort"

$attempts = 0
$max = 90
$ready = $false
while ($attempts -lt $max) {
    try {
        Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3 | Out-Null
        $ready = $true
        break
    } catch {
        $attempts++
        if ($attempts % 5 -eq 0) {
            Write-Host "  ... still waiting ($($attempts * 2)s)" -ForegroundColor DarkGray
        }
        Start-Sleep -Seconds 2
    }
}

if (-not $ready) {
    Write-Fail "App did not become healthy after $($max * 2)s.`nRun: $Compose logs billar"
}

# 7. Read credentials and print summary
$adminEmail = "admin@billar.app"
$adminPass  = "change_me_on_first_login"
foreach ($line in $envLines) {
    if ($line -match "^SEED_ADMIN_EMAIL=(.+)")    { $adminEmail = $Matches[1].Trim() }
    if ($line -match "^SEED_ADMIN_PASSWORD=(.+)") { $adminPass  = $Matches[1].Trim() }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Billar is up!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  App:      $Url" -ForegroundColor White
Write-Host "  Login:    $adminEmail" -ForegroundColor White
Write-Host "  Password: $adminPass" -ForegroundColor White
Write-Host ""
Write-Host "  Useful commands:" -ForegroundColor Gray
Write-Host "    $Compose logs -f billar              # app logs" -ForegroundColor Gray
Write-Host "    $Compose logs -f pg_backup           # backup logs" -ForegroundColor Gray
Write-Host "    $Compose exec pg_backup ls /backups  # list backups" -ForegroundColor Gray
Write-Host "    $Compose down                        # stop everything" -ForegroundColor Gray
Write-Host "    $Compose down -v                     # stop + delete all data" -ForegroundColor Gray
Write-Host ""

# 8. Open browser
try {
    Start-Process $Url
    Write-Ok "Browser opened at $Url"
} catch {
    Write-Warn "Could not open browser automatically. Visit $Url manually."
}

Write-Host ""
