# يفتح كروم بمنفذ تحكّم حتى يستعمله البوت.
# شغّله مرّة واحدة، ثم سجّل دخولك إلى SNDL بيدك واترك النافذة مفتوحة.

$paths = @(
  "C:\Program Files\Google\Chrome\Application\chrome.exe",
  "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
  "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
  "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)

$exe = $paths | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $exe) {
  Write-Host "X  لم أجد Chrome أو Edge" -ForegroundColor Red
  exit 1
}

$profile = Join-Path $PSScriptRoot "chrome-profile"
Write-Host "->  أفتح: $exe" -ForegroundColor Cyan
Write-Host "->  الملف الشخصي: $profile" -ForegroundColor DarkGray

Start-Process $exe -ArgumentList @(
  "--remote-debugging-port=9222",
  "--user-data-dir=$profile",
  "https://www.sndl.cerist.dz/login.php"
)

Write-Host ""
Write-Host "OK  سجّل دخولك إلى SNDL في النافذة التي فُتحت، ثم اتركها مفتوحة." -ForegroundColor Green
Write-Host "OK  بعدها في نافذة أخرى:  npm start" -ForegroundColor Green
