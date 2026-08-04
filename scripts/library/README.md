# محرك مكتبة الكتب — `scripts/library`

محرك حصاد **كتب الرياضيات الحديثة** (2004 وما بعد) من مصادر مشروعة فقط.

> **مستقل تمامًا** عن مكتبة الكتب اليدوية الحالية (`LibrarySpecialty` / `LibraryBook`).
> لا يعدّل هذا المحرك أي جدول أو صفحة قائمة.

## الملفات

| الملف | الدور |
| --- | --- |
| `types.ts` | أنواع `RawItem` و `LibraryItem` وكل التعدادات |
| `taxonomy.ts` | 14 تصنيفًا مبنية على MSC 2020 + خرائط arXiv/OpenAlex + كلمات ثلاثية اللسان |
| `classify.ts` | المصنّف المتتالي بخمس طبقات + استنتاج المستوى من اسم السلسلة |
| `gate.ts` | بوابة القبول: كتب فقط، `>= 2004`، مصادر مشروعة، تصنيف إلزامي |
| `quality.ts` | طبقات الناشرين و `qualityScore` للترتيب |
| `normalize.ts` | تطبيع عربي/فرنسي + `canonicalKey` لكشف التكرار |

## القواعد غير القابلة للتفاوض

1. **كتب فقط.** لا أوراق ولا مقالات ولا فصول مفردة بلا كتاب أب.
2. **2004 وما بعد.** لا مسوحات قديمة ضعيفة الجودة.
3. **كل كتاب في تصنيف.** السجل غير المصنّف يذهب إلى الحجر لا إلى النشر.
4. **مصادر مشروعة فقط.** `BLOCKED_SOURCES` نهائية: لا Anna's Archive ولا LibGen ولا Z-Library ولا Sci-Hub.
5. **ثلاث حالات وصول:** `open` (نسخة عندنا) · `external` (يُقرأ عند الناشر) · `metadata-only` (بلا أي حقل تحميل في الاستجابة، لا مخفيًا بـ CSS).

## المستوى الدراسي (LMD)

`detectLevel()` يستنتج المستوى من **اسم سلسلة الناشر**، وهي إشارة دقيقة يغفلها الجميع:

| السلسلة | المستوى |
| --- | --- |
| Undergraduate Texts in Mathematics · SUMS | ليسانس |
| Graduate Texts in Mathematics · Universitext | ماستر |
| Lecture Notes in Mathematics · Astérisque · Grundlehren | دكتوراه |

## المصادر بترتيب التنفيذ

1. Springer OA API — `api.springernature.com/openaccess`
2. DOAB — OAI-PMH (86,000 كتاب محكّم)
3. zbMATH OA Subset — تفريغ Zenodo (رياضيات خالصة + رموز MSC)
4. HAL — Solr API، `docType_s:(OUV OR COUV)`، `rows=10000`
5. OAPEN · MIT Press OA
6. EuDML · Numdam · SMF (فرنسي)
7. LibreTexts · AIM · OpenStax
8. Stacks Project · HoTT · OpenLogic
9. Unpaywall (تفريغ) — إثراء: يحوّل `metadata-only` إلى `open`
10. OpenAlex / OpenAIRE — توسّع

## الخطوة التالية

`sources/springer.ts` و `sources/doab.ts` و `sources/hal.ts` ثم `run.ts` للحصاد و `/api/library/search`.
