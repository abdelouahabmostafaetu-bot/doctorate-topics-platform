import Link from "next/link";
import type { ReactNode } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "حول الموقع — منصة مواضيع دكتوراه الرياضيات",
  description:
    "دليل شامل للمنصة: نبذة عن الموقع، كيفية التصفح، تنظيم المواضيع، تنبيه الذكاء الاصطناعي، طرق المساهمة، والأسئلة الشائعة.",
};

const CONTACT_EMAIL = "edumoustapha60@gmail.com";

const SPECIALTY_ROWS: Array<[string, string]> = [
  ["Analyse Mathématique et Applications", "تحليل دالي"],
  ["Functional Analysis / Analyse Fonctionnelle", "تحليل دالي"],
  ["Algèbre Moderne / Structures Algébriques", "جبر"],
  ["Géométrie Différentielle", "هندسة"],
  ["Topologie Algébrique", "طوبولوجيا"],
  ["Probabilités", "احتمالات"],
  ["Statistique Mathématique", "احتمالات وإحصاء"],
  ["Équations Différentielles", "معادلات تفاضلية"],
];

const FAQ_ITEMS: Array<[string, string]> = [
  [
    "لماذا لا أجد جامعتي؟",
    "لأن مواضيعها لم تصل إلينا بعد أو لم تتم أرشفتها. الموقع يتوسع باستمرار، وإذا كانت لديك مواضيع جامعتك فمساهمتك ستساعد آلاف الطلبة.",
  ],
  [
    "لماذا تم دمج بعض التخصصات؟",
    "لأن الجامعات تستخدم أسماء مختلفة لنفس المجال العلمي، فاعتمد الموقع تصنيفًا موحدًا يسهل الوصول إلى جميع المواضيع المتشابهة (راجع جدول التخصصات أعلاه).",
  ],
  [
    "كيف أساهم بموضوع؟",
    "من صفحة «ساهم» يمكنك كتابة الموضوع بـ LaTeX مباشرة، أو رفع ملفات بأي صيغة كانت (صور، PDF، Word، LaTeX، ملفات مضغوطة) حتى 100 ملف دفعة واحدة، وسنتولى مراجعتها وإضافتها.",
  ],
  [
    "هل يجب أن أعرف LaTeX للمساهمة؟",
    "لا إطلاقًا. يكفي أن ترسل صور الموضوع ولو كانت ملتقطة بالهاتف، أو ملف PDF، وسنتولى إعادة كتابته وتنسيقه.",
  ],
  [
    "هل الحلول المعروضة صحيحة دائمًا؟",
    "معظم الحلول مولدة بالذكاء الاصطناعي وتمت مراجعة نسبة كبيرة منها، لكن لا يمكن ضمان خلوها جميعًا من الأخطاء. اعتبرها وسيلة للفهم والمراجعة وتحقق دائمًا من صحتها.",
  ],
  [
    "كيف أبلغ عن خطأ في موضوع أو حل؟",
    "افتح صفحة الموضوع ثم استخدم نموذج الإبلاغ الموجود فيها، وحدد نوع الخطأ (محتوى خاطئ، ملف تالف، تصنيف خاطئ…) وسنراجعه في أقرب وقت.",
  ],
  [
    "كيف أحفظ موضوعًا للرجوع إليه لاحقًا؟",
    "سجل دخولك ثم اضغط على زر النجمة ⭐ في صفحة الموضوع، وستجده في «لوحتي الشخصية».",
  ],
  [
    "هل استخدام الموقع مجاني؟",
    "نعم، الموقع مجاني بالكامل وهدفه إتاحة المواضيع لجميع الطلبة والباحثين.",
  ],
  [
    "كيف تُعرض المعادلات الرياضية؟",
    "تُكتب التمارين بلغة LaTeX وتُعرض بجودة عالية داخل صفحات المواضيع، مما يسهل قراءتها ونسخها.",
  ],
  [
    "هل يمكنني تحميل الموضوع كملف PDF؟",
    "إذا كان الموضوع يحتوي على ملفات مرفقة (PDF الموضوع أو الحل) فستجد أزرار التحميل في صفحة الموضوع.",
  ],
];

