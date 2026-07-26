# Exams dedup helper

1. Export existing exams from the live DB (run from project root):
   npx tsx scripts/exams-dedup/export-existing-exams.mjs
   -> creates existing-exams.json

2. Inventory + hash the new exams folder:
   powershell -ExecutionPolicy Bypass -File .\scripts\exams-dedup\Get-ExamsInventory.ps1 -Source "D:\exams-200"
   -> creates exams-inventory.json inside the folder

3. Zip the images folder for upload:
   Compress-Archive -Path "D:\exams-200\*" -DestinationPath "D:\exams-200-upload.zip" -Force

4. Upload to the AI conversation:
   - existing-exams.json
   - exams-inventory.json
   - exams-200-upload.zip  (or in parts if too big)
