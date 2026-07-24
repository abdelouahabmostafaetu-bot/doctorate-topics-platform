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
      Analyse 1/
        cours/
          ch01.pdf
        td/
          serie-01.pdf
    L2/
    L3/
      Analyse Mathematique/          ← تخصص (اختياري — مفيد لـ L3/M1/M2)
        Analyse Fonctionnelle/       ← اسم المقياس (Module)
          cours/
            cours-01.pdf
          td/
            td-01.pdf
    M1/
    M2/
  blida-1/
    L1/
    ...
```

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

# 0) ضع مجلد المكتبة (مرة واحدة)
# بعد فك lectures-library-empty.zip إلى مثلاً:
#   D:\lectures-library

# 1) حدّث قائمة الجامعات من موقعك + أنشئ المجلدات الناقصة (فارغة)
npx tsx scripts/lectures-drop/scaffold-from-db.ts --root "D:\lectures-library"

# 2) ضع PDF داخل المسارات المناسبة...

# 3) تجربة بدون رفع (يعرض ماذا سيُضاف / يُتخطى)
npx tsx scripts/lectures-drop/import-drop.ts --root "D:\lectures-library" --dry

# 4) استيراد حقيقي إلى R2 + قاعدة البيانات
npx tsx scripts/lectures-drop/import-drop.ts --root "D:\lectures-library"

# في أي يوم لاحق: أضف ملفات جديدة فقط ثم أعد نفس الأمر — المكرر يُتخطى
npx tsx scripts/lectures-drop/import-drop.ts --root "D:\lectures-library"
```

أو دفعة واحدة:

```powershell
.\scripts\lectures-drop\Import-LecturesDrop.ps1 -Root "D:\lectures-library" -Upload
```

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
