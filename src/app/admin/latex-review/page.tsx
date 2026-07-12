import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PolishUrlForm } from "@/components/admin/polish-url-form";
import { polishByUrlAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "مراجعة LaTeX — لوحة الإدارة",
};

export const maxDuration = 60;

export default async function LatexReviewListPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const [pending, doneCount, rejectedCount, queueCount] = await Promise.all([
    prisma.topic.findMany({
      where: { latexReview: "pending" },
      include: { university: true, specialty: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.topic.count({ where: { latexReview: "done" } }),
    prisma.topic.count({ where: { latexReview: "rejected" } }),
    prisma.topic.count({ where: { latexReview: null, status: "published" } }),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold">✨ مراجعة تحسين LaTeX</h2>
        <span className="text-[11px] text-muted-foreground">
          {pending.length} بانتظار المراجعة · {doneCount} مطبّق · {rejectedCount}{" "}
          مرفوض · {queueCount} لم يُعالج بعد
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        السكريبت يحسّن الصياغة فقط دون لمس المحتوى الرياضي — ولا يُطبّق أي
        تغيير إلا بموافقتك هنا.
      </p>

      {/* طريقة التوليد */}
      <div className="mt-3 border-s-2 border-primary/40 ps-3 text-[11px] text-muted-foreground">
        <p className="font-medium text-foreground">لتوليد نسخ محسّنة جديدة (من جهازك):</p>
        <p className="mt-1" dir="ltr">
          <code className="rounded bg-muted px-1.5 py-0.5">
            node scripts/latex-polish.mjs 20
          </code>
        </p>
        <p className="mt-1">
          يتطلب <code className="rounded bg-muted px-1 py-0.5" dir="ltr">MISTRAL_API_KEY</code>{" "}
          في ملف .env — مفتاح من console.mistral.ai
        </p>
      </div>

      {/* تحسين موضوع واحد برابطه مباشرة */}
      <div className="mt-4 rounded-lg border border-primary/25 bg-primary/5 p-3">
        <h3 className="text-xs font-bold">🤖 تحسين موضوع واحد بالذكاء الاصطناعي</h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          الصق رابط الموضوع كما يظهر في أعلى المتصفح — سيحسّن Mistral كتابة
          LaTeX ثم تُفتح لك صفحة المراجعة للموافقة قبل تطبيق أي تغيير.
        </p>
        <PolishUrlForm action={polishByUrlAction} />
        {sp.error && (
          <p className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-[11px] text-destructive">
            ⚠️ {sp.error}
          </p>
        )}
      </div>

      {pending.length === 0 ? (
        <p className="mt-6 py-10 text-center text-xs text-muted-foreground">
          لا توجد مواضيع بانتظار المراجعة — شغّل السكريبت أعلاه ثم عد إلى هنا
        </p>
      ) : (
        <div className="mt-4 divide-y">
          {pending.map((t) => (
            <Link
              key={t.id}
              href={`/admin/latex-review/${t.id}`}
              className="group flex items-center gap-3 py-2.5"
            >
              <span className="w-11 shrink-0 text-center text-xs font-bold text-primary">
                {t.year}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium transition group-hover:text-primary">
                  {t.title}
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                  {t.university.nameAr} · {t.specialty.nameAr} ·{" "}
                  {t.problems.length} تمرين
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                بانتظار المراجعة
              </span>
              <span className="shrink-0 text-xs text-muted-foreground transition group-hover:-translate-x-0.5 group-hover:text-primary">
                ←
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
