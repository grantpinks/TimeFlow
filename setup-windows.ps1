# AI Development Environment Setup for Windows
# Run this script in PowerShell as Administrator

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "AI Development Environment Setup" -ForegroundColor Cyan
Write-Host "Setting up Cursor + Python + Node.js + Git" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit 1
}

# Check for winget
Write-Host "Checking Windows Package Manager (winget)..." -ForegroundColor Yellow
$wingetExists = Get-Command winget -ErrorAction SilentlyContinue
if ($null -eq $wingetExists) {
    Write-Host "ERROR: winget not found. Please update Windows or install manually." -ForegroundColor Red
    Write-Host "Visit: https://aka.ms/getwinget" -ForegroundColor Yellow
    pause
    exit 1
}
Write-Host "OK: winget is installed" -ForegroundColor Green

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Installing Required Software..." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Install Python
Write-Host "[1/6] Installing Python 3.12..." -ForegroundColor Yellow
winget install --id Python.Python.3.12 --silent --accept-package-agreements --accept-source-agreements
Write-Host "Done with Python" -ForegroundColor Green

# Install Node.js
Write-Host ""
Write-Host "[2/6] Installing Node.js LTS..." -ForegroundColor Yellow
winget install --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
Write-Host "Done with Node.js" -ForegroundColor Green

# Install Git
Write-Host ""
Write-Host "[3/6] Installing Git..." -ForegroundColor Yellow
winget install --id Git.Git --silent --accept-package-agreements --accept-source-agreements
Write-Host "Done with Git" -ForegroundColor Green

# Install Cursor
Write-Host ""
Write-Host "[4/6] Installing Cursor IDE..." -ForegroundColor Yellow
winget install --id Cursor.Cursor --silent --accept-package-agreements --accept-source-agreements
Write-Host "Done with Cursor" -ForegroundColor Green

# Install Windows Terminal
Write-Host ""
Write-Host "[5/6] Installing Windows Terminal..." -ForegroundColor Yellow
winget install --id Microsoft.WindowsTerminal --silent --accept-package-agreements --accept-source-agreements
Write-Host "Done with Windows Terminal" -ForegroundColor Green

# Install Visual Studio Code
Write-Host ""
Write-Host "[6/6] Installing VS Code..." -ForegroundColor Yellow
winget install --id Microsoft.VisualStudioCode --silent --accept-package-agreements --accept-source-agreements
Write-Host "Done with VS Code" -ForegroundColor Green

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Configuring Environment..." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Set PowerShell execution policy
Write-Host "Setting PowerShell execution policy..." -ForegroundColor Yellow
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
Write-Host "OK: Execution policy set" -ForegroundColor Green

# Refresh environment variables
Write-Host ""
Write-Host "Refreshing environment variables..." -ForegroundColor Yellow
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
Write-Host "OK: Environment refreshed" -ForegroundColor Green

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Installation Complete!" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "IMPORTANT: Restart your terminal for changes to take effect" -ForegroundColor Yellow
Write-Host ""
Write-Host "After restarting, verify installation:" -ForegroundColor Cyan
Write-Host "  python --version" -ForegroundColor White
Write-Host "  node --version" -ForegroundColor White
Write-Host "  git --version" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Open Cursor from Start Menu" -ForegroundColor White
Write-Host "  2. Sign up for Cursor account" -ForegroundColor White
Write-Host "  3. Enable Claude Code integration" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
