# استيراد محاضرات Google Drive بـ PowerShell + Kimi

## الفكرة

1. تحمّل مجلد Drive إلى جهازك (أو تشير لمجلد محلي).
2. السكربت يمر **مجلدًا بمجلد**.
3. **Kimi K2.6** (عبر Azure عندك) يقرأ أسماء المجلدات/الملفات الفوضوية ويحوّلها إلى:
   - جامعة (slug موجود في موقعك)
   - مستوى L1…M2
   - تخصص (L3/ماستر إن لزم)
   - مقياس
   - نوع الملف: cours / td / tp / exam / resume / book / other
   - عنوان نظيف
4. PowerShell + Node يرفعان الملفات إلى **Cloudflare R2** ويسجّلانها في قاعدة **المحاضرات**.
5. تظهر في `/lectures`.

> ملاحظة: Google لا يعطي لـ Kimi قراءة Drive مباشرة من الرابط فقط.
> لذلك نحمّل المجلد محليًا أولًا (مرة واحدة)، ثم Kimi يشتغل على الأسماء والمسارات.

## المتطلبات على Windows

- المشروع على: `D:\doctorate-topics-platform`
- Node.js + `npm install` داخل المشروع
- ملف `.env` فيه أصلًا:
  - `DATABASE_URL`
  - `STORAGE_ENDPOINT` `STORAGE_ACCESS_KEY` `STORAGE_SECRET_KEY` `STORAGE_BUCKET` `STORAGE_PUBLIC_URL_BASE`
  - `AZURE_OPENAI_ENDPOINT` `AZURE_OPENAI_API_KEY` `AZURE_OPENAI_DEPLOYMENT_KIMI` (أو `AZURE_OPENAI_DEPLOYMENT`)
- اختياري لتحميل Drive:
  - [rclone](https://rclone.org) مربوط بـ Google Drive باسم `gdrive`
  - أو [gdown](https://github.com/wkentaro/gdown) عبر Python: `pip install gdown`

**لا تلصق مفاتيح API في الشات.** تبقى في `.env` فقط.

## الأوامر (PowerShell)

افتح PowerShell:

```powershell
cd D:\doctorate-topics-platform
Set-ExecutionPolicy -Scope Process Bypass

# 1) تجربة بدون رفع (dry-run) — يبني JSON فقط بعد تصنيف Kimi
.\scripts\drive-import\Import-DriveLectures.ps1 `
  -LocalRoot "D:\lectures-from-drive" `
  -DryRun

# 2) استيراد حقيقي: تصنيف Kimi + رفع R2 + قاعدة البيانات
.\scripts\drive-import\Import-DriveLectures.ps1 `
  -LocalRoot "D:\lectures-from-drive" `
  -Upload

# 3) من رابط Drive العام (يحتاج gdown أو rclone)
.\scripts\drive-import\Import-DriveLectures.ps1 `
  -DriveUrl "https://drive.google.com/drive/folders/XXXXXXXX" `
  -DownloadDir "D:\lectures-from-drive" `
  -Upload
```

### خيارات مفيدة

| خيار | معنى |
|------|------|
| `-LocalRoot` | مجلد محلي بعد التحميل |
| `-DriveUrl` | رابط مجلد Drive |
| `-DownloadDir` | أين يُحفظ التحميل |
| `-DryRun` | تصنيف فقط، بلا رفع |
| `-Upload` | رفع R2 + كتابة DB |
| `-SkipClassify` | إعادة استخدام `catalog.json` الموجود |
| `-MinConfidence 0.55` | تجاهل تخمينات Kimi الضعيفة |
| `-LimitFolders 5` | تجربة على أول 5 مجلدات فقط |

## المخرجات

داخل `scripts/drive-import/out/`:

- `universities.json` — جامعات موقعك
- `tree.json` — شجرة الملفات المحلية
- `catalog.json` — نتيجة Kimi (جاهزة للمراجعة)
- `import-report.json` — ماذا رُفع / تُخطي / فشل

راجع `catalog.json` قبل `-Upload` إذا الأسماء فوضوية جدًا.

## ترتيب المجلد المثالي (اختياري لكن أفضل)

```text
USTHB/
  L1/
    Analyse 1/
      cours/...
      td/...
  L3/
    Analyse Mathématique/
      Analyse Fonctionnelle/
        ...
```

حتى لو الترتيب فوضوي، Kimi يحاول الفهم من المسار + اسم الملف.
