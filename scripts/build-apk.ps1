# Собирает подписанный release APK и кладёт его в dist/.
#
# Использование:
#   powershell -ExecutionPolicy Bypass -File scripts/build-apk.ps1
#
# Требуется:
#   - Node.js 20+
#   - JDK 21 (JAVA_HOME или %USERPROFILE%\.jdks\jdk-21*)
#   - Android SDK (ANDROID_HOME или %LOCALAPPDATA%\Android\Sdk)
#   - android\keystore.properties + android\keystore\aurum-release.jks

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Resolve-Jdk {
  if ($env:JAVA_HOME -and (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
    return $env:JAVA_HOME
  }
  $candidate = Get-ChildItem "$env:USERPROFILE\.jdks" -Directory -Filter "jdk-21*" -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending |
    Select-Object -First 1
  if ($candidate) { return $candidate.FullName }
  throw "JDK 21 не найден. Установи JDK 21 и задай JAVA_HOME."
}

function Resolve-AndroidSdk {
  if ($env:ANDROID_HOME -and (Test-Path $env:ANDROID_HOME)) { return $env:ANDROID_HOME }
  if ($env:ANDROID_SDK_ROOT -and (Test-Path $env:ANDROID_SDK_ROOT)) { return $env:ANDROID_SDK_ROOT }
  $fallback = "$env:LOCALAPPDATA\Android\Sdk"
  if (Test-Path $fallback) { return $fallback }
  throw "Android SDK не найден. Задай ANDROID_HOME."
}

$jdk = Resolve-Jdk
$sdk = Resolve-AndroidSdk
$env:JAVA_HOME = $jdk
$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$env:Path = "$jdk\bin;$sdk\platform-tools;$sdk\build-tools\36.0.0;$env:Path"

if (-not (Test-Path "android\keystore.properties")) {
  throw "Нет android\keystore.properties — release APK нельзя подписать. Смотри README, раздел «Сборка APK»."
}

$version = (Get-Content "package.json" -Raw | ConvertFrom-Json).version
Write-Host "==> Сборка веб-части (static export)" -ForegroundColor Cyan
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw "next build завершился с ошибкой" }

# Демо-данные не должны попасть в APK.
if (Test-Path "out\demo.json") { Remove-Item "out\demo.json" -Force }

Write-Host "==> Синхронизация Capacitor" -ForegroundColor Cyan
& npx.cmd cap sync android
if ($LASTEXITCODE -ne 0) { throw "cap sync завершился с ошибкой" }

Write-Host "==> Сборка release APK" -ForegroundColor Cyan
Push-Location "android"
try {
  & .\gradlew.bat assembleRelease --no-daemon
  if ($LASTEXITCODE -ne 0) { throw "gradlew assembleRelease завершился с ошибкой" }
} finally {
  Pop-Location
}

$apk = "android\app\build\outputs\apk\release\app-release.apk"
if (-not (Test-Path $apk)) { throw "APK не найден: $apk" }

Write-Host "==> Проверка подписи" -ForegroundColor Cyan
& "$sdk\build-tools\36.0.0\apksigner.bat" verify --print-certs $apk
if ($LASTEXITCODE -ne 0) { throw "Подпись APK не прошла проверку" }

# Имя артефакта берём из src\lib\version.ts — единый источник версии для интерфейса и сборок.
$versionSource = Get-Content "src\lib\version.ts" -Raw
if ($versionSource -notmatch 'APP_VERSION = "V([^"]+)"') {
  throw "Не удалось прочитать APP_VERSION из src\lib\version.ts"
}
$display = $Matches[1]
$isBeta = $display.EndsWith(" Beta")
$short = $display -replace " Beta$", ""
$suffix = if ($isBeta) { "-Beta" } else { "" }

New-Item -ItemType Directory -Force -Path "dist" | Out-Null
Get-ChildItem "dist\Aurum-*.apk" -ErrorAction SilentlyContinue | Remove-Item -Force
$target = "dist\Aurum-$short$suffix.apk"
Copy-Item $apk $target -Force

$mb = [math]::Round((Get-Item $target).Length / 1MB, 2)
Write-Host ""
Write-Host "Готово: $target ($mb МБ)" -ForegroundColor Green
