# 💡 ميزة "اقترح حلاً" — DocMath DZ

تحت كل تمرين **ليس له حل**، سيظهر:
- زر **"💡 اقترح حلاً"** — الطالب يكتب حله ويرسله
- زر **"👥 حلول الطلبة"** — عرض الحلول التي وافقت عليها
- الحلول المرسلة تبقى **في الانتظار (PENDING)** حتى توافق عليها أنت من لوحة المراجعة — لا سبام ولا حلول خاطئة تُنشر بدون إذنك ✅

---

## 📂 الملفات

| الملف | الوظيفة |
|---|---|
| `prisma/ADD-TO-SCHEMA.txt` | موديل جديد تضيفه لـ schema.prisma |
| `app/api/solutions/route.ts` | API الإرسال + عرض الحلول المنشورة |
| `app/api/solutions/moderate/route.ts` | API المراجعة (محمي بمفتاح سري) |
| `app/admin/solutions/page.tsx` | 🛡️ لوحة مراجعة جاهزة: موافقة ✅ / رفض ❌ |
| `components/SuggestSolution.tsx` | المكوّن الذي تضعه تحت كل تمرين |

---

## 🛠️ خطوات التركيب

### 1️⃣ فك الحزمة في مجلد موقعك
```powershell
cd D:\doctorate-topics-platform
Expand-Archive -Path "$env:USERPROFILE\Downloads\docmathdz-solutions-pack.zip" -DestinationPath . -Force
```

### 2️⃣ أضف الموديل إلى قاعدة البيانات
افتح `prisma\ADD-TO-SCHEMA.txt`، انسخ الموديل وألصقه في نهاية `prisma\schema.prisma`، ثم:
```powershell
npx prisma db push
npx prisma generate
```

### 3️⃣ ضع المكوّن تحت كل تمرين
في الصفحة التي تعرض تمارين الامتحان (حيث تعمل حلقة على problems)، أضف:
```tsx
import SuggestSolution from "@/components/SuggestSolution"

// داخل حلقة عرض التمارين، بعد نص التمرين:
<SuggestSolution
  topicId={topic.id}
  problemIndex={index}
  hasSolution={Boolean(problem.solution)}
/>
```
⚠️ عدّل `problem.solution` حسب اسم حقل الحل الحقيقي عندك (إذا لم يوجد حقل حل أصلاً، احذف السطر — سيظهر الزر تحت كل التمارين).
المكوّن يختفي تلقائياً إذا كان hasSolution = true.

### 4️⃣ المفتاح السري للمراجعة
في Vercel ← مشروعك ← Settings ← Environment Variables، تأكد أن لديك `MCP_SECRET` (موجود عندك مسبقاً) أو أضف `ADMIN_SECRET` جديداً.

### 5️⃣ انشر
```powershell
git add . ; git commit -m "Add suggest-solution feature" ; git push
```

---

## 🛡️ كيف تراجع الحلول؟
1. افتح: `https://www.docmathdz.dev/admin/solutions`
2. أدخل المفتاح السري ← "عرض الحلول في الانتظار"
3. لكل حل: ✅ موافقة ونشر أو ❌ رفض
4. بعد الموافقة، يظهر الحل فوراً لكل الزوار تحت التمرين بعلامة "✓ حل مقترح من [اسم الطالب]"

## ⚠️ ملاحظات
- إذا كان لديك `lib/prisma.ts` (singleton)، عدّل الاستيراد في ملفي API (التعليمات داخل كل ملف)
- التصميم بـ Tailwind بألوان موقعك الداكنة — عدّل الألوان إن أردت
- الحلول نصية حالياً — إذا أردت دعم LaTeX لاحقاً أخبرني
