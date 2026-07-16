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

Write-Host "=== Phase 1: Collect all slugs to update ==="
$toUpdate = @()
foreach ($prop in $MAPPING.PSObject.Properties) {
    $oldName = $prop.Name
    $newName = $prop.Value
    if ($oldName -eq $newName) { continue }
    
    $result = Invoke-MCP "list_exams" @{ university = $oldName; limit = 500; offset = 0 }
    if ($result.error) { Write-Host "  ERROR querying '$oldName': $($result.error)"; continue }
    foreach ($e in $result.exams) {
        $toUpdate += @{ slug = $e.slug; old = $oldName; new = $newName }
    }
}
Write-Host "Total exams to update: $($toUpdate.Count)"

Write-Host "`n=== Phase 2: Apply updates ==="
$updated = 0; $errors = 0
for ($i = 0; $i -lt $toUpdate.Count; $i++) {
    $item = $toUpdate[$i]
    $r = Invoke-MCP "update_exam" @{ topic = $item.slug; university = $item.new }
    if ($r.error) {
        Write-Host "  ERR $($item.slug): $($r.error)"
        $errors++
    } else {
        $updated++
    }
    if (($i + 1) % 10 -eq 0) {
        Write-Host "  [$($i+1)/$($toUpdate.Count)] upd=$updated err=$errors"
    }
}
Write-Host "`n[$($toUpdate.Count)/$($toUpdate.Count)] upd=$updated err=$errors"
Write-Host "`n=== Phase 3: Verify ==="
$unis = Invoke-MCP "list_universities" @{}
if ($unis -is [array]) {
    Write-Host "Unique universities: $($unis.Count)"
    $j = 1
    foreach ($u in $unis) { Write-Host "  $j. $($u.name)"; $j++ }
} else {
    Write-Host "Result: $($unis | ConvertTo-Json -Compress)"
}
