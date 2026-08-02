# 🤖 بوت تيليجرام — منصة مواضيع دكتوراه الرياضيات

بوت يعيد نفس تجربة الموقع: يختار المستخدم **الجامعة** ثم **السنة** ثم **التخصص** ثم **نوع المسابقة**، أو يختار "الكل" في أي خطوة، ثم يحمّل ملف PDF للمواضيع المطابقة (تحميل الكل تمامًا كما في الموقع).

يعتمد البوت على نفس قاعدة بيانات الموقع ونفس مولّد الـ PDF، عبر نقطتي وصول جديدتين محميتين بمفتاح سري:

- `GET /api/bot/meta` — يرجع الجامعات والتخصصات والسنوات.
- `GET /api/bot/pdf?university=&year=&specialty=&examType=&part=` — يولّد الـ PDF (يقسّم تلقائيًا إلى أجزاء للرزم الكبيرة).

كلاهما يطلب رأس `x-bot-secret` مساويًا لمتغير البيئة `BOT_API_SECRET`.

---

## 1️⃣ إنشاء البوت والحصول على الرمز (BotFather)

1. افتح تيليجرام وابحث عن **@BotFather**.
2. أرسل `/newbot`.
3. اكتب اسم البوت (اسم معروض).
4. اكتب معرّف البوت ويجب أن ينتهي بـ `bot` (مثل: `doctorat_math_bot`).
5. سيعطيك BotFather **رمزًا (token)** بالشكل `123456:ABC-...` — احتفظ به ولا تنشره.
6. (اختياري) `/setdescription` و `/setuserpic` لتحسين مظهر البوت.

---

## 2️⃣ إعداد الموقع (Azure App Service)

أضف متغير بيئة جديد في **Azure Portal ← App Service (موقعك) ← Settings ← Environment variables ← Application settings**:

```
BOT_API_SECRET = <قيمة عشوائية طويلة>
```

لتوليد قيمة آمنة:

```bash
openssl rand -hex 32
```

ثم اضغط **Apply/Save** — سيعيد App Service التشغيل تلقائيًا حتى تعمل نقطتا `/api/bot/*`.

> ملاحظة: توليد الـ PDF يجري على الموقع (نفس محرك puppeteer + chromium الذي يهيّئه `startup.sh` على App Service)، لذلك لا يحتاج البوت إلى chromium.

---

## 3️⃣ تشغيل البوت

داخل مجلد `bot/`:

```bash
cd bot
cp .env.example .env
# افتح .env واملأ القيم الثلاث
npm install
npm start
```

متغيرات `.env`:

| المتغير | الوصف |
|---|---|
| `TELEGRAM_BOT_TOKEN` | رمز BotFather |
| `PLATFORM_API_BASE` | رابط موقعك على Azure (مثل `https://<app-name>.azurewebsites.net`) |
| `BOT_API_SECRET` | نفس القيمة الموجودة في إعدادات Azure App Service |

إذا ظهر `✅ Bot is running (polling)...` فالبوت يعمل. افتح البوت في تيليجرام واكتب `/start`.

---

## 4️⃣ الاستضافة الدائمة

البوت يعمل بطريقة polling ويحتاج عملية دائمة التشغيل. خيارات:

- **Azure** — WebJob مستمر (Continuous WebJob) أو Azure Container Instance، بما أنك تستخدم Azure أصلًا.
- **Railway** أو **Render** (Background Worker).
- **VPS** (مع `pm2` لإبقائه يعمل).
- جهازك الشخصي للتجربة.

مثال pm2:

```bash
npm install -g pm2
pm2 start index.js --name doctorat-bot
pm2 save
```

> تنبيه: لا تشغّل البوت داخل نفس App Service الخاص بالموقع كعملية `npm start` رئيسية، لأن ذلك سيوقف الموقع. استخدم WebJob منفصلًا أو استضافة مستقلة.

---

## ملاحظات

- حد حجم الملف في بوتات تيليجرام هو **50 ميجابايت** لكل ملف. الرزم الكبيرة تُقسّم تلقائيًا إلى أجزاء.
- البوت يرسل المواضيع بدون الحلول (مطابق لتحميل "الكل" في الموقع).
- لا ترفع ملف `.env` إلى GitHub.
