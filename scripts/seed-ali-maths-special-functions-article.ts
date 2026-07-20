// مقال جديد في «زاد الباحث»: نصائح ALI MATHS للامتحان المشترك
// النص منقول كما ورد من صاحبه — تم التنظيم فقط دون تغيير المحتوى
// قبل التشغيل: ضع الصور الخمس في public/figures/ بالأسماء:
//   ali-maths-exam-1.png … ali-maths-exam-5.png
// التشغيل: npx tsx scripts/seed-ali-maths-special-functions-article.ts
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

// فيديو مباشر: صورة مصغرة قابلة للنقر تفتح الفيديو + رابط واضح تحتها
function youtube(id: string, title: string): string {
  const watchUrl = `https://youtu.be/${id}`;
  const thumbUrl = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  return `[![${title}](${thumbUrl})](${watchUrl})\n\n▶️ [مشاهدة الفيديو: ${title}](${watchUrl})`;
}

const content = `> ✉️ **منشور منقول كما ورد عن صاحبه — ALI MATHS.** تم تنظيم الفقرات والوسائط فقط دون تغيير المحتوى.

السلام عليكم ورحمة الله وبركاته، بالتوفيق للمقبلين على مسابقات الدكتوراه القادمة.

في هذا المنشور سأتطرق لبعض الأفكار والمهارات التي لا غنى لمترشح للمسابقة عنها، وستختصر عليه وقتًا كبيرًا في الامتحان إن أتقنها.

## أولاً: الامتحان المشترك

عادة يمتحن فيه في مقاييس الرياضيات الأساسية:

- الجبر 1-2-3-4
- التحليل 1-2-3-4
- أحيانًا topo et EVN وتحليل عقدي

هاته لن أتطرق لها لأن أي طالب مطالب أن يكون ملمًا بها، سأركز على الأفكار التي تطرح لتصنع الفارق في الترتيب العام ويجيب عليها فئة قليلة فقط.

## أول المهارات: التحكم في بعض الدوال الخاصة

على سبيل المثال:

- الدالة غاما gamma function
- الدالة بيتا beta function
- دالة الخطأ التي نراها كثيرًا في التوزيع الطبيعي error function
- والأقل شيوعًا ربما رأيتها سابقًا في أحد الامتحانات المشتركة: دالة لامبارد Lambert function

وأيضًا بعض كثيرات الحدود الشائعة مثل:

- كثيرات حدود تشبيشيف
- كثيرات حدود هيرميت
- كثيرات حدود لاجندر
- ويوجد غيرها

هاته كلها مهمة حتى إن كان ورودها نادرًا، ففي الأبحاث العلمية فيما بعد النجاح في المسابقة حتمًا ستتصادف مع إحداها أو كلها حسب تخصصك وميدان بحثك.

## أمثلة عن ورودها في مسابقات ماضية

![مسابقة دكتوراه 2012 — احتمالات وإحصاء: تمرين يُحل مباشرة بالدالة غاما](/figures/ali-maths-exam-1.png)

![مسابقة جامعة سيدي بلعباس 2021 — رياضيات عامة](/figures/ali-maths-exam-2.png)

![تمرين حول توزيع Weibull والدالة غاما](/figures/ali-maths-exam-3.png)

![مسابقة جامعة البليدة 1 — 2024/2025 — تكاملات معممة](/figures/ali-maths-exam-4.png)

![مسابقة المدرسة العليا للأساتذة القبة 2023 — سلاسل، تكاملات، وكثيرات حدود تشبيشيف](/figures/ali-maths-exam-5.png)

## المؤطرة بالأحمر 🟥 — الدالتان بيتا وغاما

المؤطرة بالأحمر تخص الدالتين بيتا وغاما. توجد طرق أخرى لحلها بدون استخدامهما، لكن بمجرد إتقانهما تصبح مثل هكذا أسئلة تستطيع حلها بمجرد النظر لها.

ينصح بهذا الفيديو ذو 23 دقيقة كمقدمة جيدة فيهما ولطريقة استخدامهما:

${youtube("PkfdJEzK_Eo", "مقدمة في الدالتين غاما وبيتا")}

## المؤطرة بالأخضر 🟩 — كثيرات الحدود

المؤطرة بالأخضر تخص كثيرات الحدود التي ذكرتها. ليس لزامًا أن تكون على دراية مسبقة بها لتحلها، فمعطيات التمرين كافية لكي تحله، لكن من كان له خلفية مسبقة بهم فهو أفضل.

ينصح بهاته الفيديوهات:

${youtube("ZjrhwS7YAxw", "كثيرات الحدود — الفيديو الأول")}

${youtube("L7tq6JoBx2o", "كثيرات الحدود — الفيديو الثاني")}

${youtube("B-4pkVm_bkI", "كثيرات الحدود — الفيديو الثالث")}

${youtube("ZT0_xWQTTjk", "كثيرات الحدود — الفيديو الرابع")}

${youtube("TNjBHZDB00Q", "كثيرات الحدود — الفيديو الخامس")}

${youtube("6gUZunLfEYY", "كثيرات الحدود — الفيديو السادس")}

## المؤطرة بالأزرق 🟦 — أفكار في السلاسل العددية

المؤطرة بالأزرق تضم أفكارًا في السلاسل العددية لا تدرس غالبًا في كل الجامعات في مقياس analyse 3 مع التحليل المركب.

أغلبها يوجد في هذا الفيديو:

${youtube("1dVSx_rNpkY", "أفكار في السلاسل العددية")}

## كلمة أخيرة

عمومًا أغلبها مواضيع مشتركة معاملها 1 وتمثل 25% فقط من المعدل العام للمسابقة، لكن أحيانًا لما يكون امتحان التخصص سهلاً، المقياس المشترك هو من يحدد الناجحين.

هاته بعض الأفكار التي لفتت انتباهي، وفي كل مرة أرى فكرة غير روتينية سأشاركها معكم. وأغلب المواضيع المشتركة هي بسيطة ومشابهة للامتحانات العادية.

بالتوفيق للجميع.

> 💡 تمرين ورد سابقًا: خليط بين كثيرات حدود لاجندر والإحصاء اللامعلمي والدوال المتعامدة.

---

*المصدر: منشور للأستاذ ALI MATHS — نُشر هنا مع الحفاظ على النص كما ورد. الفيديوهات المرفقة روابط يوتيوب عامة لأصحابها.*`;

