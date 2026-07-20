import { prisma } from "@/lib/prisma";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import {
  approveSuccessStorySubmissionAction,
  rejectSuccessStorySubmissionAction,
} from "./actions";

export const dynamic = "force-dynamic";
export default async function SuccessStorySubmissionsPage() {
  const submissions = await prisma.successStorySubmission.findMany({
    orderBy: { createdAt: "desc" },
  });
  return (
    <div dir="rtl">
      <header>
        <h2 className="text-sm font-bold">📨 طلبات تجارب النجاح</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          هذه الطلبات أرسلها الزوار؛ لا يظهر أي طلب للعامة قبل قبوله هنا.
        </p>
      </header>
      <div className="mt-5 space-y-3">
        {submissions.map((item) => (
          <article key={item.id} className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold">{item.title}</h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {item.name}
                  {item.email ? ` · ${item.email}` : ""}
                  {item.university ? ` · ${item.university}` : ""}
                </p>
              </div>
              <span
                className={
                  item.status === "pending"
                    ? "rounded-full bg-amber-100 px-2 py-1 text-[10px] text-amber-800"
                    : item.status === "approved"
                      ? "rounded-full bg-emerald-100 px-2 py-1 text-[10px] text-emerald-800"
                      : "rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-700"
                }
              >
                {item.status === "pending"
                  ? "قيد المراجعة"
                  : item.status === "approved"
                    ? "تم النشر"
                    : "مرفوض"}
              </span>
            </div>
            <p className="mt-3 text-xs leading-6 text-muted-foreground">
              {item.excerpt}
            </p>
            <details className="mt-3 rounded-lg bg-muted/40 p-3 text-xs leading-7">
              <summary className="cursor-pointer font-semibold">
                قراءة القصة الكاملة والنصيحة
              </summary>
              <p className="mt-3 whitespace-pre-line">{item.story}</p>
              <p className="mt-3 border-r-2 border-amber-400 pr-3">
                <b>النصيحة:</b> {item.advice}
              </p>
            </details>
            {item.status === "pending" && (
              <div className="mt-4 flex gap-2">
                <ConfirmActionButton
                  action={approveSuccessStorySubmissionAction.bind(
                    null,
                    item.id,
                  )}
                  confirmText={`قبول ونشر تجربة «${item.title}»؟`}
                  label="✅ قبول ونشر"
                />
                <ConfirmActionButton
                  action={rejectSuccessStorySubmissionAction.bind(
                    null,
                    item.id,
                  )}
                  confirmText={`رفض تجربة «${item.title}»؟`}
                  label="رفض"
                />
              </div>
            )}
          </article>
        ))}
        {submissions.length === 0 && (
          <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
            لا توجد طلبات جديدة حاليًا.
          </p>
        )}
      </div>
    </div>
  );
}
