# حزمة الإصلاح — docmathdz.dev

## محتوى الحزمة

| الملف | الوظيفة |
|---|---|
| `fix-universities.js` | سكريبت Prisma لتوحيد أسماء الجامعات (82 ← ~50 اسم فرنسي موحد) بدون حذف أي امتحان |
| `public/manifest.json` | ملف تعريف تطبيق PWA (الاسم، الأيقونات، الألوان) |
| `next.config.pwa-EXAMPLE.js` | مثال إعداد PWA — انسخ محتواه يدوياً إلى `next.config.js` |

## 1) إصلاح أسماء الجامعات

```powershell
# تجربة بدون كتابة (Dry Run)
node fix-universities.js

# التنفيذ الفعلي بعد التأكد
node fix-universities.js --apply
```

⚠️ إذا كان اسم الموديل في `schema.prisma` ليس `exam`، عدّل السطر `const MODEL = prisma.exam` في السكريبت.

## 2) تحويل الموقع إلى تطبيق PWA

1. `npm install next-pwa`
2. انسخ محتوى `next.config.pwa-EXAMPLE.js` إلى `next.config.js` (مع الحفاظ على إعداداتك الحالية داخل `withPWA({...})`)
3. أضف أيقونتين في مجلد `public/`:
   - `icon-192.png` (192×192)
   - `icon-512.png` (512×512)
4. في `app/layout.tsx` أضف داخل metadata:
   ```tsx
   export const metadata = {
     manifest: "/manifest.json",
     themeColor: "#0f172a",
   }
   ```
5. ارفع التغييرات: `git add . && git commit -m "Add PWA" && git push`
6. على هاتفك: افتح الموقع في Chrome ← "تثبيت التطبيق"
7. لصنع APK: ادخل من هاتفك إلى pwabuilder.com ← اكتب رابط موقعك ← Package for Stores ← Android ← حمّل APK وثبّته مباشرة
