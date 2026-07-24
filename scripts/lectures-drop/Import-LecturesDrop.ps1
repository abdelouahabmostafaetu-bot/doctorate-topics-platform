#Requires -Version 5.1
<#
.SYNOPSIS
  Scaffold university folders + import lecture PDFs incrementally (no duplicates).

.EXAMPLE
  .\scripts\lectures-drop\Import-LecturesDrop.ps1 -Root "D:\lectures-library" -ScaffoldOnly

.EXAMPLE
  .\scripts\lectures-drop\Import-LecturesDrop.ps1 -Root "D:\lectures-library" -DryRun

.EXAMPLE
  .\scripts\lectures-drop\Import-LecturesDrop.ps1 -Root "D:\lectures-library" -Upload
#>
[CmdletBinding()]
param(
  [string]$ProjectRoot = "D:\doctorate-topics-platform",
  [string]$Root = "D:\lectures-library",
  [switch]$ScaffoldOnly,
  [switch]$DryRun,
  [switch]$Upload,
  [string]$Univ = ""
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ProjectRoot)) {
  throw "Project not found: $ProjectRoot"
}
Set-Location -LiteralPath $ProjectRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "node not found" }
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) { throw "npx not found" }

if (-not (Test-Path -LiteralPath $Root)) {
  New-Item -ItemType Directory -Path $Root | Out-Null
  Write-Host "Created root: $Root" -ForegroundColor Green
}

Write-Host "==== 1) Scaffold universities + L1..M2 from database ====" -ForegroundColor Cyan
& npx --yes tsx "scripts/lectures-drop/scaffold-from-db.ts" --root $Root
if ($LASTEXITCODE -ne 0) { throw "scaffold failed" }

if ($ScaffoldOnly) {
  Write-Host "Scaffold only. Put PDFs then re-run with -Upload" -ForegroundColor Yellow
  exit 0
}

Write-Host "==== 2) Import from drop folder ====" -ForegroundColor Cyan
$argsList = @("--yes", "tsx", "scripts/lectures-drop/import-drop.ts", "--root", $Root)
if ($DryRun -or -not $Upload) { $argsList += "--dry" }
if ($Univ) { $argsList += @("--univ", $Univ) }

& npx @argsList
if ($LASTEXITCODE -ne 0) { throw "import failed" }

if (-not $Upload -or $DryRun) {
  Write-Host ""
  Write-Host "Dry-run done. To upload for real:" -ForegroundColor Yellow
  Write-Host "  .\scripts\lectures-drop\Import-LecturesDrop.ps1 -Root `"$Root`" -Upload" -ForegroundColor Yellow
}

Write-Host "Done. Reports: scripts\lectures-drop\out\" -ForegroundColor Green
