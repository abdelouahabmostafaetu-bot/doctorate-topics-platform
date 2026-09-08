# دمج التخصصات — Specialty Merge Migration

يجمع هذا السكربت التخصصات المكررة (فرنسي/إنجليزي) في قائمة موحدة ثنائية اللغة
لصفحة `/world` وكل الموقع — **دون حذف أي امتحان**.

This merges duplicate specialty names (e.g. `Algèbre` + `Algebra`, `EDP` +
`Partial Differential Equations`) into one canonical bilingual list
(English `name` + Arabic `nameAr`). Topics are only **re-linked**, never deleted.

## التشغيل / Usage

```bash
# 1) نسخة احتياطية كاملة أولاً / full backup first
node backup-db.mjs

# 2) معاينة — لا يغيّر شيئًا / dry-run, writes nothing
npx tsx scripts/merge-specialties.ts

# 3) تنفيذ فعلي / apply
npx tsx scripts/merge-specialties.ts --apply
```

## ماذا يفعل بالضبط / What it does

1. **يضمن 23 تخصصًا موحدًا** باسم إنجليزي نظيف + اسم عربي صحيح
   (ينشئ الناقص مثل `Functional Analysis`، ويصحّح `nameAr` للموجود).
2. **يعيد ربط المواضيع** من التخصص المكرر إلى الموحد (`topic.specialtyId` فقط).
3. **يحذف فقط** التخصصات المكررة التي أصبحت فارغة تمامًا (0 مواضيع + 0 موديلات).
4. **يكمل أسماء الجامعات العربية الناقصة** (هارفارد، UCLA، NUS...) دون مساس
   بالأسماء العربية الموجودة.

## خريطة الدمج / Merge map

| مكرر (يُحذف بعد الإفراغ) | الموحَّد (النهائي) |
|---|---|
| Algèbre | Algebra / الجبر |
| Analysis | Real Analysis / التحليل الحقيقي |
| Analyse Complexe | Complex Analysis / التحليل العقدي |
| Analyse Fonctionnelle | Functional Analysis / التحليل الدالي |
| Analyse Numérique & Optimisation, Numerical Analysis | Numerical Analysis & Optimization / التحليل العددي والأمثلية |
| EDP, Numerical PDE | Partial Differential Equations / المعادلات التفاضلية الجزئية |
| Differential Equations | Ordinary Differential Equations / المعادلات التفاضلية العادية |
| General Mathematics | Mathematics / الرياضيات |
| Probabilités & Statistiques | Probability & Statistics / الاحتمالات والإحصاء |
| Regression Analysis | Statistics / علم الإحصاء |
| Recherche Opérationnelle | Operations Research / بحوث العمليات |
| Systèmes Dynamiques | Dynamical Systems / الأنظمة الديناميكية |
| Biomathématiques | Biomathematics / الرياضيات الحيوية |
| Topology | Geometry and Topology / الهندسة والطوبولوجيا |
| Advanced Fundamenta (اسم مكسور) | Advanced Mathematical Fundamentals / الأساسيات الرياضية المتقدمة |

## ملاحظات / Notes

- **Idempotent**: يمكن إعادة تشغيله بأمان أي عدد من المرات.
- لا يغيّر `slug` أي موضوع — روابط `/topics/...` تبقى كما هي.
- جزء من المواضيع نُقل مسبقًا عبر MCP — السكربت يكمل الباقي تلقائيًا.
- بعد الدمج، يُنصح أن تعرض الواجهة `nameAr` عند اللغة العربية و`name`
  عند الإنجليزية/الفرنسية — هكذا لن تظهر مشكلة الازدواجية مجددًا.