const SITE_LINKS: Array<[string, string, string]> = [
  ["🏠", "الصفحة الرئيسية", "/"],
  ["📄", "المواضيع والبحث", "/search"],
  ["ℹ️", "حول الموقع", "/about"],
  ["🟢", "حالة الخدمات", "/status"],
  ["📝", "سجل التغييرات", "/changelog"],
  ["👤", "لوحتي الشخصية", "/account"],
  ["🔑", "تسجيل الدخول", "/signin"],
  ["✨", "إنشاء حساب", "/signup"],
];

const TOC: Array<[string, string]> = [
  ["intro", "🎯 نبذة عن الموقع"],
  ["browse", "🧭 كيفية التصفح"],
  ["specialties", "🔀 التخصصات"],
  ["organization", "🗂️ تنظيم المواضيع"],
  ["search", "🔎 البحث الذكي"],
  ["ai-notice", "🤖 تنبيه مهم"],
  ["contribute", "🌱 ساهم في المشروع"],
  ["quality", "✅ جودة البيانات"],
  ["copyright", "⚖️ حقوق النشر"],
  ["report", "🚨 الإبلاغ عن خطأ"],
  ["faq", "❓ الأسئلة الشائعة"],
  ["sitemap", "🗺️ خارطة الموقع"],
];

