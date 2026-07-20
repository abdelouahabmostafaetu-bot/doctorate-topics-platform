// إضافة/تصحيح تجربة «بدأت في أوت» في قسم تجارب تستحق أن تُروى
// ملاحظة: صفحة قصص النجاح تعرض النص كما هو (بدون Markdown)،
// لذا التنسيق هنا نصي نظيف: عناوين واضحة ونقاط • فقط.
// التشغيل: npx tsx scripts/seed-preparation-and-after-success-story.ts
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

const storyText = [
  "✦ التحضير: البداية المبكرة في أوت",
  "",
  "بدأت التحضير في شهر أوت، بعدما بحثت عن مواضيع السنوات السابقة في تخصصي، ولاحظت أن هناك مواد أساسية تتكرر في الغالب.",
  "",
  "طريقتي في المذاكرة:",
  "• اخترت إحدى المواد المتكررة وبدأت في تلخيصها.",
  "• حمّلت محاضرات من الإنترنت وأعدت كتابتها في أوراق بطريقتي الخاصة — فالكتابة تساعد على ترسيخ المعلومة.",
  "",
  "✦ اختيار الوجهات بعد ظهور الإعلانات",
  "",
  "عند بداية ظهور الإعلانات اتضحت لي الرؤية:",
  "• اخترت الوجهة على حسب المادة التي حضّرت لها.",
  "• اخترت الولايات الأقرب والتي تختلف في تواريخ إجراء مسابقاتها حتى لا تتعارض.",
  "• كان عدد المناصب متساويًا تقريبًا، فلم تكن هناك أفضلية لولاية على حساب أخرى.",
  "• بعد معرفة المواد الثانوية، بدأت بالتحضير للمادة الأقرب في تاريخ امتحانها.",
  "",
  "بالتوفيق للطلبة الأعزاء — ركّزوا وأخلصوا النية، بالتوكل على الله والتحضير الجيد والدعاء.",
  "",
  "✦ بعد النجاح في مسابقة الدكتوراه: معلومات سريعة",
  "",
  "• ستصبح باحثًا، بمعنى مشروع أستاذ جامعي.",
  "• مدة التكوين في الدكتوراه بين 3 إلى 4 سنوات.",
  "• العام الأول تكوين نظري: مقاييس عادية تدرسها بدون امتحانات.",
  "• تكون مطالبًا خلال التكوين بإنجاز أطروحة الدكتوراه ومقال المناقشة.",
  "• تكون مطالبًا بالمشاركة في الملتقيات العلمية (ملتقيان وطنيان وملتقيان دوليان حسب التخصصات).",
  "• تدريس الأعمال الموجهة أو التطبيقية ممكن لكنه ليس إجباريًا.",
  "• لديك الحق في تربص قصير المدى خارج الوطن (خاص بالطلبة غير الأجراء فقط).",
  "",
  "ملاحظة: هذه تجربة متداولة (منقولة) أعيدت صياغتها وتنظيمها للفائدة. التفاصيل التنظيمية قد تختلف بين الجامعات والسنوات — المرجع الرسمي دائمًا هو إعلانات الجامعات والوزارة.",
].join("\n");

const story = {
  slug: "facebook-august-preparation-and-after-success-facts",
  name: "باحث/ة ناجح/ة",
  university: "تجربة متداولة — منقول",
  year: null as string | null,
  title: "بدأت في أوت… خطة تحضير هادئة، وماذا ينتظرك بعد النجاح؟",
  excerpt:
    "تجربة تحضير بدأت مبكرًا في أوت: رصد المواد المتكررة، التلخيص باليد، واختيار الوجهات بذكاء — مع ملخص عملي لما ينتظر الطالب بعد النجاح في المسابقة.",
  story: storyText,
  advice:
    "ابدأ مبكرًا قبل ظهور الإعلانات: ارصد المواد المتكررة في تخصصك ولخّصها بخط يدك، ثم اختر وجهات تختلف تواريخ مسابقاتها لتزيد فرصك. وفوق كل ذلك: إخلاص النية والتوكل على الله والدعاء.",
  position: 8,
  published: true,
};

async function main() {
  console.log("🌱 تحديث/إضافة التجربة…");

  const result = await withRetry(
    () =>
      prisma.successStory.upsert({
        where: { slug: story.slug },
        update: {
          name: story.name,
          university: story.university,
          year: story.year,
          title: story.title,
          excerpt: story.excerpt,
          story: story.story,
          advice: story.advice,
          position: story.position,
          published: story.published,
        },
        create: {
          slug: story.slug,
          name: story.name,
          university: story.university,
          year: story.year,
          title: story.title,
          excerpt: story.excerpt,
          story: story.story,
          advice: story.advice,
          position: story.position,
          published: story.published,
        },
      }),
    story.slug,
  );

  console.log(`✅ تم التحديث: ${result.title}`);
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
