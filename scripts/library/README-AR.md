# استيراد كتب الرياضيات إلى المكتبة

استيراد جماعي من واجهات مفتوحة، بلا مفاتيح وبلا تسجيل، وبلا أي محتوى مقرصن.

## المصادر

| المصدر | ما يجلبه | الرخصة | استضافة الملف |
| --- | --- | --- | --- |
| **Gutendex** (Project Gutenberg) | كتب رياضيات كلاسيكية | ملك عام | مسموحة |
| **OpenAlex** | كتب أكاديمية مفتوحة الوصول | حسب السجل | فقط عند رخصة مفتوحة |

## التخزين

الملفات تُحفظ على **Azure Blob Storage** (رصيد Azure for Students)، في حاوية مستقلة اسمها `library` حتى لا تختلط بملفات المحاضرات في `lectures`. تُنشأ الحاوية تلقائيًا عند أول رفع بوصول قراءة عام (`access: blob`).

إن غابت إعدادات Azure، يرجع السكربت تلقائيًا إلى Cloudflare R2 دون تعديل أي شيء.

| المتغير | الإلزامية |
| --- | --- |
| `DATABASE_URL` | دائمًا |
| `AZURE_STORAGE_ACCOUNT` | عند تفعيل `hostFiles` |
| `AZURE_STORAGE_KEY` | عند تفعيل `hostFiles` |
| `AZURE_LIBRARY_CONTAINER` | اختياري (افتراضي `library`) |

## التشغيل من GitHub (الطريقة الموصى بها)

`Actions` ← `Import math library` ← `Run workflow`، ثم اختر المصدر والعدد.

**ابدأ دائمًا بوضع `dryRun` مفعّلًا**، حمّل ملف `library-import-report` من نتائج التشغيل وراجعه، ثم أعد التشغيل بعد إلغاء تفعيل `dryRun`.

## التشغيل محليًا

```bash
npm run import-library -- --source=gutenberg --limit=100 --dry-run
npm run import-library -- --source=gutenberg --limit=100 --host-files
npm run import-library -- --source=all --limit=300
```

## التصنيفات

كل كتاب يُسند آليًا إلى تصنيف واحد ضمن `library_specialties`، ويُنشأ التصنيف إن لم يكن موجودًا:

Algebra · Analysis · Geometry · Topology · Number Theory · Probability & Statistics · Logic & Set Theory · Differential Equations · Numerical & Applied Mathematics · History & Education · General Mathematics

قواعد التصنيف في `scripts/library/normalize.ts` داخل `CATEGORY_RULES` — تُعدَّل بحرية.

## ضمانات مهمة

- **بلا تكرار:** قبل كل إدخال تُقارَن الكتب بالموجود عبر رابط التحميل وعبر بصمة (العنوان + المؤلف) بعد التطبيع، فإعادة التشغيل آمنة.
- **بلا محتوى محمي:** كتب Gutenberg تُقبل فقط عندما يكون `copyright = false`، والملفات لا تُرفع إلا عند رخصة ضمن القائمة البيضاء في `isRedistributable`.
- **فلتر رياضي:** `isMathematics` يمنع دخول الكتب غير الرياضية.
- **روابط تعمل:** عند تفعيل `hostFiles` تُنسخ الملفات إلى Azure، فيبقى زر التحميل شغّالًا حتى لو تعطّل المصدر الأصلي.

## ما لا يفعله هذا السكريبت

لا يتصل بـ Anna's Archive ولا بأي مكتبة ظل، ولا يسحب محتوى SNDL. تلك المصادر تعرّض المنصة والحساب الجامعي للحجب.
