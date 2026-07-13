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
  ["study-tools", "🧰 أدوات المذاكرة"],
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

// إحصائية صغيرة بدون صندوق
function Stat({
  icon,
  value,
  label,
}: {
  icon: string;
  value: number;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span>{icon}</span>
      <b className="text-primary">{value.toLocaleString("en-US")}</b>
      <span className="text-xs text-muted-foreground">{label}</span>
    </span>
  );
}

// قسم قابل للطي بدون صندوق — انقر العنوان للإخفاء/الإظهار
function Section({
  id,
  title,
  accent,
  children,
}: {
  id: string;
  title: string;
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      id={id}
      open
      className={
        "group scroll-mt-20" + (accent ? " border-s-2 border-amber-400 ps-4" : "")
      }
    >
      <summary className="flex cursor-pointer select-none list-none items-center gap-3 py-1 [&::-webkit-details-marker]:hidden">
        <h2 className="shrink-0 text-base font-bold">{title}</h2>
        <span className="h-px flex-1 bg-gradient-to-l from-border to-transparent" />
        <span className="text-[10px] text-muted-foreground transition-transform group-open:rotate-180">
          ▼
        </span>
      </summary>
      <div className="mt-2 space-y-3 text-sm leading-7 text-muted-foreground">
        {children}
      </div>
    </details>
  );
}

