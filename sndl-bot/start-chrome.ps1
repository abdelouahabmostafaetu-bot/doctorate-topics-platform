# Opens Chrome/Edge with a debugging port so the bot can reuse your SNDL session.
# Run once, log in to SNDL by hand, then leave the window open.

$paths = @(
  "C:\Program Files\Google\Chrome\Application\chrome.exe",
  "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
  "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
  "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)

$exe = $paths | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $exe) {
  Write-Host "[X] Chrome or Edge not found. Set CHROME_PATH in .env" -ForegroundColor Red
  exit 1
}

$profileDir = Join-Path $PSScriptRoot "chrome-profile"

Write-Host "[>] Browser : $exe" -ForegroundColor Cyan
Write-Host "[>] Profile : $profileDir" -ForegroundColor DarkGray
Write-Host "[>] Port    : 9222" -ForegroundColor DarkGray

Start-Process $exe -ArgumentList @(
  "--remote-debugging-port=9222",
  "--user-data-dir=$profileDir",
  "https://www.sndl.cerist.dz/login.php"
)

Start-Sleep -Seconds 3

try {
  $v = Invoke-RestMethod "http://127.0.0.1:9222/json/version" -TimeoutSec 5
  Write-Host ""
  Write-Host "[OK] Connected: $($v.Browser)" -ForegroundColor Green
} catch {
  Write-Host ""
  Write-Host "[!] Port 9222 not answering yet - wait a few seconds." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "NEXT STEPS" -ForegroundColor Green
Write-Host "  1. Log in to SNDL in the window that just opened." -ForegroundColor Green
Write-Host "  2. Keep that window OPEN." -ForegroundColor Green
Write-Host "  3. In another PowerShell window: npm start" -ForegroundColor Green
