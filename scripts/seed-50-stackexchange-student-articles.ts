/**
 * 50 مقالة عربية عملية للطلبة، محررة من نقاشات منشورة في Math Stack Exchange.
 * التشغيل: npx tsx scripts/seed-50-stackexchange-student-articles.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Source = {
  key: string;
  title: string;
  url: string;
  situation: string;
  lesson: string;
  action: string;
  tags: string[];
};

const sources: Source[] = [
  {
    key: "self-study",
    title: "عندما لا تكفي إعادة كتابة التعريفات",
    url: "https://math.stackexchange.com/questions/2399710/study-tips-and-techniques-for-self-oriented-students",
    situation:
      "طالب انتقل من مقررات حسابية إلى التحليل، وكان يعيد كتابة التعريفات والنظريات والبراهين ثم يكتشف أن التمارين الجديدة لا تبدأ معه بسهولة.",
    lesson:
      "الانتقال إلى الرياضيات البرهانية يحتاج دورة كاملة: تعريف، مثال، محاولة مستقلة، ثم مراجعة للخطأ؛ لا حفظ صفحة منفصلة عن استعمالها.",
    action:
      "اختر تعريفًا واحدًا، واكتب مثالًا يحققه ومثالًا لا يحققه، ثم حل تمرينًا واحدًا يفرض عليك استخدامه.",
    tags: ["التعلم الذاتي", "التحليل", "التعريفات"],
  },
  {
    key: "reading-book",
    title: "كيف تقرأ كتاب رياضيات دون أن تضيع في منتصفه",
    url: "https://math.stackexchange.com/questions/279079/how-to-read-a-book-in-mathematics",
    situation:
      "قارئ لكتب مثل Munkres وArtin وHalmos كان يبدأ بحماس ثم يفقد الخيط في منتصف الكتاب ويسأل: ما الذي أكتبه؟ وما سرعة القراءة المناسبة؟",
    lesson:
      "كتاب الرياضيات ليس رواية؛ القراءة الجيدة تتوقف عند التعريف وتبني دفترًا للأسئلة والأمثلة والتمارين بدل قياس التقدم بعدد الصفحات.",
    action:
      "قسّم الفصل إلى جلسات قصيرة، ولا تنتقل من قسم قبل أن تكتب تعريفه بعبارتك وتحل تمرينًا أو تصنع مثالًا عليه.",
    tags: ["قراءة الكتب", "التعلم الذاتي", "تنظيم المراجعة"],
  },
  {
    key: "hard-proofs",
    title: "كيف تحفظ برهانًا صعبًا دون أن تحفظه كصفحة",
    url: "https://math.stackexchange.com/questions/1699941/how-to-study-for-hard-math-proofs",
    situation:
      "طالب واجه براهين طويلة وكان يخاف أن تختفي تفاصيلها عند الامتحان، فبحث عن طريقة عملية لمراجعتها.",
    lesson:
      "يمكن إعادة بناء البرهان بتدرج: كتابة كاملة، خريطة تفصيلية، ثم تلميحات أقصر؛ الهدف هو استرجاع المنطق لا تلاوة النص.",
    action:
      "اكتب خريطة البرهان في خمس نقاط: الفرضية، الأداة، الخطوة الحاسمة، أين تستخدم كل فرضية، والنتيجة.",
    tags: ["البراهين", "المراجعة", "الذاكرة"],
  },
  {
    key: "learn-proofs",
    title: "ما الذي تتعلمه حقًا عندما تقرأ برهانًا",
    url: "https://math.stackexchange.com/questions/167778/how-to-learn-from-proofs",
    situation:
      "خريج رياضيات شعر أن البراهين المهمة تبدو مصقولة أكثر من اللازم؛ يحفظها للامتحان ثم ينساها ولا يعرف كيف وُلدت الفكرة.",
    lesson:
      "قراءة البرهان لا تكفي وحدها؛ حاول بناء برهان آخر أو تتبع المحاولات التي يمكن أن تفشل، فهناك يظهر سبب اختيار الطريق النهائي.",
    action:
      "بعد قراءة برهان، أغلق الكتاب لعشر دقائق واكتب طريقة أخرى محتملة، حتى لو لم تنجح، ثم قارنها بالطريقة المنشورة.",
    tags: ["فهم البراهين", "التفكير الرياضي", "التعلم العميق"],
  },
  {
    key: "prove-better",
    title: "البداية الصحيحة في مسألة برهانية",
    url: "https://math.stackexchange.com/questions/190981/how-to-be-good-at-proving",
    situation:
      "طالب يريد أن يصبح أفضل في البرهان لكنه يتوقف بعد محاولة واحدة غير ناجحة ويظن أن عدم ظهور الفكرة فورًا يعني الفشل.",
    lesson:
      "التجربة بأمثلة وحالات خاصة وبحث المثال المضاد ليست ضياع وقت؛ ففشل المثال المضاد قد يكشف لماذا يكون الادعاء صحيحًا.",
    action:
      "قبل كتابة البرهان، اختبر ثلاثة أمثلة وحالة حدية، ثم اكتب أي فرضية استعملتها في كل تجربة.",
    tags: ["كتابة البرهان", "حل المسائل", "الأمثلة"],
  },
  {
    key: "proof-basics",
    title: "منطق صغير يغيّر جودة براهينك",
    url: "https://math.stackexchange.com/questions/7743/getting-better-at-proofs",
    situation:
      "طالب يعرف نتائج المقرر لكنه يتعثر في صياغة البرهان لأن الفرق بين العكس النقيض والتناقض والكمّيات ليس حاضرًا عنده بوضوح.",
    lesson:
      "إتقان منطق الجمل والكمّيات واستراتيجيات البرهان الأساسية يجعل كثيرًا من الصعوبات قابلة للتسمية والمعالجة بدل أن تبقى غموضًا عامًا.",
    action:
      "خذ نتيجة واحدة واكتب لها ثلاث بدايات ممكنة: برهان مباشر، عكس نقيض، وتناقض، ثم حدّد أيها ينسجم مع التعريفات.",
    tags: ["المنطق", "العكس النقيض", "البراهين"],
  },
  {
    key: "clear-proofs",
    title: "كيف تجعل برهانك قابلًا للقراءة",
    url: "https://math.stackexchange.com/questions/4457318/what-are-some-strategies-to-write-a-proof-that-can-be-easily-comprehended",
    situation:
      "سؤال من طالب يبحث عن حيل لكتابة برهان يفهمه القارئ بدل أن يكون صحيحًا لكنه متعب وغير واضح.",
    lesson:
      "البرهان الواضح يقسم الفكرة إلى لمّات وخطوات، ويستعمل مثالًا أو رسمًا حين يفيد، ويترك للقارئ سبب الانتقال بين جملة وأخرى.",
    action:
      "راجع برهانك بعد كتابته: هل لكل فقرة هدف واحد؟ هل يمكنك وضع عنوان قصير لكل خطوة؟ إن لم تستطع، فالقسم يحتاج تفكيكًا.",
    tags: ["الكتابة الرياضية", "البراهين", "التواصل العلمي"],
  },
  {
    key: "proof-style",
    title: "الوضوح قبل الرموز في الكتابة الرياضية",
    url: "https://math.stackexchange.com/questions/612472/tips-for-writing-proofs",
    situation:
      "نقاش حول كتابة البراهين أكد أن القارئ يضيع عندما تظهر رموز أو مصطلحات غير معرّفة، حتى لو كانت الفكرة صحيحة.",
    lesson:
      "لا تجعل القارئ يبحث عن معنى رمزك. عرّف غير المألوف، واستخدم جملًا تربط المعادلات، واكتب بقدر من الاختصار لا يخفي المنطق.",
    action:
      "في آخر مراجعة للبرهان، ضع دائرة حول كل رمز واسأل: هل عرّفته قبل استخدامه؟ وهل يحتاج القارئ إلى جملة تشرح دوره؟",
    tags: ["أسلوب البرهان", "الرموز", "الكتابة العلمية"],
  },
  {
    key: "math-exams",
    title: "كيف تتعامل مع امتحان رياضيات تحت ضغط الوقت",
    url: "https://math.stackexchange.com/questions/50643/how-should-i-approach-taking-math-tests",
    situation:
      "طالب كان يؤدي جيدًا في الواجبات والمشروعات، لكنه يتجمد في امتحانات الرياضيات وخصوصًا عند الأسئلة البرهانية الموقوتة.",
    lesson:
      "ضغط الوقت مهارة مستقلة عن الفهم؛ التدريب بمحاكاة امتحانات سابقة وتوزيع الوقت والانتقال الواعي بين الأسئلة يقلل أثر التجمّد.",
    action:
      "خصّص جلسة أسبوعية بوقت ثابت: اقرأ الورقة أولًا، ابدأ بالسؤال الأقرب، واكتب وقتًا أقصى لكل سؤال قبل أن تبدأ الحل.",
    tags: ["الامتحانات", "إدارة الوقت", "القلق"],
  },
  {
    key: "analysis-study",
    title: "لماذا يصعب التحليل الحقيقي رغم كثرة المذاكرة",
    url: "https://math.stackexchange.com/questions/63732/how-to-study-for-analysis",
    situation:
      "طالب في التحليل الحقيقي يحفظ النظريات وبراهينها ويعمل بجد، لكنه يتوقف أمام تمرين جديد لأنه اعتاد الاعتماد على الحدس السابق فقط.",
    lesson:
      "التحليل الصارم يطلب الانتقال من حدس مفيد إلى تعريفات دقيقة؛ التمرين ليس اختبارًا للذاكرة بل تدريب على استخراج المسار من التعريف.",
    action:
      "عند كل تمرين تحليل، اكتب التعريفات ذات الصلة حرفيًا أولًا، ثم ضع علامة على الفرضية التي تتيح لك استعمال كل تعريف.",
    tags: ["التحليل الحقيقي", "الصرامة", "التمارين"],
  },
];

const modes = [
  {
    key: "read",
    title: "طريقة قراءة بطيئة تغيّر فهمك",
    focus:
      "اقرأ المادة كحوار: ما السؤال الذي تجيب عنه هذه الفقرة؟ وما التعريف أو النتيجة التي تحتاجها بعدها؟",
  },
  {
    key: "practice",
    title: "تمرين واحد أفضل من عشر صفحات بلا محاولة",
    focus:
      "اجعل التعلم يمر بمحاولة مكتوبة؛ ابدأ بنفسك قبل فتح الحل، ثم سجّل أين تعطلت تحديدًا.",
  },
  {
    key: "notes",
    title: "دفتر مراجعة لا يكرر الكتاب",
    focus:
      "اكتب في دفترك الأسئلة والأمثلة والأخطاء وخريطة الفكرة، لا نسخًا مطولًا لما هو موجود في المرجع.",
  },
  {
    key: "exam",
    title: "نقل الفكرة إلى ورقة الامتحان",
    focus:
      "درّب نفسك على صياغة واضحة قصيرة تحت وقت محدد، مع إبقاء مساحة للرجوع إلى السؤال الصعب لاحقًا.",
  },
  {
    key: "review",
    title: "مراجعة الخطأ التي تصنع التقدم",
    focus:
      "بعد كل محاولة، صنّف العثرة: تعريف لم يكن حاضرًا، أداة غير مناسبة، أو خطوة حسابية؛ ثم عالج سببًا واحدًا في كل مرة.",
  },
];

function sourceFooter(url: string) {
  return `**المصدر والترخيص:** إعداد عربي محرر مستند إلى نقاش منشور في [المصدر الأصلي](${url}). النص الأصلي وهذه الصياغة المشتقة مرخّصان بموجب [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).`;
}

function contentFor(source: Source, mode: (typeof modes)[number]) {
  return `## الفكرة الرئيسة

${source.situation}

الفكرة التي تستحق أن تبقى هي أن ${source.lesson}

## زاوية عملية: ${mode.title}

${mode.focus}

## خطة قصيرة قابلة للتنفيذ

1. ${source.action}
2. لا تقيّم الجلسة بعدد الصفحات؛ قيّمها بسؤال واحد صار أوضح أو تمرين واحد حاولته بصدق.
3. احتفظ بسطر أخير يصف ما لم تفهمه بعد، لتعود إليه في جلسة لاحقة أو تسأل عنه بدقة.

## ما الذي تتجنبه؟

لا تحوّل القراءة إلى نسخ، ولا تجعل رؤية الحل قبل المحاولة عادة. إن توقفت، ارجع إلى التعريفات، جرّب حالة أصغر، أو اكتب آخر خطوة مؤكدة وصلت إليها.

${sourceFooter(source.url)}`;
}

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

/**
 * MongoDB may occasionally return a transient write timeout. The article slug
 * is unique and the operation is an upsert, so retrying the same write is safe.
 */
