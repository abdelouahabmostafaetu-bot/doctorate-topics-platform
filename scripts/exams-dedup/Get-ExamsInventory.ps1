# Scans an exams folder, computes SHA256 for every file, writes exams-inventory.json
# Usage:  .\scripts\exams-dedup\Get-ExamsInventory.ps1 -Source "D:\exams-200"
param(
  [Parameter(Mandatory = $true)][string]$Source
)
$Source = (Resolve-Path $Source).Path
$files = Get-ChildItem -Path $Source -Recurse -File
$items = foreach ($f in $files) {
  [pscustomobject]@{
    path      = $f.FullName.Substring($Source.Length).TrimStart('\')
    folder    = $f.Directory.FullName.Substring($Source.Length).TrimStart('\')
    name      = $f.Name
    sizeBytes = $f.Length
    sha256    = (Get-FileHash -Path $f.FullName -Algorithm SHA256).Hash
  }
}
$items | ConvertTo-Json -Depth 4 | Out-File -FilePath (Join-Path $Source 'exams-inventory.json') -Encoding utf8
Write-Host ("DONE  files={0}  ->  {1}\exams-inventory.json" -f $items.Count, $Source)
