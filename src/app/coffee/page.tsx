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
  const lastUpdate = entries[0]?.receivedAt ?? null;

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
      </header>

      <div className="mx-auto my-8 h-px w-28 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

      <section className="rounded-xl border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">إجمالي الدعم المؤكد حتى الآن</p>
        <p className="mt-3 text-4xl font-bold text-primary" dir="ltr">
          {money.format(total)} DZD
        </p>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">
          يُحدّث هذا الرقم فقط بعد تحقق الإدارة من وصول المبلغ فعليًا.
          {lastUpdate
            ? ` آخر تحديث: ${lastUpdate.toLocaleDateString("ar-DZ")}.`
            : " لم تُسجّل مساهمات مؤكدة بعد."}
        </p>
      </section>

      <section className="mt-8 space-y-5 text-justify text-[15px] leading-9 text-foreground/90">
        <h2 className="text-right text-lg font-bold">لماذا يوجد هذا الدعم؟</h2>
        <p>
          DocMath DZ مبادرة مستقلة لتنظيم وحفظ مواضيع مسابقات الدكتوراه في
          الرياضيات وتقديمها بصيغة واضحة وقابلة للبحث والتحميل. استخدام المنصة
          مجاني، والدعم ليس شرطًا للوصول إلى أي محتوى أو ميزة.
        </p>
        <p>
          <b>هذه المبالغ ليست ربحًا شخصيًا.</b> تُخصّص لتطوير الموقع، وصيانته،
          وتجديد النطاق، ودفع تكاليف الاستضافة والتخزين والخدمات التقنية اللازمة
          لإبقائه متاحًا لسنوات قادمة.
        </p>
        <p>
          لا نعرض وعود الدعم ولا تقديرات غير مؤكدة؛ الرقم المنشور أعلاه يمثل فقط
          المبالغ التي تحققت الإدارة من وصولها.
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

      <section className="mt-10 rounded-xl border bg-card p-6">
        <div className="text-center">
          <span className="text-2xl" aria-hidden="true">🌿</span>
          <h2 className="mt-2 text-lg font-bold">شكرًا لداعمي المنصة</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            كل مساهمة، مهما كان حجمها، تساعدنا على تحسين الأرشيف واستمراره.
          </p>
        </div>

        {supporterNames.length > 0 ? (
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
        ) : (
          <p className="mt-5 text-center text-sm text-muted-foreground">
            شكرًا لكل من يدعم المنصة ماديًا، أو يشاركها، أو يساهم في تحسين محتواها.
          </p>
        )}
      </section>

      <p className="mt-8 text-center text-sm leading-8 text-muted-foreground">
        مشاركة الموقع مع الطلبة والمساهمة في تصحيح المحتوى شكلان مهمان من الدعم أيضًا.
      </p>
    </main>
  );
}
