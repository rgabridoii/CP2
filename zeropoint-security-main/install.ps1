# ZeroPoint Security - One-step installer for Windows (PowerShell)
# Usage: .\install.ps1
$ErrorActionPreference = "Stop"

Write-Host "════════════════════════════════════" -ForegroundColor Green
Write-Host "  ZeroPoint Security Installer      " -ForegroundColor Green
Write-Host "════════════════════════════════════" -ForegroundColor Green

# Prerequisites
Write-Host "`n[1/5] Checking prerequisites..." -ForegroundColor Yellow

try { docker --version | Out-Null }
catch {
    Write-Host "Docker Desktop is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Install from: https://www.docker.com/products/docker-desktop"
    exit 1
}

try { docker info 2>&1 | Out-Null }
catch {
    Write-Host "Docker Desktop is not running. Start it and try again." -ForegroundColor Red
    exit 1
}

Write-Host "✓ Docker ready" -ForegroundColor Green

# Environment
Write-Host "`n[2/5] Configuring environment..." -ForegroundColor Yellow

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "!  Created .env from template. Default credentials (admin/admin) are insecure." -ForegroundColor Yellow
    $editNow = Read-Host "   Open .env in Notepad now? (y/N)"
    if ($editNow -eq "y") { notepad .env }
} else {
    Write-Host "✓ .env already exists" -ForegroundColor Green
}

# Pull
Write-Host "`n[3/5] Pulling Greenbone Community Containers (5-15 min)..." -ForegroundColor Yellow
docker compose pull

# Build
Write-Host "`n[4/5] Building ZeroPoint Security application..." -ForegroundColor Yellow
docker compose build

# Start
Write-Host "`n[5/5] Starting all services..." -ForegroundColor Yellow
docker compose up -d

# Done
Write-Host "`n════════════════════════════════════" -ForegroundColor Green
Write-Host "  Installation complete!            " -ForegroundColor Green
Write-Host "════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "Feed sync is running in background (30-60 min for first run)."
Write-Host "Monitor with:    docker compose logs -f gvmd"
Write-Host ""
Write-Host "Once ready, open in browser:"
Write-Host "    http://localhost:3000          (ZeroPoint Security UI)"
Write-Host "    http://localhost:8000/docs     (API documentation)"
Write-Host ""
Write-Host "CHANGE THE DEFAULT PASSWORD before exposing this server to the network."
