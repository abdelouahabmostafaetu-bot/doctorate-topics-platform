# بوت SNDL الخاص

يعمل على حاسوبك داخل الجزائر. أرسل DOI في تيليجرام ← يعود لك بملف PDF.

## لماذا محليًا؟

SNDL يرفض أي اتصال من خارج الجزائر (`Accès interdit en dehors de l'Algerie!`).
حاسوبك في الجزائر ← يعمل بلا أي حيلة.

## التشغيل

```powershell
git pull
cd sndl-bot
copy .env.example .env
# افتح .env واملأ القيم
npm install
npm start
```

عند النجاح سترى:

```
✅ @your_bot يعمل الآن — أرسل DOI في تيليجرام
```

اترك النافذة مفتوحة. للإيقاف: `Ctrl + C`.

## الأوامر

| الأمر | الوظيفة |
| --- | --- |
| `/start` | رسالة ترحيب |
| `/quota` | المتبقي اليوم |
| `10.xxxx/yyyy` | جلب المقال |

يقبل أيضًا روابط تحتوي DOI (ScienceDirect، Springer، doi.org…).

## الترتيب الداخلي

1. يجلب بيانات المقال من Crossref
2. يجرّب الوصول المفتوح (Unpaywall)
3. إن فشل يدخل إلى SNDL ويجلب الملف عبر البروكسي

## ملاحظات

- أول طلب يأخذ 30–60 ثانية (تشغيل المتصفح + تسجيل الدخول)
- الجلسة تبقى 25 دقيقة ثم يُعاد الدخول تلقائيًا
- يحتاج Chrome أو Edge مثبتًا على الجهاز
- البوت يحذف الويب‍هوك تلقائيًا عند الإقلاع حتى لا يتعارض مع Azure

## التشغيل التلقائي مع Windows (اختياري)

`Task Scheduler` ← `Create Basic Task` ← `When I log on` ←
`Program: powershell.exe` ←
`Arguments: -WindowStyle Hidden -Command "cd 'D:\doctorate-topics-platform\sndl-bot'; npm start"`
