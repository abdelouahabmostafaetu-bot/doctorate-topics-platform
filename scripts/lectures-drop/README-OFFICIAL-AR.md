# التنظيم الرسمي لقسم المحاضرات — شعبتا الرياضيات والرياضيات التطبيقية

هذا الملف يشرح الملفات الجديدة التي تنظم صفحة `/lectures` بشكل رسمي وموحّد
لكل جامعات الجزائر — تخصص الرياضيات فقط.

## المصدر الرسمي

البيانات مبنية على الإطار الوطني للمؤهلات والشهادات (CNC — وزارة التعليم العالي)
ومدونة الشعب والتخصصات الوطنية (نظام LMD):

- شعبة الرياضيات: https://cnc.mesrs.dz/ar/fiche-filiere?filiere=رياضيات
- شعبة الرياضيات التطبيقية: https://cnc.mesrs.dz/ar/fiche-filiere?filiere=رياضيات تطبيقية

> ملاحظة مهمة: موقع CNC تطبيق تفاعلي لا يمكن سحبه آليا، لذا جُمعت القائمة من
> المدونة الوطنية الرسمية ومواقع الجامعات. ليس كل جامعة تفتح كل تخصصات الماستر:
> القائمة المزروعة هي القائمة الوطنية الكاملة، ويمكنك حذف أي تخصص غير موجود في
> جامعة معينة من لوحة الإدارة (/admin/lectures) أو بحذف مجلده قبل الرفع.

## الملفات الجديدة

| الملف | الدور |
|---|---|
| `scripts/lectures-drop/official/math-programs.json` | المرجع الرسمي: الجامعات + التخصصات + المقاييس (عربي/فرنسي) |
| `scripts/lectures-drop/seed-official-math.ts` | زرع الجامعات والتخصصات (والمقاييس اختياريا) في قاعدة البيانات |
| `scripts/lectures-drop/scaffold-official.mjs` | إنشاء شجرة المجلدات الفارغة للرفع (بدون قاعدة بيانات) |
| `src/lib/math-filieres.ts` | تصنيف التخصصات حسب الشعبة لعرضها مجمعة في الموقع |

تم أيضا تحديث `src/app/lectures/[univ]/[level]/page.tsx` لعرض التخصصات مجمعة
تحت عنواني "شعبة الرياضيات" و"شعبة الرياضيات التطبيقية".

## ماذا يحتوي المرجع؟

- **الجامعات**: كل الجامعات والمراكز الجامعية التي تدرّس ميدان رياضيات وإعلام آلي،
  مع المدرسة الوطنية العليا للرياضيات (ENSM) والمدرسة العليا للأساتذة بالقبة.
- **L1 وL2**: مقاييس الجذع المشترك الوطني (بدون تخصص).
- **L3**: تخصصا الليسانس الرسميان: رياضيات ورياضيات تطبيقية.
- **M1 وM2**: 13 تخصص ماستر وطني (تحليل دالي، معادلات تفاضلية جزئية، جبر وهندسة،
  احتمالات وإحصاء، بحوث العمليات، رياضيات مالية…) مع الأسماء المرادفة (aliases)
  لأن الجامعات لا تستعمل نفس التسمية دائما.
- كل الأسماء ثنائية اللغة: `الاسم العربي - Nom Français` لتسهيل البحث.

## خطوات العمل (PowerShell من جذر المشروع D:\doctorate-topics-platform)

### 1) زرع الجامعات والتخصصات في قاعدة البيانات

```powershell
# معاينة فقط (لا يكتب شيئا)
npx tsx scripts/lectures-drop/seed-official-math.ts

# التنفيذ الفعلي: جامعات + تخصصات
npx tsx scripts/lectures-drop/seed-official-math.ts --apply

# (اختياري) زرع المقاييس الرسمية أيضا لكل مستوى وتخصص
npx tsx scripts/lectures-drop/seed-official-math.ts --apply --with-modules

# (اختياري) جامعة واحدة فقط
npx tsx scripts/lectures-drop/seed-official-math.ts --apply --univ usthb
```

### 2) إنشاء مكتبة المجلدات الفارغة (إن لم تستعمل الـ zip الجاهز)

```powershell
node scripts/lectures-drop/scaffold-official.mjs --root "D:\lectures-library"
```

### 3) ضع ملفات PDF في المجلدات ثم ارفع

```powershell
npx tsx scripts/lectures-drop/import-drop.ts --root "D:\lectures-library" --dry
npx tsx scripts/lectures-drop/import-drop.ts --root "D:\lectures-library"
```

أو بالسكريبت الجاهز (مع ضغط PDF):

```powershell
.\scripts\lectures-drop\Import-LecturesDrop.ps1 -Root "D:\lectures-library" -Compress -Upload
```

## بنية المجلدات (متوافقة مع import-drop.ts)

```
D:\lectures-library\
└─ usthb\                              ← رمز الجامعة (slug)
   ├─ L1\تحليل 1 - Analyse 1\          ← جذع مشترك: المقياس مباشرة
   ├─ L3\رياضيات - Mathématiques\تحليل دالي - Analyse Fonctionnelle\
   └─ M1\معادلات تفاضلية جزئية - Équations aux Dérivées Partielles (EDP)\فضاءات سوبوليف - Espaces de Sobolev\
```

- ضع الملفات مباشرة داخل مجلد المقياس، أو أنشئ مجلدات فرعية (cours، td، exam…).
- أسماء التخصصات والمقاييس في المجلدات مطابقة تماما لأسماء قاعدة البيانات،
  فلا يحدث أي تكرار عند الرفع.
- المجلدات الفارغة لا تُرفع: import-drop يرفع فقط المجلدات التي تحتوي ملفات.

## تعديل القائمة

لإضافة/تعديل جامعة أو تخصص أو مقياس: عدّل `official/math-programs.json`
ثم أعد تنفيذ الزرع و/أو السكافولد. الزرع آمن لإعادة التشغيل: لن يكرر شيئا موجودا.
