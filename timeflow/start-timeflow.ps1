# Quick start script to launch TimeFlow backend, frontend, and open the app in your browser.

param(
  [switch]$NoBrowser
)

function Start-Server {
  param(
    [string]$Name,
    [string]$WorkingDir,
    [string]$Command
  )

  Write-Host "Starting $Name..." -ForegroundColor Cyan
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location `"$WorkingDir`"; $Command"
}

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# Backend
Start-Server -Name "Backend" -WorkingDir (Join-Path $repoRoot "apps\backend") -Command "pnpm dev"

# Frontend
Start-Server -Name "Frontend" -WorkingDir (Join-Path $repoRoot "apps\web") -Command "pnpm dev"

if (-not $NoBrowser) {
  Write-Host "Opening http://localhost:3000 ..." -ForegroundColor Green
  Start-Process "http://localhost:3000"
} else {
  Write-Host "Browser launch skipped (NoBrowser flag set)." -ForegroundColor Yellow
}

Write-Host "Servers are starting in new windows." -ForegroundColor Green
