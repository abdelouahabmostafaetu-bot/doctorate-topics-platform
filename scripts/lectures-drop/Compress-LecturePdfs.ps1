#Requires -Version 5.1
<#
.SYNOPSIS
  Compress PDF files under lectures-library before upload (PowerShell only).

.DESCRIPTION
  Uses Ghostscript (gswin64c) to reduce PDF size.
  Creates compressed copies next to originals (or overwrites with -InPlace).
  Skips tiny files and files that do not shrink enough.

.EXAMPLE
  .\scripts\lectures-drop\Compress-LecturePdfs.ps1 -Root "D:\lectures-library"

.EXAMPLE
  .\scripts\lectures-drop\Compress-LecturePdfs.ps1 -Root "D:\lectures-library" -Quality ebook -InPlace

.EXAMPLE
  # Full pipeline: compress then import
  .\scripts\lectures-drop\Compress-LecturePdfs.ps1 -Root "D:\lectures-library" -InPlace
  npx tsx scripts/lectures-drop/import-drop.ts --root "D:\lectures-library"
#>
[CmdletBinding()]
param(
  [string]$Root = "D:\lectures-library",
  # screen = smallest, ebook = balanced, printer = higher quality, prepress = best quality
  [ValidateSet("screen", "ebook", "printer", "prepress")]
  [string]$Quality = "ebook",
  [switch]$InPlace,
  # Skip PDFs smaller than this (MB)
  [double]$MinSizeMB = 1.5,
  # Keep compressed only if at least this % smaller (0-100)
  [double]$MinSavePercent = 8,
  # Optional: only one university folder
  [string]$Univ = "",
  [switch]$InstallGhostscript
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$msg) {
  Write-Host ""
  Write-Host "==== $msg ====" -ForegroundColor Cyan
}

function Get-GhostscriptExe {
  $candidates = @(
    "gswin64c",
    "gswin32c",
    "gs",
    "${env:ProgramFiles}\gs\gs*\bin\gswin64c.exe",
    "${env:ProgramFiles(x86)}\gs\gs*\bin\gswin32c.exe"
  )
  foreach ($c in $candidates) {
    if ($c -like "*\*") {
      $hit = Get-Item $c -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
      if ($hit) { return $hit.FullName }
    } else {
      $cmd = Get-Command $c -ErrorAction SilentlyContinue
      if ($cmd) { return $cmd.Source }
    }
  }
  return $null
}

if (-not (Test-Path -LiteralPath $Root)) {
  throw "Root not found: $Root"
}

if ($InstallGhostscript) {
  Write-Step "Install Ghostscript via winget"
  winget install --id ArtifexSoftware.GhostScript -e --accept-source-agreements --accept-package-agreements
}

$gs = Get-GhostscriptExe
if (-not $gs) {
  Write-Host @"
Ghostscript not found.

Install with PowerShell (Admin recommended):
  winget install --id ArtifexSoftware.GhostScript -e --accept-source-agreements --accept-package-agreements

Or re-run:
  .\scripts\lectures-drop\Compress-LecturePdfs.ps1 -Root "$Root" -InstallGhostscript

Then open a NEW PowerShell window and run compress again.
"@ -ForegroundColor Yellow
  throw "Ghostscript (gswin64c) is required for PDF compression."
}

Write-Host "Ghostscript: $gs" -ForegroundColor Green
Write-Host "Quality: $Quality | InPlace=$InPlace | MinSizeMB=$MinSizeMB | MinSavePercent=$MinSavePercent" -ForegroundColor Green

$searchRoot = $Root
if ($Univ) {
  $searchRoot = Join-Path $Root $Univ
  if (-not (Test-Path -LiteralPath $searchRoot)) { throw "University folder not found: $searchRoot" }
}

Write-Step "Scan PDFs"
$pdfs = Get-ChildItem -LiteralPath $searchRoot -Recurse -File -Filter *.pdf |
  Where-Object {
    $_.Name -notmatch '\.compressed\.pdf$' -and
    $_.Name -notmatch '_compressed\.pdf$' -and
    $_.FullName -notmatch '\\_backup_originals\\'
  }

Write-Host "Found $($pdfs.Count) PDF file(s)" -ForegroundColor Green

$backupRoot = Join-Path $Root "_backup_originals"
$report = @()
$compressed = 0
$skipped = 0
$failed = 0
$savedBytes = 0L

