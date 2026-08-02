# 🧮 مساعد الرياضيات

بوت تيليجرام خاص للبحث عن المقالات والكتب الرياضية وتحميلها.
يعمل على حاسوبك داخل الجزائر (SNDL يحجب الاتصال من الخارج).

## ما ذا يقبل؟

| المُدخل | مثال |
| --- | --- |
| DOI | `10.1016/j.jmaa.2025.130277` |
| arXiv | `2401.12345` أو `math/0611800` |
| ISBN | `978-3-540-76349-8` |
| رابط | رابط ScienceDirect / Springer… |
| اسم مؤلف | `Xing Fu` |
| عنوان أو موضوع | `Wolff potentials elliptic` |

## المصادر

**بحث:** OpenAlex · arXiv · Crossref · Semantic Scholar · Open Library · Google Books

**تحميل (بهذا الترتيب):**

1. 📐 arXiv
2. 🌍 الوصول المفتوح (OpenAlex)
3. 🔓 Unpaywall
4. 🧠 Semantic Scholar
5. 📚 CORE (يحتاج مفتاحًا مجانيًا)
6. 🏛️ SNDL (الأخير — الأبطأ)

✅ أغلب الطلبات تنتهي في الخطوات 1–4 خلال ثوانٍ، بلا متصفّح.

## التشغيل

```powershell
git pull
cd sndl-bot
copy .env.example .env
# املأ القيم داخل .env
npm install
npm start
```

## الأوامر

| الأمر | الوظيفة |
| --- | --- |
| `/start` | الترحيب والأمثلة |
| `/quota` | المتبقي اليوم |
| `/mode` | تبديل: رياضيات فقط ⇄ كل التخصصات |

## ملاحظات

- 🧮 افتراضيًا النتائج **رياضيات فقط** (OpenAlex concept + `cat:math*` في arXiv)
- 🟢 = متاح مجانًا · 🔒 = يحتاج SNDL
- الأزرار تحت النتائج تحمّل المقال مباشرة
- CORE اختياري: احصل على مفتاح مجاني من core.ac.uk وضعه في `CORE_API_KEY`
