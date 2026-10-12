<#
.SYNOPSIS
Serve compiled dist using the shared, restricted Python server (Python 3.10+).
Use npm run dev for source development.
#>
param(
    [int]$Port = 3000,
    [string]$BindAddress = "127.0.0.1"
)
$ErrorActionPreference = "Stop"
$pythonCommand = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCommand) { $pythonCommand = Get-Command py -ErrorAction SilentlyContinue }
if (-not $pythonCommand) { throw "Python 3.10+ is required. Install Python or use npm run preview." }
& $pythonCommand.Source -B (Join-Path $PSScriptRoot "serve.py") --port $Port --host $BindAddress
exit $LASTEXITCODE
