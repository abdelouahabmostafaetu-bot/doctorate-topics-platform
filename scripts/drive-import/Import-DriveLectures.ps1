#Requires -Version 5.1
<#
.SYNOPSIS
  Import Google Drive lecture folders into DocMath DZ using Kimi + R2 + MongoDB.

.DESCRIPTION
  1) Optional: download a public/shared Drive folder (gdown or rclone)
  2) Export universities from your site DB
  3) Scan local folders (folder-by-folder tree)
  4) Classify messy names with Kimi K2.6 (Azure deployment)
  5) Upload files to Cloudflare R2 and create Module / LectureResource rows

.EXAMPLE
  .\scripts\drive-import\Import-DriveLectures.ps1 -LocalRoot "D:\lectures-from-drive" -DryRun

.EXAMPLE
  .\scripts\drive-import\Import-DriveLectures.ps1 -DriveUrl "https://drive.google.com/drive/folders/XXXX" -DownloadDir "D:\lectures-from-drive" -Upload
#>
[CmdletBinding()]
param(
  [string]$ProjectRoot = "D:\doctorate-topics-platform",
  [string]$DriveUrl = "",
  [string]$DownloadDir = "D:\lectures-from-drive",
  [string]$LocalRoot = "",
  [switch]$DryRun,
  [switch]$Upload,
  [switch]$SkipClassify,
  [switch]$SkipDownload,
  [double]$MinConfidence = 0.55,
  [int]$LimitFolders = 0,
  [string]$RcloneRemote = "gdrive"
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$msg) {
  Write-Host ""
  Write-Host "==== $msg ====" -ForegroundColor Cyan
}

function Assert-Command([string]$name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Command not found: $name"
  }
}

if (-not (Test-Path -LiteralPath $ProjectRoot)) {
  throw "Project not found: $ProjectRoot"
}
Set-Location -LiteralPath $ProjectRoot
Write-Host "Project: $ProjectRoot" -ForegroundColor Green

Assert-Command "node"
Assert-Command "npx"

# Resolve root folder of files
if ($DriveUrl -and -not $SkipDownload) {
  Write-Step "Download Google Drive folder"
  if (-not (Test-Path -LiteralPath $DownloadDir)) {
    New-Item -ItemType Directory -Path $DownloadDir | Out-Null
  }

  $downloaded = $false

  # Prefer gdown for public folder links
  if (Get-Command "gdown" -ErrorAction SilentlyContinue) {
    Write-Host "Using gdown..."
    & gdown --folder $DriveUrl -O $DownloadDir --remaining-ok
    if ($LASTEXITCODE -eq 0) { $downloaded = $true }
  }
  elseif (Get-Command "python" -ErrorAction SilentlyContinue) {
    Write-Host "Trying: python -m gdown ..."
    & python -m gdown --folder $DriveUrl -O $DownloadDir --remaining-ok
    if ($LASTEXITCODE -eq 0) { $downloaded = $true }
  }

  if (-not $downloaded -and (Get-Command "rclone" -ErrorAction SilentlyContinue)) {
    Write-Host "Using rclone remote '$RcloneRemote' ..."
    # Allow remote-style path: gdrive:MyFolder
    if ($DriveUrl -match '^[A-Za-z0-9_-]+:') {
      & rclone copy $DriveUrl $DownloadDir --progress --create-empty-src-dirs
      if ($LASTEXITCODE -eq 0 -and (Get-ChildItem -LiteralPath $DownloadDir -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 1)) {
        $downloaded = $true
      }
    }
    else {
      Write-Host "rclone needs a remote path like gdrive:FolderName, not only a browser URL." -ForegroundColor Yellow
      Write-Host "Install gdown (pip install gdown) OR download manually then use -LocalRoot." -ForegroundColor Yellow
    }
  }

  if (-not $downloaded) {
    throw @"
Could not download Drive automatically.
Do one of these then re-run with -LocalRoot:
  A) Browser: download the folder ZIP, extract to $DownloadDir
  B) pip install gdown   then re-run with -DriveUrl
  C) rclone config       then -DriveUrl "gdrive:FolderName"
"@
  }

  $LocalRoot = $DownloadDir
}

if (-not $LocalRoot) {
  if (Test-Path -LiteralPath $DownloadDir) { $LocalRoot = $DownloadDir }
}
if (-not $LocalRoot -or -not (Test-Path -LiteralPath $LocalRoot)) {
  throw "Set -LocalRoot to the folder that contains the lecture files (or pass -DriveUrl)."
}

$LocalRoot = (Resolve-Path -LiteralPath $LocalRoot).Path
Write-Host "LocalRoot: $LocalRoot" -ForegroundColor Green

$outDir = Join-Path $ProjectRoot "scripts\drive-import\out"
if (-not (Test-Path -LiteralPath $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

# 1) Universities from site DB
Write-Step "Export universities + specialties from database"
& npx --yes tsx "scripts/drive-import/export-universities.ts"
if ($LASTEXITCODE -ne 0) { throw "export-universities failed" }

# 2) Scan tree folder-by-folder
Write-Step "Scan local folder tree"
& node "scripts/drive-import/scan-tree.mjs" --root $LocalRoot
if ($LASTEXITCODE -ne 0) { throw "scan-tree failed" }

# 3) Kimi classification
if (-not $SkipClassify) {
  Write-Step "Classify folder-by-folder with Kimi K2.6"
  $clsArgs = @(
    "scripts/drive-import/classify-with-kimi.mjs",
    "--min-confidence", "$MinConfidence"
  )
  if ($LimitFolders -gt 0) {
    $clsArgs += @("--limit", "$LimitFolders")
  }
  & node @clsArgs
  if ($LASTEXITCODE -ne 0) { throw "Kimi classify failed" }
}
else {
  Write-Host "SkipClassify: using existing catalog.json" -ForegroundColor Yellow
  if (-not (Test-Path -LiteralPath (Join-Path $outDir "catalog.json"))) {
    throw "catalog.json missing"
  }
}

$catalogPath = Join-Path $outDir "catalog.json"
Write-Host "Review file: $catalogPath" -ForegroundColor Magenta

# 4) Import / dry
if ($Upload -or $DryRun) {
  $modeLabel = if ($Upload -and -not $DryRun) { "Upload to R2 + save DB" } else { "Dry-run import (no R2 write)" }
  Write-Step $modeLabel
  $impArgs = @(
    "--yes", "tsx", "scripts/drive-import/import-catalog.ts",
    "--min-confidence", "$MinConfidence"
  )
  if ($DryRun -or -not $Upload) {
    $impArgs += "--dry"
  }
  & npx @impArgs
  if ($LASTEXITCODE -ne 0) { throw "import-catalog failed" }
}
else {
  Write-Host ""
  Write-Host "Classification done. Next:" -ForegroundColor Yellow
  Write-Host "  1) Open scripts\drive-import\out\catalog.json and spot-check" -ForegroundColor Yellow
  Write-Host "  2) Re-run with -Upload to push files to R2 + database" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Example:" -ForegroundColor Yellow
  Write-Host ("  .\scripts\drive-import\Import-DriveLectures.ps1 -LocalRoot `"{0}`" -Upload" -f $LocalRoot) -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Done. Outputs in: $outDir" -ForegroundColor Green
Write-Host "  universities.json / tree.json / catalog.json / import-report.json" -ForegroundColor Green
