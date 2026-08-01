// قصة «نجحت في مسابقة الدكتوراه هذه السنة... لكنني أشعر بشيء غريب»
// ترجمة عربية حرفية لشهادة حقيقية منشورة بالفرنسية في مجموعة فيسبوك جزائرية:
// طالبة نجحت في المسابقة هذه السنة ثم أصابتها حيرة بين الاستمرار هنا أو الرحيل
// إلى الخارج، وتسأل عن الخطوات العملية (إشراف مشترك، منحة، دكتوراه كامل بالخارج).
// الاسم والجامعة مجهولان حفاظًا على الخصوصية.
// التشغيل: npx tsx scripts/seed-after-success-strange-feeling-story.ts
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
  "أريد أن أسمع نصائحكم وتجاربكم.",
  "",
  "نجحت هذه السنة في مسابقة الدكتوراه في الجزائر، وكان هذا هدفًا مهمًا جدًا بالنسبة إلي. لكنني في الآونة الأخيرة أشعر بأنني تائهة قليلًا وأقل حماسًا من قبل.",
  "",
  "تزداد داخلي يومًا بعد يوم رغبة في إكمال مساري الدراسي في الخارج، لكنني لا أعرف حقًا من أين أبدأ، ولا ما هي الإجراءات الواجب اتباعها. وهذا الأمر يقلقني لدرجة أنني لم أعد أستطيع التركيز جيدًا في عملي الحالي.",
  "",
  "أنا الآن مترددة بين الاستمرار هنا أو محاولة الرحيل إلى الخارج.",
  "",
  "لكل من عاش هذه التجربة من قبل، أو مرّ بفترة تنقّل (إشراف مشترك، منحة دراسية، دكتوراه كاملة في الخارج…): ماذا تنصحونني؟ وما هي الخطوات العملية الواجب اتباعها للذهاب إلى الخارج؟",
  "",
  "ملاحظة: في هذه الفترة أشعر بأنني تائهة ومكتئبة بعض الشيء، لذا أرجوكم دون انتقاد قاسٍ — أريد فقط آراءكم وتوجيهاتكم.",
].join("\n");

const data = {
  slug: "after-success-strange-feeling-2026",
  name: null as string | null,
  university: null as string | null,
  year: 2026 as number | null,
  title: "نجحت في مسابقة الدكتوراه هذه السنة… لكنني أشعر بشيء غريب",
  excerpt:
    "نجحت في مسابقة الدكتوراه هذه السنة، لكن بدل الراحة جاءت الحيرة: أكمل هنا أم أرحل إلى الخارج؟ شهادة صادقة لطالبة تشارك ترددها وتسأل عن الخطوات الحقيقية نحو الإشراف المشترك والمنح.",
  story: storyText,
  advice:
    "إن كنت تعرف طريق الإشراف المشترك أو المنح أو الدكتوراه في الخارج، فشاركه؛ فربما كلمة منك تكون بداية طريق لشخص تائه.",
  published: true,
};

async function main() {
  console.log("🌱 إضافة قصة «شعور غريب بعد النجاح» إلى قسم قصص النجاح…");

  const maxPosition = await withRetry(
    () => prisma.successStory.aggregate({ _max: { position: true } }),
    "قراءة أعلى ترتيب",
  );

  const existing = await withRetry(
    () => prisma.successStory.findUnique({ where: { slug: data.slug } }),
    `فحص ${data.slug}`,
  );

  if (existing) {
    await withRetry(
      () =>
        prisma.successStory.update({
          where: { slug: data.slug },
          data: { ...data, position: existing.position },
        }),
      `تحديث ${data.slug}`,
    );
    console.log(`♻️  حُدّثت: ${data.title}`);
  } else {
    await withRetry(
      () =>
        prisma.successStory.create({
          data: { ...data, position: (maxPosition._max.position ?? 0) + 1 },
        }),
      `إضافة ${data.slug}`,
    );
    console.log(`✅ أُضيفت: ${data.title}`);
  }

  const count = await prisma.successStory.count({ where: { published: true } });
  console.log(`🎉 تم — عدد القصص المنشورة الآن: ${count}`);
}

main()
  .catch((error) => {
    console.error("❌ خطأ:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
