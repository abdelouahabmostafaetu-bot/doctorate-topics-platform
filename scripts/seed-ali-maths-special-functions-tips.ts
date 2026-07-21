// مقال جديد في «زاد الباحث»: نصائح ALI MATHS حول الدوال الخاصة في الامتحان المشترك
// النص منقول كما وصل دون تغيير في المضمون — تنظيم فقط للقراءة.
// الصور: public/figures/exam-tips/ — يجب نسخها مع هذا السكربت (موجودة في نفس الملف المضغوط)
// التشغيل: npx tsx scripts/seed-ali-maths-special-functions-tips.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const maxAttempts = 6;
  let delay = 1500;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      console.warn(
        `⚠️  محاولة ${attempt} فشلت لـ ${label} — إعادة المحاولة بعد ${delay}ms`,
      );
      await sleep(delay);
      delay *= 2;
    }
  }
  throw new Error(`تعذّر إتمام ${label}`);
}

function video(id: string, label: string): string {
  return `![youtube: ${label}](https://www.youtube-nocookie.com/embed/${id})`;
}

const content = `> ✦ منشور بقلم **ALI MATHS** — نُشر كما وصل دون تغيير في المضمون، مع تنظيم بسيط لتسهيل القراءة.

السلام عليكم ورحمة الله وبركاته، بالتوفيق للمقبلين على مسابقات الدكتوراه القادمة.

في هذا المنشور سأتطرق لبعض الأفكار والمهارات التي لا غنى لمترشح للمسابقة عنها، وستختصر عليه وقتًا كبيرًا في الامتحان إن أتقنها.

## أولا الامتحان المشترك

عادة يمتحن فيه في مقاييس الرياضيات الأساسية:

- الجبر 1-2-3-4
- التحليل 1-2-3-4
- أحيانا topo et EVN وتحليل عقدي

هاته لن أتطرق لها لأن أي طالب مطالب أن يكون ملمًا بها، سأركز على الأفكار التي تطرح لتصنع الفارق في الترتيب العام ويجيب عليها فئة قليلة فقط.

## أول المهارات: التحكم في بعض الدوال الخاصة

على سبيل المثال:

- الدالة غاما gamma function
- الدالة بيتا beta function
- دالة الخطأ التي نراها كثيرا في التوزيع الطبيعي error function
- والأقل شيوعا ربما رأيتها سابقا في أحد الامتحانات المشتركة: دالة لامبارد Lambert function

وأيضا بعض كثيرات الحدود الشائعة مثل:

- كثيرات حدود تشبيشيف
- كثيرات حدود هيرميت
- كثيرات حدود لاجندر
- ويوجد غيرها

هاته كلها مهمة حتى إن كان ورودها نادرًا، ففي الأبحاث العلمية فيما بعد النجاح في المسابقة حتما ستتصادف مع إحداها أو كلها حسب تخصصك وميدان بحثك.

## أمثلة عن ورودها في مسابقات ماضية

![مسابقة دكتوراه احتمالات وإحصاء 2012 — تمرين حول الدالة غاما](/figures/exam-tips/ps1-2012-gamma-chi2.webp)

![مسابقة جامعة سيدي بلعباس 2021 — تمرين التكامل المعمم](/figures/exam-tips/sba-2021-integrale-jn.webp)

![تمرين توزيع Weibull — الأمل الرياضي بدلالة الدالة غاما](/figures/exam-tips/weibull-esperance-gamma.webp)

![مسابقة جامعة البليدة 1 — 2024/2025 — تكاملات معممة](/figures/exam-tips/blida1-2025-integrales.webp)

![مسابقة المدرسة العليا للأساتذة القبة 2022-2023 — سلاسل، تكاملات، وكثيرات حدود تشيبيشيف](/figures/exam-tips/ens-kouba-2023-sujet.webp)

## المؤطرة بالأحمر — الدالتان بيتا وغاما

المؤطرة بالاحمر تخص الدالتين بيتا وغاما. توجد طرق اخرى لحلها بدون استخدامها، لكن بمجرد اتقانهما تصبح مثل هكذا أسئلة تستطيع حلها بمجرد النظر لها.

ينصح بهذا الفيديو ذو 23 دقيقة كمقدمة جيدة فيهما ولطريقة استخدامهما:

${video("PkfdJEzK_Eo", "مقدمة في الدالتين غاما وبيتا")}

## المؤطرة بالأخضر — كثيرات الحدود

المؤطرة بالأخضر تخص كثيرات الحدود التي ذكرتها. ليس لزاما أن تكون على دراية مسبقة بها لتحلها، فمعطيات التمرين كافية لكي تحله، لكن من كان له خلفية مسبقة بهم فهو أفضل.

ينصح بهاته الفيديوهات:

${video("ZjrhwS7YAxw", "كثيرات الحدود — الفيديو 1")}

${video("L7tq6JoBx2o", "كثيرات الحدود — الفيديو 2")}

${video("B-4pkVm_bkI", "كثيرات الحدود — الفيديو 3")}

${video("ZT0_xWQTTjk", "كثيرات الحدود — الفيديو 4")}

${video("TNjBHZDB00Q", "كثيرات الحدود — الفيديو 5")}

${video("6gUZunLfEYY", "كثيرات الحدود — الفيديو 6")}

## المؤطرة بالأزرق — أفكار في السلاسل العددية

المؤطرة بالازرق تضم افكارًا في السلاسل العددية لا تُدرس غالبا في كل الجامعات في مقياس analyse 3 مع التحليل المركب.

أغلبها يوجد في هذا الفيديو:

${video("1dVSx_rNpkY", "أفكار في السلاسل العددية")}

## كلمة أخيرة

عموما أغلبها مواضيع مشتركة معاملها 1 وتمثل 25% فقط من المعدل العام للمسابقة، لكن أحيانا لما يكون امتحان التخصص سهلا، المقياس المشترك هو من يحدد الناجحين.

هاته بعض الأفكار التي لفتت انتباهي، وفي كل مرة أرى فكرة غير روتينية سأشاركها معكم. وأغلب المواضيع المشتركة هي بسيطة ومشابهة للإمتحانات العادية.

بالتوفيق للجميع.

> ملاحظة من الكاتب: تمرين ورد سابقا خليط بين كثيرات حدود لاجندر والإحصاء اللامعلمي والدوال المتعامدة.

![تمرين حول كثيرات حدود لاجندر والنواة من الرتبة الرابعة](/figures/exam-tips/legendre-kernel-exercise-final.webp)

---

**المصدر والترخيص:** منشور بقلم ALI MATHS، نُشر بموافقته كما وصل دون تغيير في المضمون — تنظيم العرض فقط. الصور من مواضيع مسابقات رسمية ماضية، والفيديوهات روابط عامة على يوتيوب لأصحابها.`;

