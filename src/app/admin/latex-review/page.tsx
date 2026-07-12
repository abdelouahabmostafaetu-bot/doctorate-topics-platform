import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "مراجعة LaTeX — لوحة الإدارة",
};

export default async function LatexReviewListPage() {
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
          يتطلب <code className="rounded bg-muted px-1 py-0.5" dir="ltr">GEMINI_API_KEY</code>{" "}
          في ملف .env — مفتاح مجاني من aistudio.google.com
        </p>
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
