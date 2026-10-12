<#
.SYNOPSIS
  MedPath Python Backend Launcher
#>

$ErrorActionPreference = "Continue"

# Candidate Python paths
$pythonCandidates = @(
    "python",
    "py",
    "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
    "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe",
    "C:\Program Files\Python312\python.exe",
    "C:\Python312\python.exe"
)

$pyExe = $null
foreach ($cand in $pythonCandidates) {
    if (Get-Command $cand -ErrorAction SilentlyContinue) {
        $pyExe = $cand
        break
    } elseif (Test-Path $cand) {
        $pyExe = $cand
        break
    }
}

if (-not $pyExe) {
    Write-Host "[X] Python executable not found. Please install Python 3.10+." -ForegroundColor Red
    exit 1
}

Write-Host "Starting MedPath Python Backend using: $pyExe" -ForegroundColor Cyan
& $pyExe (Join-Path $PSScriptRoot "backend\run.py") $args