foreach ($pdf in $pdfs) {
  $sizeMB = [math]::Round($pdf.Length / 1MB, 2)
  if ($sizeMB -lt $MinSizeMB) {
    $skipped++
    $report += [pscustomobject]@{ File = $pdf.FullName; Status = "skip-small"; BeforeMB = $sizeMB; AfterMB = $sizeMB; SavedPct = 0 }
    continue
  }

  $outFile = if ($InPlace) {
    [System.IO.Path]::ChangeExtension($pdf.FullName, ".tmp-compress.pdf")
  } else {
    $dir = $pdf.DirectoryName
    $base = [System.IO.Path]::GetFileNameWithoutExtension($pdf.Name)
    Join-Path $dir ($base + ".compressed.pdf")
  }

  Write-Host ("Compress: {0} ({1} MB)" -f $pdf.FullName, $sizeMB) -ForegroundColor DarkCyan

  $gsArgs = @(
    "-sDEVICE=pdfwrite",
    "-dCompatibilityLevel=1.4",
    "-dPDFSETTINGS=/$Quality",
    "-dNOPAUSE",
    "-dQUIET",
    "-dBATCH",
    "-dDetectDuplicateImages=true",
    "-dCompressFonts=true",
    "-dSubsetFonts=true",
    "-dColorImageDownsampleType=/Bicubic",
    "-dColorImageResolution=120",
    "-dGrayImageDownsampleType=/Bicubic",
    "-dGrayImageResolution=120",
    "-dMonoImageDownsampleType=/Bicubic",
    "-dMonoImageResolution=120",
    "-sOutputFile=$outFile",
    $pdf.FullName
  )

  try {
    & $gs @gsArgs
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $outFile)) {
      throw "Ghostscript failed (exit $LASTEXITCODE)"
    }

    $after = Get-Item -LiteralPath $outFile
    $afterMB = [math]::Round($after.Length / 1MB, 2)
    $savePct = if ($pdf.Length -gt 0) { [math]::Round((1 - ($after.Length / $pdf.Length)) * 100, 1) } else { 0 }

    if ($after.Length -ge $pdf.Length -or $savePct -lt $MinSavePercent) {
      Remove-Item -LiteralPath $outFile -Force -ErrorAction SilentlyContinue
      $skipped++
      $report += [pscustomobject]@{ File = $pdf.FullName; Status = "skip-no-gain"; BeforeMB = $sizeMB; AfterMB = $afterMB; SavedPct = $savePct }
      Write-Host ("  skip (no useful gain: {0}% / {1} MB)" -f $savePct, $afterMB) -ForegroundColor DarkYellow
      continue
    }

    if ($InPlace) {
      # backup original once under _backup_originals mirroring relative path
      $rel = Get-Item $pdf.FullName | ForEach-Object { $_.FullName.Substring((Resolve-Path $Root).Path.Length).TrimStart('\', '/') }
      $bak = Join-Path $backupRoot $rel
      $bakDir = Split-Path $bak -Parent
      if (-not (Test-Path -LiteralPath $bakDir)) { New-Item -ItemType Directory -Path $bakDir -Force | Out-Null }
      if (-not (Test-Path -LiteralPath $bak)) {
        Copy-Item -LiteralPath $pdf.FullName -Destination $bak -Force
      }
      Move-Item -LiteralPath $outFile -Destination $pdf.FullName -Force
      $finalPath = $pdf.FullName
    } else {
      $finalPath = $outFile
    }

    $savedBytes += ($pdf.Length - $after.Length)
    $compressed++
    $report += [pscustomobject]@{ File = $finalPath; Status = "compressed"; BeforeMB = $sizeMB; AfterMB = $afterMB; SavedPct = $savePct }
    Write-Host ("  OK {0} MB -> {1} MB  (-{2}%)" -f $sizeMB, $afterMB, $savePct) -ForegroundColor Green
  }
  catch {
    $failed++
    if (Test-Path -LiteralPath $outFile) { Remove-Item -LiteralPath $outFile -Force -ErrorAction SilentlyContinue }
    $report += [pscustomobject]@{ File = $pdf.FullName; Status = "failed"; BeforeMB = $sizeMB; AfterMB = $null; SavedPct = 0; Error = $_.Exception.Message }
    Write-Host ("  FAIL: {0}" -f $_.Exception.Message) -ForegroundColor Red
  }
}

Write-Step "Summary"
$savedMB = [math]::Round($savedBytes / 1MB, 2)
Write-Host "compressed=$compressed  skipped=$skipped  failed=$failed  saved≈${savedMB} MB" -ForegroundColor Green
if ($InPlace) {
  Write-Host "Originals backed up under: $backupRoot" -ForegroundColor Yellow
}

$outDir = Join-Path (Split-Path $PSScriptRoot -Parent) "lectures-drop\out"
if (-not (Test-Path $outDir)) {
  # script lives in scripts/lectures-drop
  $outDir = Join-Path $PSScriptRoot "out"
}
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
$reportPath = Join-Path $outDir "compress-report.csv"
$report | Export-Csv -Path $reportPath -NoTypeInformation -Encoding UTF8
Write-Host "Report: $reportPath" -ForegroundColor Green

Write-Host ""
Write-Host "Next: import to website" -ForegroundColor Cyan
Write-Host "  cd D:\doctorate-topics-platform" -ForegroundColor Cyan
if (-not $InPlace) {
  Write-Host "  (You created .compressed.pdf files. Prefer -InPlace before import, or import only compressed copies.)" -ForegroundColor Yellow
}
Write-Host "  npx tsx scripts/lectures-drop/import-drop.ts --root `"$Root`"" -ForegroundColor Cyan
