# Standardize university field across all exams
$MAPPING = @{
  "Annaba" = "Université Badji Mokhtar - Annaba"
  "Béjaia" = "Université Abderrahmane Mira - Béjaïa"
  "Biskra" = "Université Mohamed Khider - Biskra"
  "Concours national d'accès au Doctorat (Algérie)" = "Source inconnue"
  "El Oued" = "Université Echahid Hamma Lakhdar - El Oued"
  "Laghouat" = "Université Amar Telidji - Laghouat"
  "Mascara" = "Université Mustapha Stambouli - Mascara"
  "Oum El Bouaghi" = "Université Larbi Ben M'Hidi - Oum El Bouaghi"
  "Sétif 1" = "Université Ferhat Abbas - Sétif 1"
  "Sidi Bel Abbès" = "Université Djilali Liabès - Sidi Bel Abbès"
  "Skikda" = "Université 20 Août 1955 - Skikda"
  "Tébessa" = "Université Larbi Tébessi - Tébessa"
  "Université Abbès Laghrour de Khenchela" = "Université Abbès Laghrour - Khenchela"
  "Université Abderrahmane Mira de Béjaïa" = "Université Abderrahmane Mira - Béjaïa"
  "Université Aboubekr Belkaïd - Tlemcen" = "Université Abou Bekr Belkaïd - Tlemcen"
  "Université Ahmed Draia d'Adrar" = "Université Ahmed Draïa - Adrar"
  "Université Constantine 1" = "Université Frères Mentouri - Constantine 1"
  "Université de Batna 2" = "Université Batna 2 - Mostefa Ben Boulaïd"
  "Université de Saïda - Dr. Moulay Tahar" = "Université Dr Moulay Tahar - Saïda"
  "Université de Sidi Bel Abbès" = "Université Djilali Liabès - Sidi Bel Abbès"
  "Université Djillali Liabès - Sidi Bel Abbès" = "Université Djilali Liabès - Sidi Bel Abbès"
  "Université du Relizane" = "Université Ahmed Zabana de Relizane"
  "Université Echahid Hamma Lakhdar d'El Oued" = "Université Echahid Hamma Lakhdar - El Oued"
  "Université M'Hamed Bougara de Boumerdès" = "Université M'Hamed Bougara - Boumerdès"
  "Université Mohamed Khider de Biskra" = "Université Mohamed Khider - Biskra"
  "Université Mouloud Mammeri de Tizi-Ouzou" = "Université Mouloud Mammeri - Tizi Ouzou"
  "Université Oran 1" = "Université Ahmed Ben Bella - Oran 1"
  "Université Yahia Farès de Médéa" = "Université Yahia Farès - Médéa"
  "Unknown University" = "Source inconnue"
  "USTHB" = "Université des Sciences et de la Technologie Houari Boumediène (USTHB)"
  "USTHB - Université des Sciences et de la Technologie Houari Boumediene" = "Université des Sciences et de la Technologie Houari Boumediène (USTHB)"
  "USTO" = "Université des Sciences et de la Technologie d'Oran (USTO)"
  "المدرسة الوطنية العليا للرياضيات" = "École Nationale Supérieure de Mathématiques (ENSM)"
}

$API = "https://www.docmathdz.dev/api/mcp?key=uwebuibPURBVEBKu8493rhf3bqvpv"

function Invoke-MCP($toolName, $argsObj) {
    $body = @{ jsonrpc = "2.0"; id = 1; method = "tools/call"; params = @{ name = $toolName; arguments = $argsObj } } | ConvertTo-Json -Depth 10 -Compress
    $tmp = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($tmp, $body, [System.Text.UTF8Encoding]::new($false))
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

# Step 1: Fetch all exams
Write-Host "=== Fetching all exams ==="
$allExams = @()
$offset = 0
$limit = 500
do {
    $result = Invoke-MCP "list_exams" @{ limit = $limit; offset = $offset }
    if ($result.error) { Write-Host "ERROR fetching at offset $offset : $($result.error)"; break }
    $allExams += $result.exams
    Write-Host "  Fetched $($result.exams.Count) exams (offset=$offset, total=$($result.total))"
    $offset += $limit
} while ($offset -lt $result.total)

Write-Host "`nTotal exams fetched: $($allExams.Count)`n"

# Step 2-4: Process each exam
$updated = 0
$skipped = 0
$errors = 0
$noChange = 0
$unknown = @()

for ($i = 0; $i -lt $allExams.Count; $i++) {
    $exam = $allExams[$i]
    $currentUni = $exam.university
    $slug = $exam.slug

    if ($MAPPING.ContainsKey($currentUni)) {
        $newUni = $MAPPING[$currentUni]
        if ($currentUni -ne $newUni) {
            $result = Invoke-MCP "update_exam" @{ topic = $slug; university = $newUni }
            if ($result.error) {
                Write-Host "  ERROR updating $slug : $($result.error)"
                $errors++
            } else {
                $updated++
            }
        } else {
            $noChange++
        }
    } else {
        $skipped++
    }

    # Progress every 50
    if (($i + 1) % 50 -eq 0) {
        Write-Host "  [$($i+1)/$($allExams.Count)] updated=$updated noChange=$noChange skipped=$skipped errors=$errors"
    }
}

Write-Host "`n=== FINAL SUMMARY ==="
Write-Host "Total exams processed: $($allExams.Count)"
Write-Host "Updated: $updated"
Write-Host "No change needed: $noChange"
Write-Host "Skipped (not in mapping): $skipped"
Write-Host "Errors: $errors"

# Step 5: Verify with list_universities
Write-Host "`n=== Verifying with list_universities ==="
$unis = Invoke-MCP "list_universities" @{}
if ($unis.error) {
    Write-Host "ERROR: $($unis.error)"
} else {
    Write-Host "Unique universities: $($unis.Count)"
    $i = 1
    foreach ($u in $unis) {
        Write-Host "  $i. $($u.name)"
        $i++
    }
}
