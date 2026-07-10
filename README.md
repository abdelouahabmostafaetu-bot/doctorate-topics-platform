# منصة مواضيع دكتوراه الرياضيات — doctorate-topics-platform

أرشيف مواضيع مسابقات الدكتوراه في الرياضيات بالجزائر (Next.js 15 + MongoDB Atlas).

## 🚀 التشغيل محليًا (أول مرة)

1. ثبّت [Node.js LTS](https://nodejs.org) (الإصدار 20 أو أحدث)
2. افتح الطرفية (Terminal / CMD) داخل مجلد المشروع ثم:

```bash
npm install
npm run dev
```

3. افتح المتصفح على: http://localhost:3000

## 📤 الرفع إلى GitHub (أول مرة)

أنشئ repo فارغًا على GitHub باسم `doctorate-topics-platform` ثم:

```bash
git init
git add .
git commit -m "Week 1: initial setup - Next.js 15 + Tailwind + RTL"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/doctorate-topics-platform.git
git push -u origin main
```

## 🌐 النشر على Vercel

1. ادخل [vercel.com](https://vercel.com) وسجّل بحساب GitHub
2. Add New ← Project ← اختر `doctorate-topics-platform` ← Deploy
3. بعد ذلك، كل `git push` ينشر تلقائيًا ✨

## 🔐 الأسرار

انسخ `.env.example` إلى `.env.local` واملأ القيم عند الحاجة (الأسبوع 2 فما فوق).
⚠️ لا ترفع `.env.local` إلى GitHub ولا تلصق محتواه في أي محادثة.

## 🗺️ خارطة الطريق

الخطة الكاملة (8 أسابيع) وكل الوثائق في صفحة Notion:
وثيقة SRS — المعمارية — Database Design — Design System — Roadmap

- **الأسبوع 1 (هذا المجلد):** إعداد + نشر أول ✅
- **الأسبوع 2:** schema.prisma + استيراد البيانات من mylibrary
- **الأسبوع 3:** صفحات التصفح + KaTeX
- **الأسبوع 4:** البحث والفلاتر
- **الأسبوع 5:** الحسابات والأدوار
- **الأسبوع 6:** لوحة الإدارة
- **الأسبوع 7:** Auto Save + System Status + What's New
- **الأسبوع 8:** الاختبار والإطلاق 🎉

---

## 🗄️ الأسبوع 2 — قاعدة البيانات واستيراد بياناتك

> ⚠️ قبل أي شيء: خذ نسخة احتياطية من `doctorateproblems` (من Atlas: Collections ← زر Export)

1. انسخ `.env.example` إلى `.env.local` واملأ:
   - `DATABASE_URL` — رابط Cluster0 مع اسم القاعدة **doctorate_platform**
   - `DATABASE_URL_MYLIBRARY` — نفس الرابط لكن باسم القاعدة **mylibrary**
2. ثبّت الحزم الجديدة:
   ```bash
   npm install
   ```
3. أنشئ المجموعات في القاعدة الجديدة:
   ```bash
   npm run db:push
   ```
4. شغّل الاستيراد (يقرأ فقط من mylibrary — لا يعدّلها):
   ```bash
   npm run import
   ```
5. تحقق من النتيجة:
   ```bash
   npm run db:studio
   ```
   - عدد `topics` = عدد مستندات `doctorateproblems`
   - كل موضوع له `slug` فريد و `legacyId`
   - راجع حقول `nameAr` للجامعات والتخصصات وعدّلها للعربية من Prisma Studio
6. ارفع التقدم:
   ```bash
   git add . && git commit -m "Week 2: Prisma schema + import from mylibrary" && git push
   ```

✅ بعدها أضف `DATABASE_URL` أيضًا في إعدادات Vercel (Settings ← Environment Variables) حتى ينجح النشر في الأسابيع القادمة.

---

## الأسبوع 3 — صفحات التصفح + عرض المعادلات (KaTeX)

### الجديد في هذه النسخة

- الصفحة الرئيسية: إحصائيات حقيقية من قاعدة البيانات + أحدث المواضيع
- صفحة `/universities`: كل الجامعات مع عدد المواضيع
- صفحة `/universities/<slug>`: مواضيع الجامعة مجمعة حسب السنة
- صفحة `/topics/<slug>`: الموضوع كاملًا — نص كل تمرين ومعادلاته بعرض KaTeX، والحل داخل زر قابل للطي
- مكونات جديدة: Header/Footer + TopicCard + MathContent
- تحديث مهم: إصلاح schema.prisma وسكريبت الاستيراد (نسخة v2 — التجميع حسب examId)

### خطوات التشغيل

1. `npm install` (حزم جديدة: katex، react-markdown، remark-math، rehype-katex، remark-gfm)
2. `npm run dev` ثم افتح http://localhost:3000

### اختبار القبول 🧪

- الصفحة الرئيسية تعرض الأعداد الصحيحة (564 موضوعًا، 1602 تمرينًا)
- افتح أي موضوع من صفحة جامعة: المعادلات تظهر بشكل رياضي صحيح (وليس نصًا خامًا مثل \\varphi)
- زر "عرض الحل" يفتح ويغلق
- جرّب على عرض هاتف (360px): كل شيء مقروء والمعادلات الطويلة تنزلق أفقيًا

### بعد نجاح الاختبار

```powershell
git add .
git commit -m "Week 3: public browsing pages + KaTeX rendering"
git push
```

ثم في Vercel: Settings ← Environment Variables ← أضف `DATABASE_URL` (رابط doctorate_platform) وأعد النشر — الموقع المنشور سيعرض بياناتك الحقيقية.

### القادم (الأسبوع 4)

البحث النصي + الفلاتر (الجامعة، السنة، الصعوبة، الوسوم) عبر `/api/search` والفهرس النصي المُنشأ في الأسبوع 2.

---

## الأسبوع 4 — البحث النصي + الفلاتر

### الجديد في هذه النسخة

- صفحة `/search`: بحث نصي في العناوين والوسوم والمصدر (يستخدم الفهرس النصي `topics_text_search` المُنشأ في الأسبوع 2).
- فلاتر: الجامعة، السنة، الصعوبة، ونوع المسابقة — تعمل معًا ومع البحث النصي.
- ترتيب النتائج حسب الصلة (`textScore`) عند البحث، وحسب السنة عند الفلترة فقط.
- تنقل بين الصفحات (20 نتيجة لكل صفحة) مع الحفاظ على الفلاتر المختارة.
- زر "بحث 🔍" أُضيف إلى الترويسة في كل الصفحات.

### التشغيل محليًا

لا توجد حزم جديدة في هذا الأسبوع، لكن شغّل `npm install` احتياطيًا ثم:

```bash
npm run dev
```

### اختبار القبول (الأسبوع 4)

1. افتح `http://localhost:3000/search`.
2. اكتب كلمة موجودة في مواضيعك (مثل `intégrale` أو `algèbre`) → تظهر نتائج مرتبة حسب الصلة.
3. جرّب فلتر الجامعة + السنة معًا → تتقلص النتائج بشكل صحيح.
4. جرّب فلتر الصعوبة وحده (دون كلمة بحث) → يعمل.
5. تنقل بين الصفحات (التالي/السابق) → تبقى الفلاتر محفوظة في الرابط.
6. زر "مسح الفلاتر" يعيد كل شيء إلى الأصل.

> ملاحظة: يعتمد البحث النصي على الفهرس `topics_text_search`. إذا لم تظهر نتائج البحث النصي، أعد تشغيل `npm run import` (الذي ينشئ الفهارس) أو تأكد من وجوده في Atlas.

### الرفع (بعد نجاح الاختبار)

```bash
git add .
git commit -m "Week 4: search + filters"
git push
```

لا حاجة لمتغيرات جديدة في Vercel — `DATABASE_URL` الموجود يكفي.

---

## الأسبوع 5 — تسجيل الدخول والأدوار (Auth.js + Google)

### الجديد في هذه النسخة

- تسجيل الدخول عبر **Google** باستخدام **Auth.js v5** (`next-auth`).
- ثلاثة أدوار: `USER` (افتراضي) · `ADMIN` · `SUPER_ADMIN`.
- صفحة `/signin` بزر دخول Google، وزر خروج + اسم المستخدم في الترويسة.
- صفحة `/admin` محمية (لا يدخلها إلا ADMIN أو SUPER_ADMIN) تعرض إحصائيات سريعة.
- حماية على مستوى `middleware` لكل ما تحت `/admin`.
- سكريبت لترقية مستخدم إلى مدير: `npm run set-admin`.
- نماذج قاعدة بيانات جديدة لـ Auth.js: `accounts` و`sessions` و`verification_tokens`.

### الحزم الجديدة — لازم `npm install`

```bash
npm install
```

(تُضيف `next-auth` و`@auth/prisma-adapter`)

### الإعداد (مرة واحدة)

1. **ولّد سر المصادقة** وضعه في `.env`:
   ```bash
   npx auth secret
   ```
   ثم انسخ القيمة إلى `AUTH_SECRET="..."` في ملف `.env`.
2. **Google Cloud Console** → APIs & Services → Credentials → OAuth Client (Web):
   - Authorized redirect URI (محليًا): `http://localhost:3000/api/auth/callback/google`
   - انسخ `Client ID` و`Client Secret` إلى `.env` (`GOOGLE_CLIENT_ID` و`GOOGLE_CLIENT_SECRET`).
   - ⚠️ إن كنت تستخدم السر القديم المكشوف سابقًا، أنشئ سرًّا جديدًا الآن.
3. **حدّث قاعدة البيانات** (لإنشاء مجموعات accounts/sessions):
   ```bash
   npm run db:push
   ```

### التشغيل وال��ختبار

```bash
npm run dev
```

aختبار القبول (الأسبوع 5):
1. افتح `http://localhost:3000/signin` واضغط "الدخول عبر Google" → يجب أن تعود مسجّلًا، ويظهر اسمك وزر "خروج" في الترويسة.
2. افتح `http://localhost:3000/admin` وأنت مستخدم عادي → يُعاد توجيهك (ممنوع).
3. رقِّ نفسك إلى مدير (بعد أول تسجيل دخول):
   ```bash
   npm run set-admin -- بريدك@gmail.com SUPER_ADMIN
   ```
4. حدّث الصفحة → يظهر رابط "الإدارة" في الترويسة، وتفتح `/admin` وتعرض الإحصائيات.
5. اضغط "خروج" → تعود زائرًا، و`/admin` يمنعك.

### الرفع والنشر

```bash
git add .
git commit -m "Week 5: auth + roles"
git push
```

في **Vercel** → Settings → Environment Variables أضف: `AUTH_SECRET`، `GOOGLE_CLIENT_ID`، `GOOGLE_CLIENT_SECRET` (بالإضافة إلى `DATABASE_URL`). وفي Google Console أضف رابط إعادة توجيه الإنتاج: `https://your-app.vercel.app/api/auth/callback/google`.

---

## الأسبوع 6 — لوحة الإدارة الكاملة

### الجديد في هذه النسخة

- `/admin` أصبحت لوحة كاملة بأربعة أقسام (تبويبات): نظرة عامة، المواضيع، الجامعات، البلاغات.
- **إدارة المواضيع** (`/admin/topics`): بحث + تصفية حسب الحالة، تعديل العنوان/الحالة/رقم الموضوع/المعامل/المدة، حذف نهائي.
- **رفع ملفات PDF** لكل موضوع (ملف الموضوع + ملف الحل) مباشرة من صفحة التعديل — تُخزَّن في مساحة تخزين متوافقة مع S3 (اقترحنا Cloudflare R2 المجاني).
- **إدارة الجامعات** (`/admin/universities`): تعديل الاسم بالعربية والمدينة، وإضافة جامعة جديدة.
- **مراجعة البلاغات** (`/admin/reports`): عرض كل البلاغات مع تصفية حسب الحالة، وتحديدها كـ"تم الحل" أو "مرفوض".

### الحزم الجديدة — لازم `npm install`

```bash
npm install
```

(تُضيف `@aws-sdk/client-s3` لرفع الملفات)

### الإعداد — تخزين الملفات (Cloudflare R2، مجاني حتى 10GB)

1. أنشئ حسابًا على [Cloudflare](https://dash.cloudflare.com) (مجاني) → من القائمة الجانبية اختر **R2**.
2. اضغط **Create bucket** وسمّه مثلًا `doctorate-files` → Create.
3. من إعدادات الـ bucket ← **Settings** ← فعّل **Public Access** (يعطيك رابطًا من نوع `https://pub-xxxx.r2.dev`) — هذا هو `STORAGE_PUBLIC_URL_BASE` (بدون "/" في النهاية).
4. من القائمة الجانبية اذهب إلى **R2** ← **Manage R2 API Tokens** ← **Create API Token**:
   - الصلاحية: Object Read & Write، ثم حدّد الـ bucket الذي أنشأته.
   - بعد الإنشاء ستظهر لك: `Access Key ID` و`Secret Access Key` و`Endpoint` (رابط ينتهي بـ `.r2.cloudflarestorage.com`).
5. ضع القيم في `.env`:
   ```
   STORAGE_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
   STORAGE_ACCESS_KEY="..."
   STORAGE_SECRET_KEY="..."
   STORAGE_BUCKET="doctorate-files"
   STORAGE_PUBLIC_URL_BASE="https://pub-xxxx.r2.dev"
   ```
6. لا حاجة لتشغيل `db:push` هذا الأسبوع (لا تغييرات في قاعدة البيانات).

> 💡 لن تعمل عمليات رفع الملفات بدون هذه الإعدادات، لكن باقي لوحة الإدارة (المواضيع، الجامعات، البلاغات) تعمل فورًا بدونها.

### التشغيل والاختبار

```bash
npm run dev
```

اختبار القبول (الأسبوع 6) — سجّل دخولك كمدير (`SUPER_ADMIN` أو `ADMIN`) ثم:
1. افتح `/admin` → تظهر التبويبات الأربعة والإحصائيات.
2. افتح `/admin/topics` → بحث عن موضوع، ثم افتح "تعديل" لأحد المواضيع.
3. غيّر العنوان أو الحالة واضغط "حفظ التعديلات" → يُحفظ بدون خطأ.
4. ارفع ملف PDF تجريبي في خانة "ملف الموضوع" (بعد إعداد R2) → يظهر رابط الملف ويفتح في تبويب جديد.
5. جرّب "حذف" على ملف أو على موضوع تجريبي → يطلب تأكيدًا قبل الحذف.
6. افتح `/admin/universities` → عدّل الاسم العربي لجامعة واحفظ → يظهر التغيير في `/universities`.
7. افتح `/admin/reports` → إن وُجدت بلاغات، جرّب زر "تم الحل".

### الرفع والنشر

```bash
git add .
git commit -m "Week 6: full admin panel + PDF uploads + report review"
git push
```

في **Vercel** أضف متغيرات التخزين الخمسة (`STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET`, `STORAGE_PUBLIC_URL_BASE`) حتى يعمل رفع الملفات في الموقع المنشور أيضًا.
