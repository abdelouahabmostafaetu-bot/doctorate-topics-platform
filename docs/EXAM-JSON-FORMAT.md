# صيغة ملف JSON لاستيراد الامتحانات (Exam JSON Format)

ملف JSON واحد = امتحان واحد (topic واحد مع تمارينه).

> قواعد كتابة الرياضيات والتنسيق **إلزامية** وموصّفة في `docs/LATEX-FORMATTING-RULES.md` — يجب قراءتها قبل كتابة أي تمرين.

## الاستيراد

```bash
# ملف واحد
node scripts/import-topic-json.mjs data/exams/blida-1-2021-general-02.json

# مجمّع: كل ملفات data/exams/*.json
node scripts/import-exams-bulk.mjs

# مجلد محدد
node scripts/import-exams-bulk.mjs data/exams/us-ou

# تحقق فقط بدون أي كتابة في قاعدة البيانات (موصى به قبل كل تشغيل كبير)
node scripts/import-exams-bulk.mjs data/exams/us-ou --dry-run

# الاستيراد كمسودة بدل النشر المباشر
node scripts/import-exams-bulk.mjs data/exams/us-ou --status=draft
```

المستورد المجمّع **آمن لإعادة التشغيل**: أي امتحان موجود مسبقًا بنفس `slug` يُتخطى بلا تعديل، ولا يحدف أي شيء من قاعدة البيانات.

## مثال كامل

```json
{
  "university": {
    "name": "US - University of Oklahoma (OU)",
    "nameAr": "جامعة أوكلاهوما"
  },
  "specialty": {
    "name": "Algebra",
    "nameAr": "الجبر"
  },
  "year": 2018,
  "examType": "specialty",
  "examNumber": 12,
  "durationMinutes": 180,
  "source": "https://math.ou.edu/graduate/exam/2018-08-algebra.pdf",
  "status": "published",
  "problems": [
    {
      "problemNumber": 1,
      "title": "i)",
      "statement": "Let $G$ be a finite group of order $75$.\n\n**(a)** Show that $G$ has a normal Sylow $5$-subgroup.\n\n**(b)** Deduce that $G$ is solvable.",
      "difficulty": "medium",
      "tags": ["group theory", "Sylow"]
    }
  ]
}
```

لاحِظ `\n\n` قبل كل فرع: سطر فارغ إلزامي. ولاحِظ أنه لا توجد أي علامات تنقيط.

## حقول الامتحان

| الحقل | إلزامي | الوصف |
|------|--------|--------|
| `university.name` | ✅ | الاسم الموحّد للجامعة. للدول الأجنبية يجب أن يبدأ بـ `XX - ` حيث `XX` رمز الدولة (مثل: `US - `، `SG - `، `TW - `) لأن صفحة `/world` تعتمد على هذه البادئة |
| `university.nameAr` | — | الاسم العربي (افتراضيًا = `name`) |
| `university.slug` | — | يُحسب تلقائيًا من `name` |
| `specialty.name` | — | افتراضيًا `Mathematics`. أمثلة: `Algebra`، `Analysis`، `Real Analysis`، `Topology`، `Probability` |
| `specialty.nameAr` | — | الاسم العربي للتخصص |
| `year` | ✅ | رقم السنة |
| `examType` | — | `specialty` أو `general` (افتراضيًا `general`) |
| `examNumber` | — | رقم الإعلان/الدورة (افتراضيًا `1`). الأرشيف الأجنبي يستخدم `رمز المادة × 10 + رمز الدورة` — مثلًا OU: `1x` جبر، `2x` تحليل، `3x` طوبولوجيا؛ الدورة `1` = جانفي، `2` = أوت. فيكون `12` = جبر أوت |
| `slug` | — | يُحسب تلقائيًا: `<university.slug>-<year>-<examType>-<examNumber مع صفر>` |
| `title` | — | عنوان الامتحان (يُولد تلقائيًا إن غاب) |
| `source` | — | رابط الملف الرسمي الأصلي (PDF) — **مكان المصدر الوحيد** |
| `durationMinutes` | — | مدة الامتحان بالدقائق (180 عادة لامتحانات qualifying) |
| `coefficient` | — | المعامل |
| `status` | — | `published` أو `draft` أو `needs_completion`. يطغى على `--status` |

## حقول التمرين

| الحقل | إلزامي | الوصف |
|------|--------|--------|
| `statement` | ✅ | نص التمرين (Markdown + LaTeX) حسب `docs/LATEX-FORMATTING-RULES.md` |
| `problemNumber` | — | الترتيب (افتراضيًا حسب موقعه في المصفوفة) |
| `title` | — | عنوان قصير أو رقم التمرين الأصلي من الملف (مثل `"Part I — 1."` أو `"i)"`) — بلا علامات تنقيط |
| `difficulty` | — | `easy` \| `medium` \| `hard` (افتراضيًا `medium`) |
| `tags` | — | مصفوفة نصوص |
| `solution` | — | الحل إن وجد. أرشيف الامتحانات الرسمية يُستورد دون حلول (`null`) |
| `remark` | — | ملاحظة داخلية (تظهر للمديرين فقط). **ممنوع** أن تبدأ بـ `Source:` — المستورد يحذفها تلقائيًا مع تنبيه |

## قواعد الكتابة (ملخّص — المرجع الكامل في `docs/LATEX-FORMATTING-RULES.md`)

**القاعدة 1 — الترقيم والمسافات:**

- سطر فارغ بعد رقم التمرين.
- كل فرع `**(a)**`، `**(b)**`، `**(c)**` في سطر مستقل مع سطر فارغ بينها.
- سطر فارغ قبل `$$` وبعدها.
- سطر فارغ واحد فقط، ولا يُكسر النص السردي في منتصفه.
- يُحفظ نمط الترقيم الأصلي للملف (`i)`، `(1)`، `(a)` …).

**القاعدة 2 — لا علامات تنقيط:**

- لا تُكتب `[10 points]` ولا `(5 marks)` ولا `[20]` ولا `/20` ولا تعليمات التنقيط.
- إن وجدت في الملف الأصلي تُحذف، وإن لم توجد فلا تُخترع. المطلوب: التمرين وحده.

**الرياضيات:** داخل السطر `$ … $` ، معروضة `$$` وحدها في سطر مستقل. **ممنوع** `\( … \)` و `\[ … \]`.

**أمانة المصدر:** لا حلول، لا تلميحات، لا تعليقات، ولا تغيير للرموز أو الثوابت أو الترتيب.

## ترتيب المجلدات المقترح

```
data/exams/
  us-ou/
    2018-08-algebra.json
    2018-08-analysis.json
    2018-08-topology.json
  us-arizona/
    …
```

## إضافة دولة جديدة

سطر واحد في `src/lib/country-meta.ts`، ويجب أن يطابق المفتاح (ISO) بادئة اسم الجامعة في قاعدة البيانات:

```ts
CA: {
  slug: "canada",
  nameAr: "كندا",
  nameNative: "Canada",
  nameEn: "Canada",
  flag: "https://flagcdn.com/w80/ca.png",
},
```

ثم تُسمّى الجامعات `CA - University of Toronto` وتظهر تلقائيًا في `/world/canada`.

## قبل أي تشغيل كبير

```bash
node backup-db.mjs                                    # نسخة احتياطية
node scripts/import-exams-bulk.mjs <المجلد> --dry-run  # تحقق
node scripts/import-exams-bulk.mjs <المجلد>            # استيراد
```

> تنبيه: ممنوع نهائيًا حذف أو تعديل معطيات الجزائر أو أي دولة أخرى أثناء استيراد دولة جديدة.