async function getStats() {
  const [topics, universities, specialties, users] = await Promise.all([
    prisma.topic.count({ where: { status: "published" } }),
    prisma.university.count(),
    prisma.specialty.count(),
    prisma.user.count(),
  ]);
  let problems = 0;
  try {
    const agg = (await prisma.topic.aggregateRaw({
      pipeline: [
        { $match: { status: "published" } },
        { $project: { n: { $size: { $ifNull: ["$problems", []] } } } },
        { $group: { _id: null, total: { $sum: "$n" } } },
      ] as unknown as Prisma.InputJsonValue[],
    })) as unknown as Array<{ total?: unknown }>;
    const raw = agg?.[0]?.total;
    problems = typeof raw === "number" ? raw : 0;
  } catch {
    problems = 0;
  }
  return { topics, universities, specialties, users, problems };
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: string;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 text-center shadow-sm">
      <div className="text-2xl">{icon}</div>
      <div className="mt-1 text-2xl font-bold text-primary">
        {value.toLocaleString("en-US")}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 rounded-lg border bg-card p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export default async function AboutPage() {
  const stats = await getStats();

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header className="text-center">
        <h1 className="text-2xl font-bold sm:text-3xl">📚 حول الموقع</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
          دليلك الشامل لفهم المنصة: ما هي، كيف تتصفحها، كيف تُنظَّم مواضيعها، وكيف
          تساهم في توسيعها.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon="📄" value={stats.topics} label="موضوع منشور" />
        <StatCard icon="🧮" value={stats.problems} label="تمرين" />
        <StatCard icon="🏛️" value={stats.universities} label="جامعة" />
        <StatCard icon="🧭" value={stats.specialties} label="تخصص" />
        <StatCard icon="👥" value={stats.users} label="مستخدم" />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="shrink-0 lg:w-60">
          <nav className="rounded-lg border bg-card p-3 text-sm shadow-sm lg:sticky lg:top-20">
            <p className="mb-2 px-2 text-xs font-semibold text-muted-foreground">
              محتويات الصفحة
            </p>
            {TOC.map(([anchor, label]) => (
              <a
                key={anchor}
                href={`#${anchor}`}
                className="block rounded px-2 py-1.5 transition hover:bg-muted hover:text-primary"
              >
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 space-y-6">
      <Section id="intro" title="🎯 نبذة عن الموقع">
        <p>
          هذه منصة متخصصة لجمع وتنظيم مواضيع مسابقات الالتحاق بالدكتوراه في
          الرياضيات بالجامعات الجزائرية، بهدف تسهيل الوصول إليها في مكان واحد بدلًا
          من البحث في مواقع الجامعات المختلفة.
        </p>
        <p>يعمل الموقع على:</p>
        <ul className="list-disc space-y-1 pr-5">
          <li>جمع مواضيع الدكتوراه من مختلف الجامعات.</li>
          <li>تنظيمها حسب التخصص والجامعة والسنة.</li>
          <li>توفير البحث السريع.</li>
          <li>عرض المواضيع بجودة عالية.</li>
          <li>دعم كتابة التمارين بلغة LaTeX.</li>
          <li>الحفاظ على أرشيف دائم للمواضيع.</li>
        </ul>
      </Section>

      <Section id="browse" title="🧭 كيفية تصفح الموقع">
        <p>من صفحة «المواضيع» يمكنك الوصول إلى ما تريد بعدة طرق:</p>
        <ul className="list-disc space-y-1 pr-5">
          <li>حسب الجامعة — مثال: جامعة البليدة 1.</li>
          <li>حسب السنة — مثال: 2025.</li>
          <li>حسب نوع المسابقة — عام أو تخصص.</li>
          <li>حسب التخصص — مثال: تحليل دالي.</li>
          <li>حسب الكلمات المفتاحية أو عنوان الموضوع عبر خانة البحث.</li>
        </ul>
        <p>
          مثال عملي: للعثور على مواضيع «تحليل دالي» لسنة 2024، اختر التخصص من
          الفلتر وحدد السنة، أو اكتب ما تبحث عنه مباشرة في خانة البحث.
        </p>
        <Link
          href="/search"
          className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          تصفّح المواضيع الآن ←
        </Link>
      </Section>

      <Section id="specialties" title="🔀 لماذا قد لا تجد تخصصك؟">
        <p>
          تستخدم بعض الجامعات أسماء مختلفة لنفس التخصص، لذلك تم توحيدها داخل تصنيف
          واحد لتسهيل البحث:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-foreground">
                <th className="p-2 text-right font-semibold">الاسم في الجامعة</th>
                <th className="p-2 text-right font-semibold">التصنيف داخل الموقع</th>
              </tr>
            </thead>
            <tbody>
              {SPECIALTY_ROWS.map(([original, unified]) => (
                <tr key={original} className="border-b last:border-0">
                  <td className="p-2" dir="ltr">
                    {original}
                  </td>
                  <td className="p-2 font-medium text-foreground">{unified}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          قد تختلف أسماء التخصصات من جامعة إلى أخرى، لذلك اعتمد الموقع تصنيفًا
          موحدًا لتسهيل الوصول إلى جميع المواضيع ذات المجال العلمي نفسه.
        </p>
      </Section>

      <Section id="organization" title="🗂️ كيف يتم تنظيم المواضيع؟">
        <p>كل موضوع في الموقع يحتوي على:</p>
        <ul className="list-disc space-y-1 pr-5">
          <li>الجامعة والسنة والتخصص ونوع المسابقة.</li>
          <li>نص التمارين مكتوبًا بلغة LaTeX بجودة عالية.</li>
          <li>الحل (إن وجد).</li>
          <li>الملفات المرفقة (PDF الموضوع أو الحل).</li>
          <li>معلومات إضافية عند توفرها: المعامل، مدة المسابقة، تاريخها.</li>
        </ul>
      </Section>

      <Section id="search" title="🔎 البحث الذكي">
        <p>البحث في الموقع لا يعتمد على العنوان فقط، وإنما يشمل:</p>
        <ul className="list-disc space-y-1 pr-5">
          <li>عنوان الموضوع.</li>
          <li>محتوى التمارين.</li>
          <li>اسم الجامعة.</li>
          <li>السنة.</li>
          <li>التخصص.</li>
          <li>الكلمات المفتاحية.</li>
        </ul>
      </Section>

      <section
        id="ai-notice"
        className="scroll-mt-20 rounded-lg border border-amber-300 bg-amber-50 p-5 shadow-sm dark:border-amber-900 dark:bg-amber-950"
      >
        <h2 className="mb-3 text-lg font-bold text-amber-900 dark:text-amber-100">
          🤖 تنبيه مهم حول المواضيع والحلول
        </h2>
        <div className="space-y-3 text-sm leading-7 text-amber-900/90 dark:text-amber-100/90">
          <p>
            يعمل الموقع على إعادة كتابة عدد كبير من مواضيع مسابقات الالتحاق
            بالدكتوراه باستخدام نظام ذكاء اصطناعي متقدم، بهدف تحويل الصور وملفات
            PDF إلى نصوص رياضية مكتوبة بلغة LaTeX بجودة عالية، مما يجعلها أكثر
            وضوحًا وأسهل للقراءة والبحث والنسخ.
          </p>
          <p>
            تم استخدام نموذج <strong>Fable</strong> في جزء من هذه العملية لإعادة
            تنسيق المواضيع وكتابتها بصيغة رياضية احترافية، مع المحافظة قدر الإمكان
            على مطابقة النص الأصلي.
          </p>
          <p>
            أما الحلول المرفقة، فقد تم توليد معظمها باستخدام تقنيات الذكاء
            الاصطناعي، كما تمت مراجعة نسبة كبيرة منها والتحقق من صحتها. ومع ذلك،
            لا يمكن ضمان خلو جميع الحلول من الأخطاء، لذلك يجب اعتبارها وسيلة
            للمساعد�� في الفهم والمراجعة، وليست مرجعًا نهائيًا.
          </p>
          <p className="font-semibold">ننصح دائمًا بما يلي:</p>
          <ul className="list-disc space-y-1 pr-5">
            <li>التحقق من صحة الحل قبل الاعتماد عليه.</li>
            <li>مقارنة الحل بمراجع علمية أو كتب متخصصة عند الحاجة.</li>
            <li>الرجوع إلى أستاذ المادة في حال وجود شك في أي خطوة من خطوات الحل.</li>
            <li>الاعتماد على التفكير والتحليل الرياضي، وعدم الاكتفاء بالحلول الجاهزة.</li>
          </ul>
          <p className="font-semibold">إذا لاحظت أيًا مما يلي:</p>
          <ul className="list-disc space-y-1 pr-5">
            <li>خطأ في نص الموضوع.</li>
            <li>خطأ في التنسيق الرياضي أو معادلات LaTeX.</li>
            <li>خطأ في الحل.</li>
            <li>نقص في صفحات الموضوع.</li>
            <li>خطأ في سنة المسابقة.</li>
            <li>خطأ في اسم الجامعة أو التخصص.</li>
            <li>أي معلومات غير دقيقة.</li>
          </ul>
          <p>
            يرجى إرسال بلاغ من خلال نموذج «الإبلاغ عن خطأ» الموجود في صفحة كل
            موضوع، وسيتم مراجعة البلاغ وتصحيح المحتوى في أقرب وقت ممكن.
          </p>
        </div>
      </section>

      <Section id="contribute" title="🌱 هذا الموقع ثمرة سنوات من العمل">
        <p>
          لم يُبنَ هذا الموقع في يوم أو شهر، بل هو ثمرة سنوات من البحث وجمع وتنظيم
          مواضيع مسابقات الالتحاق بالدكتوراه في الرياضيات من مختلف الجامعات
          الجزائرية. وقد بُذل جهد كبير في أرشفة المواضيع وإعادة تنسيقها وكتابتها
          بصيغة رياضية واضحة، لتكون مرجعًا مجانيًا ومتاحًا لجميع الطلبة والباحثين.
        </p>
        <p>
          ورغم ما يحتويه الموقع من مئات المواضيع، فما زال هناك العديد من المواضيع
          غير المتوفرة أو التي لم تُنشر بعد. لذلك يعتمد استمرار نمو هذا المشروع على
          مساهمة المجتمع الأكاديمي. إذا كنت تمتلك أي موضوع لمسابقة دكتوراه، سواء
          كان حديثًا أو قديمًا، فإن مساهمتك ستكون ذات قيمة كبيرة وستساعد آلاف
          الطلبة في المستقبل.
        </p>
        <p className="font-semibold text-foreground">يمكنك المساهمة بعدة طرق:</p>
        <ul className="list-disc space-y-1 pr-5">
          <li>كتابة الموضوع بلغة LaTeX.</li>
          <li>إرسال صور الموضوع، حتى وإن كانت ملتقطة بالهاتف.</li>
          <li>إرسال ملف PDF.</li>
          <li>إرسال ملفات Word أو ملفات LaTeX.</li>
          <li>إرسال ملفات مضغوطة (ZIP أو RAR أو 7Z).</li>
          <li>إرسال مجلد كامل يحتوي على جميع ملفات الموضوع.</li>
        </ul>
        <p>
          ولا يشترط إطلاقًا معرفة لغة LaTeX للمساهمة. إذا كان لديك الموضوع بأي
          صيغة كانت، فما عليك إلا إرساله وسنتولى مراجعته وإعادة تنسيقه وإضافته إلى
          الموقع بعد التحقق من محتواه.
        </p>
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
          <p>
            يمكنك المساهمة مباشرة من داخل الموقع عبر صفحة{" "}
            <Link href="/contribute" className="font-medium text-primary underline">
              ساهم معنا
            </Link>
            ، أو مراسلتنا عبر البريد الإلكتروني:
            {" "}
            <a
              href={"mailto:" + CONTACT_EMAIL}
              className="font-medium text-primary underline"
              dir="ltr"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
        <p>
          كل مساهمة، مهما كانت بسيطة، تساعد في بناء أكبر أرشيف رقمي لمواضيع
          الدكتوراه في الرياضيات بالجامعات الجزائرية. نشكر كل من ساهم أو سيساهم في
          هذا المشروع، فنجاحه واستمراره يعتمد على تعاون المجتمع الأكاديمي ومشاركة
          المعرفة بين الجميع.
        </p>
      </Section>

      <Section id="quality" title="✅ جودة البيانات">
        <p>يحرص الموقع على المحافظة على:</p>
        <ul className="list-disc space-y-1 pr-5">
          <li>صحة المعلومات (الجامعة، السنة، التخصص).</li>
          <li>وضوح النصوص والتنسيق الرياضي الصحيح.</li>
          <li>عدم وجود مواضيع مكررة.</li>
          <li>سهولة القراءة على جميع الأجهزة.</li>
        </ul>
      </Section>

      <Section id="copyright" title="⚖️ حقوق النشر">
        <p>
          جميع المواضيع تعود إلى الجامعات الجزائرية، ويقوم الموقع بإعادة تنظيمها
          وأرشفتها لتسهيل الوصول إليها مع احترام حقوق أصحابها.
        </p>
      </Section>

      <Section id="report" title="🚨 الإبلاغ عن خطأ">
        <p>يمكنك الإبلاغ عن:</p>
        <ul className="list-disc space-y-1 pr-5">
          <li>خطأ في الحل أو في نص الموضوع.</li>
          <li>خطأ في اسم الجامعة أو السنة أو التخصص.</li>
          <li>ملف تالف أو صور ناقصة.</li>
          <li>مشكلة في عرض معادلات LaTeX.</li>
        </ul>
        <p>
          افتح صفحة الموضوع المعني واستخدم نموذج «الإبلاغ عن خطأ» الموجود فيها —
          يصل البلاغ مباشرة إلى فريق المراجعة.
        </p>
      </Section>

      <Section id="faq" title="❓ الأسئلة الشائعة">
        <div className="space-y-2">
          {FAQ_ITEMS.map(([question, answer]) => (
            <details key={question} className="rounded-md border bg-background p-3">
              <summary className="cursor-pointer text-sm font-medium text-foreground">
                {question}
              </summary>
              <p className="mt-2 leading-7">{answer}</p>
            </details>
          ))}
        </div>
      </Section>

      <Section id="sitemap" title="🗺️ خارطة الموقع">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SITE_LINKS.map(([icon, label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-md border bg-background p-3 text-center text-sm text-foreground transition hover:border-primary hover:text-primary"
            >
              <span className="ml-1">{icon}</span> {label}
            </Link>
          ))}
        </div>
      </Section>
        </div>
      </div>
    </main>
  );
}
