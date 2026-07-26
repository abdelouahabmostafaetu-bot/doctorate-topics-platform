# ☕ DocMath DZ — صفحة قهوة الدكتوراه + لوحة التحكم

حزمة جاهزة للنسخ (Next.js App Router + TypeScript + MongoDB + KaTeX).

## 1) التثبيت

```bash
npm i katex mongodb
npm i -D @types/katex
```

`.env.local`:

```
MONGODB_URI="mongodb+srv://..."
MONGODB_DB="docmathdz"
ADMIN_EMAILS="edumoustapha60@gmail.com"
```

## 2) أماكن الملفات

```
src/
├─ components/coffee/
│  ├─ CoffeeCup.tsx        ☕ فنجان متحرك (sm | md | lg، ووضع mono أبيض/أسود)
│  ├─ HeartGraph.tsx       ♡ قلب مرسوم بمعادلة على ورق بياني
│  └─ Tex.tsx              ∑ مُصيرِّح KaTeX ($ و $$ و **bold**)
├─ lib/coffee/
│  ├─ types.ts             أنماط DailyDrop
│  ├─ db.ts                اتصال MongoDB + توقيت Africa/Algiers
│  └─ auth.ts              🔐 requireAdmin — اربطه بمصادقتك الحالية
├─ app/
│  ├─ fonts.ts             🔤 Reem Kufi / Tajawal / Amiri / Fraunces / Inter
│  ├─ coffee/
│  │  ├─ page.tsx          الصفحة العامة
│  │  ├─ ProblemCard.tsx   مسألة اليوم + تلميحات متدرجة
│  │  ├─ SupportCard.tsx   ادعمني بفنجان
│  │  └─ coffee.css
│  ├─ admin/coffee/
│  │  ├─ page.tsx          لوحة التحكم: إضافة/تعديل/حذف/نشر + معاينة حية
│  │  └─ admin.css
│  └─ api/
│     ├─ coffee/daily/route.ts        GET  قهوة اليوم (عام)
│     └─ admin/coffee/route.ts        GET قائمة · POST حفظ/upsert
│        └─ [id]/route.ts             PATCH تعديل · DELETE حذف
preview.html                 🖥 معاينة مستقلة للتصميم (افتحها في المتصفح)
shot-desktop.png / shot-mobile.png
```

## 3) layout.tsx

```tsx
import { fontVars } from "./fonts"
import "katex/dist/katex.min.css"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={fontVars}>
      <body>{children}</body>
    </html>
  )
}
```

## 4) الفنجان الصغير في الشريط العلوي (navbar)

```tsx
import CoffeeCup from "@/components/coffee/CoffeeCup"

<Link href="/coffee" className="nav-coffee">
  <CoffeeCup size="sm" />
  <span>قهوة الدكتوراه</span>
</Link>
```

للنسخة الأبيض/أسود (شعار، favicon، طباعة): `<CoffeeCup size="sm" mono />`.

## 5) المصادقة

افتح `src/lib/coffee/auth.ts` واستبدل محتوى `requireAdmin` بمنطق الجلسة الموجود لديك (نفس ما تستخدمه في `/admin/success-stories`).
في الإنتاج، إن لم تُحل المصادقة تُرفَض الكتابة (fail-closed).

## 6) مثال إدخال في لوحة التحكم

**Statement**

```
Let $E$ be a Banach space, $F$ a normed space, and $(T_n)$ a sequence in
$\mathcal{L}(E,F)$ such that $T_n x \to Tx$ for every $x \in E$.

**1.** Show that $\sup_n \|T_n\| < +\infty$.

**2.** Deduce that $T \in \mathcal{L}(E,F)$ and
$$\|T\| \le \liminf_{n \to \infty} \|T_n\|.$$

**3.** Give a counterexample when $E$ is not complete.
```

**فكرة اليوم**: `احفظ **الفرضَ الذي لا يمكن حذفه** مع كل مبرهنة؛ أسئلة المسابقة تُختبر الفروض قبل النتائج.`

**مقولة اليوم**: `الرياضياتُ لا تُفهَم بالقراءة، بل بالورقةِ والقلمِ والصمتِ الطويل.`

## 7) ملاحزات

- كل الحركات CSS فقط (بلا مكتبات)، وتتوقف تلقائيًا مع `prefers-reduced-motion`.
- الصفحة RTL، وصندوق الرياضيات LTR داخلها مع `overflow-x` داخلي حتى لا تنكسر المعادلات الطويلة على الهاتف.
- القلوب تختفي تحت 400px لأن الفنجان يأخذ المركز.
- كل الأزرار ≥ 44px لللمس.
