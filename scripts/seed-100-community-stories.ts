/**
 * 100 مقالة عربية قصيرة، مستندة إلى قصص وأسئلة طلاب حقيقية.
 * التشغيل: npx tsx scripts/seed-100-community-stories.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Source = {
  key: string;
  theme: string;
  url: string;
  story: string;
  lesson: string;
  action: string;
};

const sources: Source[] = [
  {
    key: "study-method",
    theme: "حين لا تكفي القراءة وحدها",
    url: "https://math.stackexchange.com/questions/2399710/study-tips-and-techniques-for-self-oriented-students",
    story:
      "طالب انتقل من مقررات تعتمد الحساب إلى التحليل والجبر الخطي، فاكتشف أن نسخ التعريفات وحفظها لا يمنحه بداية واضحة عند التمرين.",
    lesson:
      "الانتقال إلى الرياضيات البرهانية يحتاج قراءة بطيئة، مثالًا واحدًا، ثم محاولة مكتوبة لا مجرد إعادة نظر في الصفحة.",
    action:
      "اختر تعريفًا واحدًا اليوم، واكتب مثالًا يحققه ومثالًا لا يحققه قبل حل تمرين عنه.",
  },
  {
    key: "study-effective",
    theme: "حين تقفز بين الكتب بلا تقدم",
    url: "https://math.stackexchange.com/questions/40901/strategies-for-effective-self-study",
    story:
      "متعلم ذاتي أحب التحليل والجبر والهندسة، لكنه كان يفتح كتبًا كثيرة ويغادر كل موضوع بعد صفحات قليلة، فشعر أن جهده لا يتحول إلى معرفة مستقرة.",
    lesson:
      "المشروع الصغير المحدد أفضل من التصفح المتفرق؛ اربط كل أسبوع بسؤال أو فصل واحد قابل للإنهاء.",
    action:
      "اكتب هدف الأسبوع في سطر واحد، ولا تضف كتابًا جديدًا قبل أن تحل تمرينين من الكتاب الحالي.",
  },
  {
    key: "learn-math",
    theme: "التعلم ببطء ليس فشلًا",
    url: "https://math.stackexchange.com/questions/3782/how-do-you-go-about-learning-mathematics",
    story:
      "طالب يحب الرياضيات لكنه يشعر أن القراءة الذاتية تأخذ منه وقتًا طويلًا، وكان يبحث عن طريقة سحرية تجعله يفهم بسرعة.",
    lesson:
      "لا توجد طريقة واحدة تناسب الجميع؛ القراءة من أكثر من عرض، ثم العودة إلى الأساسيات، تبني فهمًا حقيقيًا مع الوقت.",
    action:
      "قارن شرحين قصيرين للمفهوم نفسه، ثم اكتب بعبارتك ما الذي أضافه كل شرح.",
  },
  {
    key: "forgetting",
    theme: "حين تنسى ما درسته بعد أسابيع",
    url: "https://math.stackexchange.com/questions/3949726/struggling-to-both-understand-and-remember-maths",
    story:
      "طالب جامعي عاد إلى الدراسة بعد انقطاع طويل، وكان ينجح بصعوبة ثم يشعر أن البراهين والأفكار تختفي من ذاكرته بعد المقرر.",
    lesson:
      "لا تحفظ البرهان كصفحة؛ احتفظ بفكرته الأساسية وبصندوق أدوات من الأنماط التي تتكرر في المسائل.",
    action:
      "بعد كل برهان، اكتب ثلاث جمل: البداية، الفكرة المحولة، والنتيجة التي وصل إليها.",
  },
  {
    key: "retain-self",
    theme: "إعادة التعلم ليست ضياعًا كاملًا",
    url: "https://math.stackexchange.com/questions/4983013/struggling-to-retain-mathematical-knowledge-as-a-self-learner",
    story:
      "متعلم شغوف كان يعود إلى التحليل بعد شهرين فيشعر كأنه يراه للمرة الأولى، فتراجع حماسه لأنه يعيد الأبواب نفسها.",
    lesson:
      "الاسترجاع المتباعد وملف المفاهيم الأساسية يحولان العودة إلى مراجعة أسرع بدل بداية من الصفر.",
    action:
      "أنشئ صفحة واحدة للباب: خمسة تعريفات، نتيجتان، وسؤالان تختبر بهما نفسك بعد أسبوع.",
  },
  {
    key: "qualifying-failure",
    theme: "حين تفشل في مسائل الامتحان التأهيلي",
    url: "https://math.stackexchange.com/questions/888218/attemping-qualifying-exam-problems-and-failing",
    story:
      "طالب يستطيع حل كثير من تمارين الكتب العليا، لكنه وجد مسائل الامتحان التأهيلي أعمق مما توقع رغم أنه يعرف المادة العامة.",
    lesson:
      "الفارق بين التمرين الروتيني ومسألة الامتحان قد يكون في الربط بين الأدوات، لا في غياب الذكاء أو الجهد.",
    action:
      "بعد كل مسألة قديمة، سجل الأداة الأولى التي احتجتها والوصلة التي لم تكن تراها في البداية.",
  },
  {
    key: "exam-grades",
    theme: "حين ينفد الوقت في الامتحان",
    url: "https://math.stackexchange.com/questions/1262444/how-do-i-get-good-grades-in-an-exam",
    story:
      "طالب يعرف القواعد لكنه ينهي الاختبار من دون وقت كافٍ، فيبقى قلقه متعلقًا بالسرعة أكثر من الفهم.",
    lesson:
      "الفهم الواضح أساس، ثم تأتي السرعة من تدريب قصير متكرر على أنواع الحساب التي تتكرر.",
    action:
      "خصص عشر دقائق لخمسة أسئلة قصيرة مع مؤقت، ثم صحح طريقة العمل لا النتيجة وحدها.",
  },
  {
    key: "silly-errors",
    theme: "بعد الخطأ الحسابي المتكرر",
    url: "https://math.stackexchange.com/questions/1933724/silly-errors-during-math-exams-and-effective-methods-of-checking",
    story:
      "طالب يصف أخطاء تظهر في الامتحان رغم معرفته بالطريقة، ويبحث عن مراجعة لا تستهلك وقت الحل كله.",
    lesson:
      "الكتابة المنظمة، سطر واحد لكل تحويل، والسؤال عن معقولية النتيجة تقلل الأخطاء قبل أن تتراكم.",
    action:
      "في تدريبك القادم، ضع دائرة حول كل انتقال جبري وراجع الانتقالات فقط في آخر دقيقتين.",
  },
  {
    key: "rules",
    theme: "حين تطبق القاعدة في المكان الخطأ",
    url: "https://math.stackexchange.com/questions/1499262/how-to-deal-with-misapplying-mathematical-rules",
    story:
      "طالب يذاكر ساعات ويظل يخشى أن يستعمل قاعدة صحيحة في حالة لا تنطبق عليها، فيضيع بين كثرة القوانين.",
    lesson:
      "كل قاعدة تحتاج بطاقة استعمال: الفرض، المثال الصحيح، والحالة التي يمنع فيها استخدامها.",
    action:
      "اختر قاعدة واحدة واكتب تحتها: متى أستعملها؟ وما مثال صغير لا يجوز فيه استعمالها؟",
  },
  {
    key: "success-story",
    theme: "النجاح ليس مسارًا مستقيمًا",
    url: "https://math.stackexchange.com/questions/925506/success-in-maths-soft-question",
    story:
      "سأل طالب عن أمل من لم يتفوق دائمًا في الجامعة، بعدما رأى صفحات رياضيين تبدو مسيرتهم خالية من التعثر.",
    lesson:
      "المقارنة بالسير المثالية تخفي سنوات العمل والخطأ؛ المهم هو بناء عادة تعلم يمكن الاستمرار فيها.",
    action: "قارن نفسك بدفترك قبل شهر، وسجل مهارة واحدة أصبحت أوضح عندك الآن.",
  },
  {
    key: "not-smart",
    theme: "قصة طالب ظن أنه ليس ذكيًا بما يكفي",
    url: "https://math.stackexchange.com/questions/962986/am-i-just-not-smart-enough",
    story:
      "يروي منشور تجربة طالب بدأ في مستوى جبري أعلى من استعداده، تعثر بقوة، ثم عاد إلى مستوى مناسب وبنى تقدمه تدريجيًا.",
    lesson:
      "العودة خطوة إلى الأساس ليست هزيمة؛ أحيانًا هي أقصر طريق إلى فهم ثابت.",
    action:
      "حدد آخر مهارة تصبح عندها المسألة ضبابية، وراجعها من أمثلة سهلة قبل الرجوع للدرس الحالي.",
  },
  {
    key: "late-start",
    theme: "البداية المتأخرة تحتاج أساسًا صادقًا",
    url: "https://math.stackexchange.com/questions/699918/mathematicians-who-started-late-similar-to-my-situation",
    story:
      "طالب غيّر تخصصه إلى الرياضيات بعد أن كان ضعيفًا فيها، لكنه اكتشف أن تجاوزه للأساسيات ترك فجوات تظهر في المقررات الأصعب.",
    lesson:
      "الحماس مهم، لكنه لا يعوض التمرين على المفاهيم الأولى؛ البناء الهادئ يسبق التسارع.",
    action:
      "اكتب قائمة بالأساسيات التي يستخدمها مقررك الحالي، وراجع واحدة منها يوميًا لمدة أسبوع.",
  },
  {
    key: "thinking-stuck",
    theme: "حين يسرق التفكير الضيق وقت الامتحان",
    url: "https://math.stackexchange.com/questions/2129402/advice-on-mathematical-thinking-and-problem-solving",
    story:
      "طالب يصف كيف تجعله التفاصيل يلتصق بمسار واحد في المسألة، حتى يشعر أن الوقت يمر من دون رؤية الصورة الكبيرة.",
    lesson:
      "التوقف القصير لتغيير التمثيل — رسم، مثال، أو صياغة أخرى — قد يفتح مسارًا لم يظهر مع التحديق نفسه.",
    action:
      "عندما تتعطل، اكتب ثلاث طرق مختلفة لتمثيل السؤال قبل متابعة الحساب.",
  },
  {
    key: "reading-book",
    theme: "لا تقرأ كتاب الرياضيات كالرواية",
    url: "https://math.stackexchange.com/questions/279079/how-to-read-a-book-in-mathematics",
    story:
      "قارئ لكتب مثل التحليل والطوبولوجيا يضيع قرب منتصف الكتاب لأن التفاصيل تتراكم قبل أن تتكون لديه خريطة للفصل.",
    lesson:
      "المرور الأول للاستكشاف، والثاني للتعريفات، ثم العودة إلى البراهين يخفف ضياع التفاصيل.",
    action:
      "قبل قراءة الفصل، اقرأ عناوينه فقط واكتب سؤالين تريد أن تجد إجابتهما فيه.",
  },
  {
    key: "without-solutions",
    theme: "التعلم وحدك حين لا توجد حلول للتمارين",
    url: "https://math.stackexchange.com/questions/881942/how-to-self-study-higher-math-without-solutions",
    story:
      "متعلم ذاتي وجد كتبًا قوية بلا حلول، فخاف أن يقضي وقتًا في أجوبة لا يعرف هل هي صحيحة أم لا.",
    lesson:
      "يمكن اختبار الحل بكتابة الفرض والهدف بوضوح، ومقارنة المنهج بنتائج سابقة، ثم طلب مراجعة لسؤال محدد عند الحاجة.",
    action:
      "اكتب في نهاية كل حل: أين استعملت كل فرض؟ وما السطر الذي لا تستطيع تبريره بعد؟",
  },
  {
    key: "hard-tricks",
    theme: "رأيت الحل وفهمته، لكن كيف وجده صاحبه؟",
    url: "https://math.stackexchange.com/questions/3996961/hard-problems-solving-tricks",
    story:
      "طالب في آخر سنوات الجامعة يفهم الحل الكامل بعد قراءته، لكنه لا يرى من أين جاءت الفكرة الأولى في المسائل الصعبة.",
    lesson:
      "الحل النهائي يخفي غالبًا محاولات كثيرة؛ ابحث عن الحالة الخاصة، والتخمين، والتحويل الذي جعل الفكرة ممكنة.",
    action:
      "بعد رؤية أي حل، أضف ملاحظة: ما السؤال الأصغر الذي ربما قاد إلى هذه الفكرة؟",
  },
  {
    key: "break-down",
    theme: "عندما لا تعرف حتى من أين تبدأ",
    url: "https://math.stackexchange.com/questions/3677720/what-should-i-do-when-i-get-stuck",
    story:
      "طالب يواجه مسألة لا يعرف أدواتها، فيشعر أن السؤال كتلة واحدة لا يمكن الاقتراب منها.",
    lesson:
      "تفكيك المسألة إلى النتائج والتعريفات اللازمة يحول الغموض إلى قائمة تعلم قابلة للعمل.",
    action:
      "اكتب أسماء النظريات التي تتوقعها، ثم اختر أول اسم لا تفهمه وراجعه وحده.",
  },
  {
    key: "give-up",
    theme: "متى تترك المسألة مؤقتًا؟",
    url: "https://math.stackexchange.com/questions/820004/when-to-give-up-on-a-hard-math-problem",
    story:
      "طالب عالق في سؤال صعب حتى صار يكرهه، مع أنه يحب حل المشكلات في الأصل.",
    lesson:
      "بدل مطاردة الجواب النهائي، استكشف شيئًا صغيرًا قريبًا: مثالًا، حالة خاصة، أو فرضًا مختلفًا.",
    action:
      "اختر حالة بسيطة للمسألة واكتب ما الذي يتغير فيها قبل أن تعود إلى النسخة العامة.",
  },
  {
    key: "stuck-tips",
    theme: "التعثر جزء من العمل الرياضي",
    url: "https://math.stackexchange.com/questions/461000/strategies-and-tips-what-to-do-when-stuck-on-math",
    story:
      "طرح طلاب سؤالًا مباشرًا لأن التعثر يتكرر معهم رغم القراءة والتمرين، وأرادوا بدائل عملية غير انتظار الإلهام.",
    lesson:
      "غيّر النشاط: اشرح لشخص، راجع تعريفًا، ارسم، أو ابتعد قليلًا ثم عد بسؤال أصغر.",
    action:
      "اكتب في هامش كل مسألة عالقة: آخر فكرة جديدة ظهرت؛ إذا لم توجد، غيّر النشاط.",
  },
  {
    key: "hard-stuck",
    theme: "المساعدة ليست غشًا بعد محاولة حقيقية",
    url: "https://math.stackexchange.com/questions/1057948/getting-stuck-on-difficult-problems",
    story:
      "طالب جامعي أمضى أيامًا مع مسائل لم يحلها، وكان يتردد في السؤال لأنه يرى الاستعانة بغيره تقليلًا من قيمة عمله.",
    lesson:
      "اطلب تلميحًا بعد أن توثق محاولتك؛ التعلم يحدث عندما تعود أنت لتكمل الطريق.",
    action:
      "قبل طلب المساعدة، جهز ثلاثة أسطر: المطلوب، ما جربته، وأول نقطة توقفت عندها.",
  },
  {
    key: "learn-proofs",
    theme: "كيف تتعلم من برهان قرأته؟",
    url: "https://math.stackexchange.com/questions/167778/how-to-learn-from-proofs",
    story:
      "قارئ يتساءل هل يكفي أن يفهم برهانًا مشهورًا أم أن عليه أن يفعل شيئًا أكثر من القراءة.",
    lesson:
      "محاولة إيجاد برهان مختلف، أو إعادة بناء البرهان من الذاكرة، تكشف سبب كل خطوة أكثر من المتابعة الصامتة.",
    action:
      "أغلق الكتاب بعد قراءة البرهان، واكتب مخططه من ثلاث مراحل دون تفاصيله.",
  },
  {
    key: "better-proofs",
    theme: "مهارة البرهان تبدأ من اللغة",
    url: "https://math.stackexchange.com/questions/7743/getting-better-at-proofs",
    story:
      "طالب يريد أن يتحسن في البراهين ويشعر أن السؤال «أثبت» يطلب منه شيئًا لا يشبه ما تدرب عليه سابقًا.",
    lesson:
      "فهم النفي، والكمّيات، والمقابل، والتناقض يمنحك أدوات افتتاح البرهان بدل انتظار الفكرة الغامضة.",
    action:
      "في مسألة اليوم، اكتب أولًا نفي المطلوب أو مقابله قبل تجربة أي حساب.",
  },
  {
    key: "good-proving",
    theme: "قبل كتابة البرهان: افهم الكلمات",
    url: "https://math.stackexchange.com/questions/190981/how-to-be-good-at-proving",
    story:
      "طالب يسأل كيف يصبح جيدًا في البرهان، ويكتشف من التجارب المنشورة أن العائق كثيرًا ما يكون في تعريفات السؤال نفسها.",
    lesson:
      "العمل مع زميل وشرح الحجة بصوتك يكشف الكلمات التي تعرف اسمها ولا تعرف استعمالها.",
    action:
      "اختر تعريفًا في المسألة واشرحه لزميل أو لنفسك بصوت مرتفع قبل البدء.",
  },
  {
    key: "stamina",
    theme: "لا تحمل المسألة كلها في رأسك",
    url: "https://math.stackexchange.com/questions/782887/improving-concentration-and-stamina-when-solving-difficult-problems",
    story:
      "طالب يريد زيادة التركيز في المسائل الطويلة ويجد أن أفكاره تتسرب عندما يحاول حفظ كل شيء في ذهنه.",
    lesson:
      "الورقة ليست ذاكرة احتياطية فقط؛ إنها مساحة لتنظيم المعطيات والنتائج الصغيرة حتى لا تضيع.",
    action:
      "خصص جانب الورقة للمعطيات، وجانبًا آخر للأسئلة أو النتائج الوسيطة أثناء الحل.",
  },
  {
    key: "test-anxiety",
    theme: "القلق لا يحل بالسرعة وحدها",
    url: "https://math.stackexchange.com/questions/2223081/how-do-i-overcome-my-test-anxiety",
    story:
      "طالب يعمل كثيرًا على السرعة في المسائل المعتادة، لكن نتيجته في الاختبار لا تعكس جهده فيزداد توتره.",
    lesson:
      "التدريب الزمني مفيد، لكنه يحتاج تشخيصًا: هل المشكلة في فهم السؤال، أو ترتيب الوقت، أو الحساب تحت الضغط؟",
    action:
      "حل نموذجًا قصيرًا بوقت محدد، ثم اكتب سبب كل توقف بدل الاكتفاء بالدرجة.",
  },
];

const modes = [
  { key: "story", prefix: "قصة طالب:", lead: "## قصة واقعية" },
  {
    key: "lesson",
    prefix: "درس من التجربة:",
    lead: "## ما الذي تكشفه التجربة؟",
  },
  { key: "plan", prefix: "خطة صغيرة:", lead: "## خطوة قابلة للتطبيق" },
  {
    key: "question",
    prefix: "سؤال صريح:",
    lead: "## حين تجد نفسك في هذا الموقف",
  },
] as const;

function attribution(url: string) {
  return `**المصدر والترخيص:** إعداد عربي موجز مستند إلى نقاش وتجربة طلابية منشورة. [رابط النص الأصلي](${url}). النص الأصلي وهذه الصياغة المشتقة مرخّصان بموجب [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).`;
}

function contentFor(source: Source, mode: (typeof modes)[number]) {
  const opening =
    mode.key === "story"
      ? source.story
      : mode.key === "lesson"
        ? `${source.story} وهذه التجربة لا تختصر الطالب في نتيجة أو لحظة تعثر.`
        : mode.key === "plan"
          ? `هذه الخطة خرجت من موقف واقعي: ${source.story}`
          : `إذا مررت بهذا الموقف، فأنت لست وحدك: ${source.story}`;

  return `${mode.lead}\n\n${opening}\n\n## خلاصة عملية\n\n1. ${source.lesson}\n2. ${source.action}\n3. لا تحكم على تقدمك من شعورك في يوم واحد؛ راقب ما أصبح أوضح في محاولاتك المكتوبة.\n\n${attribution(source.url)}`;
}

const articles = sources.flatMap((source, sourceIndex) =>
  modes.map((mode, modeIndex) => {
    const position = 21 + sourceIndex * modes.length + modeIndex;
    return {
      slug: `community-story-${String(position).padStart(3, "0")}-${source.key}-${mode.key}`,
      titleAr: `${mode.prefix} ${source.theme}`,
      summary: `${source.lesson} ${source.action}`,
      content: contentFor(source, mode),
      position,
    };
  }),
);

async function main() {
  if (articles.length !== 100)
    throw new Error("يجب أن تحتوي الدفعة على 100 مقال بالضبط.");

  for (const article of articles) {
    await prisma.article.upsert({
      where: { slug: article.slug },
      create: { ...article, published: true },
      update: { ...article, published: true },
    });
    console.log(`✅ ${article.position}. ${article.titleAr}`);
  }

  console.log(
    `\nتم إنشاء/تحديث ${articles.length} مقالة عربية قصيرة مستندة إلى تجارب طلابية.`,
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
