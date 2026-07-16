$API = "https://www.docmathdz.dev/api/mcp?key=uwebuibPURBVEBKu8493rhf3bqvpv"
$mapRaw = [System.IO.File]::ReadAllText("D:\doctorate-topics-platform\mapping.json", [System.Text.Encoding]::UTF8)
$MAPPING = $mapRaw | ConvertFrom-Json

function Invoke-MCP($toolName, $argsObj) {
    $bodyObj = @{ jsonrpc = "2.0"; id = 1; method = "tools/call"; params = @{ name = $toolName; arguments = $argsObj } }
    $body = $bodyObj | ConvertTo-Json -Depth 10 -Compress
    $tmp = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($tmp, $body, [System.Text.Encoding]::UTF8)
    try {
        $resp = curl.exe -sS --max-time 60 -X POST $API -H "Content-Type: application/json" --data-binary "@$tmp" 2>&1
        $respObj = $resp | ConvertFrom-Json
        if ($respObj.error) { return @{ error = $respObj.error.message } }
        return ($respObj.result.content[0].text | ConvertFrom-Json)
    } catch {
        return @{ error = $_.Exception.Message }
    } finally {
        Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "=== PHASE 1: Fetch all exams ==="
$allExams = @()
$offset = 0
do {
    $result = Invoke-MCP "list_exams" @{ limit = 500; offset = $offset }
    if ($result.error) { Write-Host "ERROR fetching offset=$offset : $($result.error)"; break }
    $allExams += $result.exams
    $total = $result.total
    Write-Host "  Fetched $($result.exams.Count) exams (offset=$offset, total=$total)"
    $offset += 500
} while ($offset -lt $total)

Write-Host "`nTotal exams: $($allExams.Count)"

# Deduplicate by slug (in case of overlap)
$seen = @{}
$uniqueExams = @()
foreach ($e in $allExams) {
    if (-not $seen.ContainsKey($e.slug)) {
        $seen[$e.slug] = $true
        $uniqueExams += $e
    }
}
$allExams = $uniqueExams
Write-Host "Unique exams after dedup: $($allExams.Count)"

Write-Host "`n=== PHASE 2: Update universities ==="
$updated = 0; $noChange = 0; $skipped = 0; $errors = 0

for ($i = 0; $i -lt $allExams.Count; $i++) {
    $exam = $allExams[$i]
    $cur = $exam.university
    $slug = $exam.slug

    if ($MAPPING.PSObject.Properties[$cur]) {
        $new = $MAPPING.$cur
        if ($cur -ne $new) {
            $r = Invoke-MCP "update_exam" @{ topic = $slug; university = $new }
            if ($r.error) {
                Write-Host "  ERR $slug : $($r.error)"
                $errors++
            } else {
                $updated++
            }
        } else { $noChange++ }
    } else { $skipped++ }

    if (($i + 1) % 50 -eq 0) {
        Write-Host "  [$($i+1)/$($allExams.Count)] upd=$updated nochange=$noChange skip=$skipped err=$errors"
    }
}

Write-Host "`n[$($allExams.Count)/$($allExams.Count)] upd=$updated nochange=$noChange skip=$skipped err=$errors"
Write-Host "`n=== DONE ==="
Write-Host "Updated: $updated | No change: $noChange | Skipped: $skipped | Errors: $errors"

Write-Host "`n=== PHASE 3: Verify ==="
$unis = Invoke-MCP "list_universities" @{}
if ($unis -is [array]) {
    Write-Host "Unique universities: $($unis.Count)"
    $j = 1
    foreach ($u in $unis) { Write-Host "  $j. $($u.name)"; $j++ }
} elseif ($unis.PSObject.Properties.Count -gt 0) {
    Write-Host "Result is object with $($unis.PSObject.Properties.Count) properties"
    foreach ($p in $unis.PSObject.Properties) { Write-Host "  $($p.Name): $($p.Value)" }
} else {
    Write-Host "Raw result: $($unis | ConvertTo-Json -Compress)"
}
