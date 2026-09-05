# latex/ - Modele XeLaTeX des sujets de Doctorat

قالب واحد + بيانات لا نهائية: ملف `.tex` واحد لجميع الجامعات الجزائرية، لا ملف لكل جامعة.

```
latex/
├── templates/algerian-doctorat-exam.tex   # القالب العام (متغيرات %%...%%)
├── logos/universities/                   # شعارات PNG / PDF للاستعمال المحلي
├── examples/                             # أمطلة جاهزة (سطيف 1، USTHB، شعار مفقود)
└── generate-exam.ts                      # المولّد (TypeScript)
```

## مهم جدًا: أين يعمل هذا وأين لا يعمل

| المسار | المحرّك | الملفات |
| --- | --- | --- |
| تحميل PDF من `/search` (الموقع الحيّ) | HTML + KaTeX + Chromium | `src/lib/pdf/exam-template.ts`، `src/lib/pdf/exam-header.ts` |
| التوليد المحلي / CI (كتب، طباعة) | XeLaTeX | `latex/` (هذا المجلد) |

لماذا ليس XeLaTeX في الموقع؟ لأن دوال Vercel لا تحتوي TeX Live (حجمها بالغيغابايت، ولا يمكن تشغيل `xelatex` هناك). ربط زر التحميل بـ XeLaTeX سيُعطّل التحميل بالكامل. لذلك نفس التصميم مُنفّذ في المسارين:

- الموقع يستخدم `exam-header.ts` (نفس الترويسة الرسمية).
- هذا المجلد يستخدم القالب نفسه بـ XeLaTeX للمخرجات المطبوعة.

إن أردت XeLaTeX مباشرة من الموقع، تحتاج خادمًا دائمًا (Docker / Azure App Service مع TeX Live) أو GitHub Actions يرفع الملف إلى Blob Storage.

## المتطلبات

```bash
# Debian/Ubuntu
sudo apt install texlive-xetex texlive-lang-arabic texlive-fonts-extra fonts-amiri
# Fedora
sudo dnf install texlive-xetex texlive-polyglossia texlive-amiri texlive-tex-gyre
```

الخطوط: **Amiri** (عربي)، **TeX Gyre Termes** (لاتيني). المولّد يتحقق منهما عبر `fc-list` ويطبع تحذيرًا واضحًا قبل الفشل.

## الاستعمال

```bash
npx tsx latex/examples/render-all.ts   # يولّد latex/out/*.pdf
```

برمجيًا:

```ts
import { compileExamPdf } from "./latex/generate-exam";

await compileExamPdf(
	{
		universityFrench: "Université Ferhat Abbas -- Sétif 1",
		universityArabic: "جامعة فرحات عباس سطيف 1",
		year: "2025-2026",
		specialty: "Optimisation et contrôle",
		exam: "Optimisation",
		logo: "logos/universities/ufas1.png",
		exercises: [{ points: 6, statement: "...", questions: [{ content: "..." }] }],
	},
	"latex/out/sujet.pdf",
);
```

## متغيرات القالب

| الجذر | المصدر | الافتراضي |
| --- | --- | --- |
| `%%UNIVERSITY_FRENCH%%` | `University.name` | إلزامي |
| `%%UNIVERSITY_ARABIC%%` | `University.nameAr` | إلزامي |
| `%%FACULTY_FRENCH%%` | يدوي | `Faculté des Mathématiques` |
| `%%FACULTY_ARABIC%%` | يدوي | `كلية الرياضيات` |
| `%%YEAR%%` | `Topic.year` | إلزامي (`2025-2026` → `2025--2026`) |
| `%%FIELD%%` | ثابت | `Mathématiques` |
| `%%SPECIALTY%%` | `Specialty.name` | إلزامي |
| `%%EXAM%%` | يدوي | إلزامي |
| `%%LOGO%%` | `University.logoUrl` | فارغ → إطار محيّد |
| `%%BODY%%` | `Topic.problems` | مُولّد |

أي جذر غير مستبدل يوقف التوليد برسالة واضحة، لأن `%%X%%` في LaTeX مجرد تعليق صامت.

## الأمان

- `xelatex` يُشغّل عبر `execFile` بمصفوفة وسائط — **بدون shell**، فلا حقن أوامر.
- النصوص العادية تمرّ عبر `escapeLatex`.
- المحتوى الرياضي يمرّ عبر `sanitizeMath` التي تحذف `\write18`، `\input`، `\directlua`، `\csname`…
- لا تقبل مطلقًا LaTeX خامًا من مستخدم غير موثوق: اخزن الأسئلة كبيانات منظمة ثم حوّلها.
- كل ترجمة تجري في مجلد معزول تحت `os.tmpdir()` ويُحذف بعد النجاح.

## توسيع لاحق

نفس البنية تصلح لـ Licence / Master / مسابقات / امتحانات جامعية / أوراق TD-TP: انسخ القالب وغيّر سطر العنوان فقط، واحتفظ بنفس `\ExamHeader`.