const article = {
  slug: "ali-maths-special-functions-common-exam-edge",
  titleAr:
    "مهارات تصنع الفارق في الامتحان المشترك: الدوال الخاصة وكثيرات الحدود",
  summary:
    "منشور من الأستاذ ALI MATHS: الدالتان غاما وبيتا، دالة الخطأ، دالة لامبارد، وكثيرات حدود تشبيشيف وهيرميت ولاجندر — مع أمثلة من مسابقات ماضية وفيديوهات مختارة للتحضير.",
  content,
  position: 177,
  published: true,
};

async function main() {
  console.log("🌱 إضافة مقال ALI MATHS…");

  const result = await withRetry(
    () =>
      prisma.article.upsert({
        where: { slug: article.slug },
        update: {
          titleAr: article.titleAr,
          summary: article.summary,
          content: article.content,
          position: article.position,
          published: article.published,
        },
        create: {
          slug: article.slug,
          titleAr: article.titleAr,
          summary: article.summary,
          content: article.content,
          position: article.position,
          published: article.published,
        },
      }),
    article.slug,
  );

  console.log(`✅ تمت الإضافة: ${result.titleAr}`);
  console.log(`🔗 الرابط: /guide/${result.slug}`);
}

main()
  .catch((error) => {
    console.error("❌ خطأ:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
