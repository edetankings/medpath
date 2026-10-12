# Tests use temporary fixtures. No application database is opened.
$ErrorActionPreference = "Stop"
Push-Location $PSScriptRoot
try {
    & python -B -m unittest discover -s tests -p "test_static_servers.py" -v
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & node --test tests/vite-security.test.mjs
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
