import type { Metadata } from "next";
import { Amiri } from "next/font/google";
import { CopyCcp } from "@/components/copy-ccp";
import { CoffeeViewPing } from "@/components/coffee-view-ping";
import { prisma } from "@/lib/prisma";

const amiri = Amiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "قهوة الدكتوراه ☕ — ادعم المنصة",
  description:
    "دعم شفاف ومباشر لاستمرار منصة أرشفة مواضيع مسابقات الدكتوراه في الرياضيات وتطويرها.",
};

const CCP_RAW = "00799999002781033371";
const CCP_DISPLAY = "0079 9999 0027 8103 3371";
const money = new Intl.NumberFormat("ar-DZ");

export default async function CoffeePage() {
  const entries = await prisma.coffeeSupport.findMany({
    orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
    select: { amountDzd: true, supporterName: true, receivedAt: true },
  });
  const total = entries.reduce((sum, entry) => sum + entry.amountDzd, 0);
  const supporterNames = Array.from(
    new Set(
      entries
        .map((entry) => entry.supporterName?.trim())
        .filter((name): name is string => Boolean(name)),
    ),
  );

  return (
    <main className={amiri.className + " mx-auto max-w-2xl px-4 py-12"}>
      <CoffeeViewPing />
      <header className="text-center">
        <div className="text-5xl" aria-hidden="true">☕</div>
        <h1 className="mt-3 text-2xl font-bold">قهوة الدكتوراه</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-muted-foreground">
          دعم اختياري وشفاف يساعد على تشغيل المنصة وتطويرها، مع بقاء محتواها
          متاحًا للجميع.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          إجمالي الدعم المؤكد حتى الآن:{" "}
          <span className="font-semibold text-foreground" dir="ltr">
            {money.format(total)} DZD
          </span>
          {" "}— يُحدّث بعد تحقق الإدارة من وصول المبلغ فعليًا.
        </p>
      </header>

      <div className="mx-auto my-8 h-px w-28 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

      <section className="space-y-4 text-justify text-[15px] leading-9 text-foreground/90">
        <h2 className="text-right text-lg font-bold">كيف بدأت فكرة Doc Math DZ؟</h2>
        <p>
          أنا طالب ماستر في الرياضيات، ولم يحالفني الحظ في اجتياز مسابقة الدكتوراه
          في أول محاولة. أثناء رحلة التحضير لاحظت أن الوصول إلى مواضيع السنوات
          السابقة كان مشتتًا، وأن الكثير من الملفات كانت مفقودة أو غير منظمة، مما
          يستهلك وقتًا وجهدًا كبيرين.
        </p>
        <p>
          أمتلك بعض المهارات في البرمجة، فقررت استثمارها في بناء منصة تجمع
          مواضيع مسابقات الدكتوراه في مكان واحد، بطريقة منظمة وسهلة الوصول،
          حتى لا يضطر كل طالب إلى إعادة البحث من الصفر كما حدث معي.
        </p>
        <p>
          لا يمثل هذا الموقع مشروعًا تجاريًا، بل هو مشروع معرفي مفتوح أعمل على
          تطويره باستمرار، وأتمنى أن يكون مرجعًا يفيد كل طالب وباحث يستعد
          لمسابقة الدكتوراه في الجزائر.
        </p>
      </section>

      <div className="mx-auto mt-8 max-w-md rounded-xl border border-amber-300/60 bg-amber-50/50 p-5 text-center dark:border-amber-700/40 dark:bg-amber-950/20">
        <p className="text-xs text-muted-foreground">الحساب البريدي الجاري — CCP</p>
        <p dir="ltr" className="mt-2 font-mono text-lg tracking-widest">
          {CCP_DISPLAY}
        </p>
        <div className="mt-3 flex justify-center">
          <CopyCcp value={CCP_RAW} />
        </div>
      </div>

      <section className="mt-10 space-y-4 text-justify text-[15px] leading-9 text-foreground/90">
        <h2 className="text-right text-lg font-bold">الشفافية</h2>
        <p>
          جميع المبالغ التي يتم تقديمها عبر صفحة «قهوة الدكتوراه» تُستخدم في
          تطوير المنصة والحفاظ على استمراريتها، مثل تكاليف الاستضافة، اسم
          النطاق، الخدمات التقنية، وتطوير الميزات الجديدة. ولا تُستخدم لتحقيق
          ربح شخصي.
        </p>
        <p className="text-sm text-muted-foreground">
          لا نعرض وعود الدعم ولا تقديرات غير مؤكدة؛ الرقم المنشور أعلاه يمثل فقط
          المبالغ التي تحققت الإدارة من وصولها.
        </p>
      </section>

      <section className="mt-10 rounded-xl border bg-card p-6">
        <div className="text-center">
          <span className="text-2xl" aria-hidden="true">🌿</span>
          <h2 className="mt-2 text-lg font-bold">شكرًا لداعمي المنصة</h2>
        </div>

        {supporterNames.length > 0 && (
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {supporterNames.map((name) => (
              <li
                key={name}
                className="rounded-lg border bg-background px-4 py-3 text-center text-sm"
              >
                {name}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-5 text-justify text-sm leading-8 text-foreground/90">
          شكرًا لكل من ساهم في دعم Doc Math DZ، سواء بمشاركة موضوع، أو الإبلاغ عن
          خطأ، أو نشر الموقع، أو تقديم دعم مالي. كل مساهمة، مهما كانت بسيطة،
          تساعد على بناء مرجع أفضل يستفيد منه الجميع.
        </p>
      </section>
    </main>
  );
}
