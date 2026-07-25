# مكتبة المحاضرات المحلية (Drop folder) + استيراد تدريجي

## الفكرة

1. عندك مجلد محلي فيه **كل جامعات الموقع** (باسم الـ slug).
2. داخل كل جامعة 5 مجلدات فارغة: `L1` `L2` `L3` `M1` `M2`.
3. أنت تضع الملفات يومًا بعد يوم بهذا الشكل.
4. تشغّل **سكربت واحد** — يضيف الجديد فقط و**يتخطى المكرر**.

---

## شكل المجلد (مهم)

```text
lectures-library/
  usthb/
    L1/
      Analyse 1/                     ← مقياس
        Chapitre 1/                  ← مجلد داخل المقياس (يظهر في الموقع)
          ch01.pdf
        Chapitre 2/
          ch02.pdf
        TD/
          serie-01.pdf
    L3/
      Analyse Mathematique/          ← تخصص
        Analyse Fonctionnelle/       ← مقياس
          Cours/
            cours-01.pdf
          TD/
            Serie 1/
              td-01.pdf              ← مجلدات متداخلة تُحفظ كما هي
    M1/
    M2/
```

> المجلدات **داخل المقياس** لا تُحذف عند الاستيراد — تظهر كمجلدات قابلة للفتح في صفحة المقياس.

### قواعد بسيطة

| المستوى في المسار | المعنى |
|-------------------|--------|
| المجلد 1 | `slug` الجامعة = نفس الموقع (`usthb`, `blida-1`, …) |
| المجلد 2 | المستوى: `L1` `L2` `L3` `M1` `M2` |
| بعد ذلك | إما `مقياس/...` أو `تخصص/مقياس/...` |
| مجلد النوع (اختياري) | `cours` `td` `tp` `resume` `book` `exam` `other` |
| الملف | PDF / ZIP / صورة… |

**أمثلة صحيحة:**

```text
usthb/L1/Analyse 1/cours/ch1.pdf
usthb/L1/Analyse 1/td/serie1.pdf
usthb/L1/Analyse 1/ch1.pdf                    ← النوع يُخمَّن من الاسم
blida-1/M1/Analyse/Analyse Fonctionnelle/cours/a.pdf
```

> اسم الجامعة = **slug الموقع** وليس الاسم العربي.
> شغّل `scaffold` ليحدّث المجلدات من قاعدة بياناتك الحقيقية.

---

## الأوامر (PowerShell)

```powershell
cd D:\doctorate-topics-platform
Set-ExecutionPolicy -Scope Process Bypass

# 0) مرة واحدة: تثبيت Ghostscript لضغط PDF (يوفر مساحة R2)
winget install --id ArtifexSoftware.GhostScript -e --accept-source-agreements --accept-package-agreements
# أغلق PowerShell وافتحه من جديد بعد التثبيت

# 1) حدّث جامعات الموقع + مجلدات L1..M2
npx tsx scripts/lectures-drop/scaffold-from-db.ts --root "D:\lectures-library"

# 2) ضع PDF داخل المسارات المناسبة...

# 3) ضغط كل PDF الكبيرة قبل الرفع (يوفّر المساحة)
.\scripts\lectures-drop\Compress-LecturePdfs.ps1 -Root "D:\lectures-library" -InPlace -Quality ebook

# 4) تجربة استيراد
npx tsx scripts/lectures-drop/import-drop.ts --root "D:\lectures-library" --dry

# 5) رفع حقيقي
npx tsx scripts/lectures-drop/import-drop.ts --root "D:\lectures-library"
```

### أمر واحد: ضغط + رفع

```powershell
.\scripts\lectures-drop\Import-LecturesDrop.ps1 -Root "D:\lectures-library" -Compress -Upload
```

### جودة الضغط (`-Quality`)

| القيمة | النتيجة |
|--------|--------|
| `screen` | أصغر حجم (جودة أقل — جيد للمسوحات الثقيلة) |
| `ebook` | **موصى به** توازن حجم/وضوح |
| `printer` | أوضح وأكبر |
| `prepress` | أعلى جودة |

النسخ الأصلية تُحفظ في `D:\lectures-library\_backup_originals` عند `-InPlace`.

---

## منع التكرار (آمن كل يوم / كل شهر)

الملف يُعتبر **موجودًا مسبقًا** (يُتخطى) إذا:

1. نفس **المقياس** + نفس **العنوان**، أو
2. نفس **المقياس** + نفس **اسم الملف** + نفس **الحجم**، أو
3. موجود في سجل محلي `scripts/lectures-drop/out/imported-ledger.json` (بصمة المسار+الحجم+hash)

لذلك يمكنك:
- اليوم تضيف 10 ملفات وتشغّل السكربت
- غدًا تضيف 5 ملفات جديدة وتشغّل نفس السكربت
- القديم لا يُرفع مرتين

---

## المخرجات

```text
scripts/lectures-drop/out/
  universities.json
  last-import-report.json
  imported-ledger.json
```

---

## ملاحظات

- التصفح على الموقع: `/lectures`
- الإدارة اليدوية تبقى: `/admin/lectures`
- السكربت يحتاج `.env`: `DATABASE_URL` + `STORAGE_*`
- لا تحذف مجلد `lectures-library` بعد الاستيراد — هو ورشتك المستمرة
