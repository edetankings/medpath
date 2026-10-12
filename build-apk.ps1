<#
.SYNOPSIS
  MedPath Android APK Automated Build Script
.DESCRIPTION
  Builds Vite React bundle, synchronizes Capacitor Android platform,
  and compiles the debug APK via Gradle or provides Android Studio launch options.
#>

$ErrorActionPreference = "Stop"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  MedPath — Android APK Build Process" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# Step 1: Build React Production Bundle
Write-Host "`n[1/3] Compiling React + TypeScript Web Bundle (Vite)..." -ForegroundColor Yellow
cmd.exe /c "npm run build"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[X] Vite build failed! Check errors above." -ForegroundColor Red
    exit $LASTEXITCODE
}
Write-Host "[✓] Web bundle generated successfully in dist/" -ForegroundColor Green

# Step 2: Sync Capacitor Android Project
Write-Host "`n[2/3] Synchronizing assets to Android project via Capacitor..." -ForegroundColor Yellow
cmd.exe /c "npx cap sync android"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[X] Capacitor sync failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}
Write-Host "[✓] Android project synced successfully." -ForegroundColor Green

# Step 3: Check Java / Gradle compilation
Write-Host "`n[3/3] Compiling Native Android APK..." -ForegroundColor Yellow

$javaCmd = Get-Command java -ErrorAction SilentlyContinue
$gradlew = Join-Path $PSScriptRoot "android\gradlew.bat"

if ($javaCmd -and (Test-Path $gradlew)) {
    Write-Host "Found Java at $($javaCmd.Source). Invoking Gradle assembleDebug..." -ForegroundColor Cyan
    Push-Location (Join-Path $PSScriptRoot "android")
    cmd.exe /c ".\gradlew.bat assembleDebug"
    $gradleExit = $LASTEXITCODE
    Pop-Location

    $apkPath = Join-Path $PSScriptRoot "android\app\build\outputs\apk\debug\app-debug.apk"
    if (Test-Path $apkPath) {
        Write-Host "`n================================================================" -ForegroundColor Green
        Write-Host "  🎉 SUCCESS: APK BUILD COMPLETE!" -ForegroundColor Green
        Write-Host "================================================================" -ForegroundColor Green
        Write-Host "  APK Location: $apkPath" -ForegroundColor White
        Write-Host "  You can transfer this APK directly to any Android device or emulator." -ForegroundColor Gray
        Write-Host "================================================================" -ForegroundColor Green
        exit 0
    }
}

Write-Host "`nNote: Android SDK or Gradle build tools require environment setup or Android Studio." -ForegroundColor Yellow
Write-Host "You have two immediate options to generate/run the APK:" -ForegroundColor White
Write-Host "  Option A (Recommended): Run 'npx cap open android' to open in Android Studio" -ForegroundColor Cyan
Write-Host "         Then click Build -> Build Bundle(s) / APK(s) -> Build APK(s)" -ForegroundColor Gray
Write-Host "  Option B: Ensure ANDROID_HOME is set to your Android SDK and run 'build-apk.ps1' again." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