async function withRetry<T>(
  label: string,
  action: () => Promise<T>,
): Promise<T> {
  const maxAttempts = 6;
  let delay = 1500;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      if (attempt === maxAttempts) throw error;

      console.warn(
        `⚠️ تعذرت كتابة ${label} مؤقتًا. إعادة المحاولة ${attempt}/${maxAttempts - 1} بعد ${Math.round(delay / 1000)} ثوانٍ...`,
      );
      await sleep(delay);
      delay *= 2;
    }
  }

  throw new Error(`تعذرت كتابة ${label}.`);
}

async function main() {
  let position = 126;
  for (const source of sources) {
    for (const mode of modes) {
      const slug = `student-help-${String(position).padStart(3, "0")}-${source.key}-${mode.key}`;
      const titleAr = `${source.title}: ${mode.title}`;
      await withRetry(`المقال رقم ${position}`, () =>
        prisma.article.upsert({
          where: { slug },
          create: {
            slug,
            titleAr,
            summary: `${source.lesson} مقال قصير بخطوة عملية قابلة للتطبيق.`,
            content: contentFor(source, mode),
            position,
            published: true,
          },
          update: {
            titleAr,
            summary: `${source.lesson} مقال قصير بخطوة عملية قابلة للتطبيق.`,
            content: contentFor(source, mode),
            position,
            published: true,
          },
        }),
      );
      console.log(`✅ ${position}. ${titleAr}`);
      await sleep(350);
      position += 1;
    }
  }
  console.log(
    "\nتم إنشاء/تحديث 50 مقالة عربية للطلبة مع نسب المصادر والترخيص.",
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
