# 🔍 محرّك البحث Meilisearch — Meilisearch Search Engine

دليل إعداد البحث الاحترافي لصفحة `/theses`.
Setup guide for the professional search on the `/theses` page.

---

## 1. لماذا؟ — Why

| الميزة / Feature | MongoDB (قديم) | Meilisearch (جديد) |
| --- | --- | --- |
| السرعة / Speed | ~300–1500 ms | < 50 ms |
| بحث أثناء الكتابة / Search-as-you-type | ❌ | ✅ |
| تصحيح الأخطاء الإملائية / Typo tolerance | ❌ | ✅ |
| مرادفات عربية/فرنسية / Synonyms | ❌ | ✅ |
| فلاتر مع عدّادات / Faceted filters with counts | جزئي | ✅ |

> إذا لم تضبط `MEILI_HOST` و`MEILI_MASTER_KEY`، تعمل الصفحة كالسابق عبر MongoDB.<br>If the env vars are unset, the page keeps working with the MongoDB fallback.

---

## 2. تشغيل الخادم — Run the server

### Docker (الأسهل / easiest)

```bash
docker run -d --name meili -p 7700:7700 \
  -e MEILI_MASTER_KEY="MY_LONG_RANDOM_KEY" \
  -v meili_data:/meili_data \
  getmeili/meilisearch:v1.11
```

### Windows (بدون Docker / no Docker)

```powershell
# حمّل meilisearch-windows-amd64.exe من GitHub Releases
.\meilisearch.exe --master-key "MY_LONG_RANDOM_KEY"
```

### Meilisearch Cloud (للإنتاج / production)

<https://cloud.meilisearch.com> — خطة مجانية تكفي لأكثر من 20 000 وثيقة.

---

## 3. متغيرات البيئة — Environment

في `.env.local`:

```ini
MEILI_HOST=http://127.0.0.1:7700
MEILI_MASTER_KEY=MY_LONG_RANDOM_KEY
```

⚠️ المفتاح **لا يصل أبداً إلى المتصفّح**: كل طلبات البحث تمرّ عبر الوكيل
`/api/theses/search` الذي يسمح فقط بـ `multi-search` و `search` و `facet-search`.
The key never reaches the browser; the proxy allow-lists read-only endpoints.

---

## 4. المزامنة — Sync MongoDB → Meilisearch

```bash
npm install
npm run meili:sync
```

- ينشئ فهرس `theses` (primary key = `id`) ويضبط الإعدادات ثم يدفع الوثائق على دفعات 1000.
- Creates the `theses` index, applies settings, pushes documents in batches of 1000.
- أعد تشغيله **بعد كل حصاد** / re-run after every harvest:

```bash
npm run harvest
npm run meili:sync
```

---

## 5. الإعدادات المطبّقة — Applied settings

| الإعداد | القيمة |
| --- | --- |
| `searchableAttributes` | title, authors, supervisors, keywords, abstract, uniAr, uniFr |
| `filterableAttributes` | uniSlug, uniAr, degree, degreeAr, branch, branchAr, year, lang, hasPdf, wilaya |
| `sortableAttributes` | year |
| `typoTolerance` | oneTypo ≥ 4 أحرف، twoTypos ≥ 8 |
| `maxTotalHits` | 100000 |
| `maxValuesPerFacet` | 200 |

المرادفات / Synonyms: دكتوراه ↔ doctorat ↔ phd، ماجستير ↔ magister،
رياضيات ↔ mathematiques ↔ math، تحليل دالّي ↔ analyse fonctionnelle،
معادلات تفاضلية ↔ edp ↔ pde، احتمالات ↔ probabilites، إحصاء ↔ statistique،
جبر ↔ algebre، هندسة ↔ geometrie، طوبولوجيا ↔ topologie، أمثلية ↔ optimisation، تشفير ↔ cryptographie.

---

## 6. الملفات — Files

| الملف | الدور |
| --- | --- |
| `src/lib/theses/meili.ts` | العميل + `meiliEnabled()` + نوع `ThesisHit` |
| `src/lib/theses/meili-sync.ts` | منطق المزامنة والإعدادات |
| `scripts/meili-sync.ts` | سكربت CLI (`npm run meili:sync`) |
| `src/app/api/theses/search/[...path]/route.ts` | وكيل آمن للبحث |
| `src/app/theses/ThesesSearch.tsx` | واجهة InstantSearch (RTL) |
| `src/app/theses/page.tsx` | يختار Meili أو Mongo تلقائياً |

---

## 7. استكشاف الأخطاء — Troubleshooting

| المشكلة | الحل |
| --- | --- |
| الصفحة تعرض الواجهة القديمة | `MEILI_HOST` أو `MEILI_MASTER_KEY` غير مضبوط → أعد تشغيل `npm run dev` |
| صفر نتائج | لم تُشغّل `npm run meili:sync` |
| 403 من الوكيل | مسار غير مسموح به — المسموح: multi-search / search / facet-search |
| `ECONNREFUSED 7700` | خادم Meilisearch متوقّف |
