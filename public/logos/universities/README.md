# شعارات الجامعات

تُقدّم من هنا على `https://www.docmathdz.dev/logos/universities/<الملف>` وتستخدمها ترويسة ملفات PDF.

## التسمية

استعمل **`University.slug`** كاسم للملف:

```
public/logos/universities/
├── ufas1.png
├── usthb.png
└── univ-batna2.png
```

لا توجد قائمة JSON للجامعات. المرجع الوحيد هو جدول `University` في `prisma/schema.prisma`:
`name` و `nameAr` و `slug` و `logoUrl`.

## ترتيب البحث عن الشعار

1. `University.logoUrl` (مطلق أو نسبي أو `data:`)
2. `/logos/universities/<slug>.png`
3. إطار محيّد بأحرف الجامعة الأولى — **ملف الـ PDF لا يتعطّل أبدًا بسبب شعار مفقود**

## الصيغ

| الصيغة | الموقع (HTML) | XeLaTeX |
| --- | --- | --- |
| PNG | نعم (مفضّل) | نعم (مفضّل) |
| JPG | نعم | نعم |
| WebP | نعم | لا |
| SVG | نعم | لا (حوّله إلى PDF) |
| PDF | لا | نعم |

المقاس الموصى به: مربع تقريبًا، 400×400 بكسل أو أكثر، بخلفية شفافة أو بيضاء (الإطار في الترويسة 26×24 مم).

للاستعمال مع XeLaTeX محليًا، انسخ نفس الملفات إلى `latex/logos/universities/`.