const successStory = {
  slug: "ali-maths-special-functions-common-exam-edge",
  name: "ALI MATHS",
  university: null as string | null,
  year: null as number | null,
  title: "تجربة صديق ناجح في الدكتوراه: مهارات تصنع الفارق في الامتحان المشترك",
  excerpt:
    "تجربة ونصائح صديق ناجح في الدكتوراه حول الدوال الخاصة وكثيرات الحدود، مع أمثلة مصورة من مسابقات سابقة وفيديوهات للتحضير.",
  story: content,
  advice:
    "لا تُهمل المقياس المشترك؛ إتقان الدوال الخاصة وكثيرات الحدود والأفكار غير الروتينية قد يصنع الفارق في ترتيب الناجحين.",
  position: 20,
  published: true,
};

async function main() {
  console.log("🌱 نقل تجربة ALI MATHS إلى قصص النجاح…");

  const result = await withRetry(
    () =>
      prisma.successStory.upsert({
        where: { slug: successStory.slug },
        update: {
          name: successStory.name,
          university: successStory.university,
          year: successStory.year,
          title: successStory.title,
          excerpt: successStory.excerpt,
          story: successStory.story,
          advice: successStory.advice,
          position: successStory.position,
          published: successStory.published,
        },
        create: successStory,
      }),
    successStory.slug,
  );

  await withRetry(
    () => prisma.article.deleteMany({ where: { slug: successStory.slug } }),
    "إزالة النسخة المصنفة كمقال",
  );

  console.log(`✅ أصبحت قصة نجاح: ${result.title}`);
  console.log(`🔗 الرابط: /guide/success-stories/${result.slug}`);
}

main()
  .catch((error) => {
    console.error("❌ خطأ:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