export default async function AboutPage() {
  const stats = await getStats();

  return (
    <main id="top" className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <header className="text-center">
        <h1 className="text-xl font-bold">📚 حول الموقع</h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
          دليلك الشامل لفهم المنصة: ما هي، كيف تتصفحها، كيف تُنظّم مواضيعها، وكيف
          تساهم في توسيعها.
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          ⏱️ وقت القراءة: حوالي 8 دقائق · 💡 انقر عنوان أي قسم لطيه أو فتحه
        </p>
      </header>

      {/* إحصائيات صغيرة بدون صناديق */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <Stat icon="📄" value={stats.topics} label="موضوع منشور" />
        <Stat icon="🧮" value={stats.problems} label="تمرين" />
        <Stat icon="🏛️" value={stats.universities} label="جامعة" />
        <Stat icon="🧭" value={stats.specialties} label="تخصص" />
        <Stat icon="👥" value={stats.users} label="مستخدم" />
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* فهرس القراءة — قابل للإخفاء، بدون صندوق */}
        <aside className="shrink-0 lg:w-56">
          <details open className="group/toc text-sm lg:sticky lg:top-16">
            <summary className="flex cursor-pointer select-none list-none items-center gap-2 pb-2 text-xs font-semibold text-muted-foreground [&::-webkit-details-marker]:hidden">
              📑 محتويات الصفحة
              <span className="text-[9px] transition-transform group-open/toc:rotate-180">
                ▼
              </span>
            </summary>
            {TOC.map(([anchor, label]) => (
              <a
                key={anchor}
                href={`#${anchor}`}
                className="block rounded px-2 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-primary"
              >
                {label}
              </a>
            ))}
          </details>
        </aside>

        <div className="min-w-0 flex-1 space-y-7">
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
              className="inline-block rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90"
            >
              تصفّح المواضيع الآن ←
            </Link>
          </Section>

          <Section id="specialties" title="🔀 لماذا قد لا تجد تخصصك؟">
            <p>
              تستخدم بعض الجامعات أسماء مختلفة لنفس التخصص، لذلك تم توحيدها داخل
              تصنيف واحد لتسهيل البحث:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-sm">
                <thead>
                  <tr className="border-b text-foreground">
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

          <Section id="study-tools" title="🧰 أدوات المذاكرة">
            <p>
              داخل صفحة كل موضوع ستجد أدوات صغيرة صُممت لتساعدك على المذاكرة
              بفعالية:
            </p>
            <ul className="list-disc space-y-2 pr-5">
              <li>
                ⬅️➡️ <b>أسهم التنقل:</b> انتقل للموضوع التالي أو السابق مباشرة دون
                العودة للقائمة. إذا كنت مفعّلًا فلترة (تخصص، جامعة، سنة) فإن
                الأسهم تتنقل داخل نتائج تلك الفلترة نفسها. تظهر الأسهم على جانبي
                الشاشة في الحاسوب وأسفل الموضوع في الهاتف.
              </li>
              <li>
                ✅ <b>تم الحل:</b> علّم أي موضوع أنهيت حله بضغطة واحدة، وستظهر
                شارة «أنهيت حل هذا الموضوع» أعلاه حتى لا تعيد حله مرة أخرى.
              </li>
              <li>
                📈 <b>تتبع التقدم:</b> في لوحتك الشخصية قسم «تقدمي في الحل» يعرض
                عدد المواضيع التي أنهيتها من إجمالي المواضيع المنشورة مع شريط
                تقدم وقائمة آخر المواضيع المحلولة.
              </li>
              <li>
                ⏱ <b>مؤقّت الحل:</b> شغّل المؤقت قبل البدء لتحل الموضوع في ظروف
                مشابهة للمسابقة الحقيقية — مع إيقاف مؤقت وتصفير وشريط أنيق أعلى
                الصفحة.
              </li>
              <li>
                ⭐ <b>الحفظ:</b> احفظ المواضيع المهمة للعودة إليها سريعًا من لوحتك
                الشخصية.
              </li>
            </ul>
          </Section>

          <Section id="ai-notice" title="🤖 تنبيه مهم حول المواضيع والحلول" accent>
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
              للمساعدة في الفهم والمراجعة، وليست مرجعًا نهائيًا.
            </p>
            <p className="font-semibold text-foreground">ننصح دائمًا بما يلي:</p>
            <ul className="list-disc space-y-1 pr-5">
              <li>التحقق من صحة الحل قبل الاعتماد عليه.</li>
              <li>مقارنة الحل بمراجع علمية أو كتب متخصصة عند الحاجة.</li>
              <li>الرجوع إلى أستاذ المادة في حال وجود شك في أي خطوة من خطوات الحل.</li>
              <li>الاعتماد على التفكير والتحليل الرياضي، وعدم الاكتفاء بالحلول الجاهزة.</li>
            </ul>
            <p className="font-semibold text-foreground">إذا لاحظت أيًا مما يلي:</p>
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
          </Section>

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
            <p>
              يمكنك المساهمة مباشرة من داخل الموقع عبر صفحة{" "}
              <Link href="/contribute" className="font-medium text-primary underline">
                ساهم معنا
              </Link>
              ، أو مراسلتنا عبر البريد الإلكتروني:{" "}
              <a
                href={"mailto:" + CONTACT_EMAIL}
                className="font-medium text-primary underline"
                dir="ltr"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
            <p>
              كل مساهمة، مهما كانت بسيطة، تساعد في بناء أكبر أرشيف رقمي لمواضيع
              الدكتوراه في الرياضيات بالجامعات الجزائرية. نشكر كل من ساهم أو سيساهم
              في هذا المشروع، فنجاحه واستمراره يعتمد على تعاون المجتمع الأكاديمي
              ومشاركة المعرفة بين الجميع.
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
            <div className="divide-y">
              {FAQ_ITEMS.map(([question, answer]) => (
                <details key={question} className="group/faq py-2">
                  <summary className="flex cursor-pointer select-none list-none items-center gap-2 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
                    <span className="text-[9px] text-muted-foreground transition-transform group-open/faq:rotate-90">
                      ◀
                    </span>
                    {question}
                  </summary>
                  <p className="mt-2 pr-4 leading-7">{answer}</p>
                </details>
              ))}
            </div>
          </Section>

          <Section id="sitemap" title="🗺️ خارطة الموقع">
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {SITE_LINKS.map(([icon, label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="text-sm text-foreground transition hover:text-primary"
                >
                  {icon} {label}
                </Link>
              ))}
            </div>
          </Section>

          {/* خاتمة لطيفة + العودة للأعلى */}
          <div className="space-y-2 pt-2 text-center">
            <a
              href="#top"
              className="inline-block rounded-full border px-4 py-1.5 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
            >
              ⬆️ العودة للأعلى
            </a>
            <p className="text-[11px] text-muted-foreground">
              صُنع بحب 💙 لطلبة الرياضيات في الجزائر
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
