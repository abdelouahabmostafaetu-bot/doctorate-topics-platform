import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MathContent } from "@/components/math-content";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import {
  approveLatexAction,
  rejectLatexAction,
  requeueLatexAction,
} from "../actions";
import { readPolished } from "../polished";

export const dynamic = "force-dynamic";

const fieldLabel: Record<string, string> = {
  statement: "نص التمرين",
  solution: "الحل",
  remark: "الملاحظة",
};

export default async function LatexReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const topic = await prisma.topic.findUnique({
    where: { id },
    include: { university: true },
  });
  if (!topic) notFound();
  const polished = readPolished(topic.polished);

  return (
    <div>
      {/* رأس + أزرار القرار */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold">✨ {topic.title}</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {topic.university.nameAr} · {topic.year} · {topic.problems.length}{" "}
            تمرين — قارن ثم قرّر
          </p>
        </div>
        <Link
          href={`/topics/${topic.slug}`}
          target="_blank"
          className="rounded-full border px-2.5 py-0.5 text-[10px] transition hover:border-primary hover:text-primary"
        >
          فتح الموضوع ↗
        </Link>
        <Link
          href="/admin/latex-review"
          className="rounded-full border px-2.5 py-0.5 text-[10px] text-muted-foreground transition hover:border-primary hover:text-primary"
        >
          ← رجوع
        </Link>
      </div>

      {polished.length === 0 ? (
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            لا توجد نسخة محسّنة محفوظة لهذا الموضوع
          </p>
          <div className="mt-3 inline-block">
            <ConfirmActionButton
              action={requeueLatexAction.bind(null, topic.id)}
              confirmText="إعادة هذا الموضوع لطابور المعالجة؟"
              label="⤴️ إعادة للطابور"
              pendingLabel="جارٍ..."
              redirectTo="/admin/latex-review"
              className="rounded-full border px-3 py-1 text-[11px] transition hover:border-primary hover:text-primary"
            />
          </div>
        </div>
      ) : (
        <>
          {/* أزرار القرار */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ConfirmActionButton
              action={approveLatexAction.bind(null, topic.id)}
              confirmText="تطبيق النسخة المحسّنة على الموضوع المنشور؟"
              label="✅ قبول وتطبيق"
              pendingLabel="جارٍ التطبيق..."
              redirectTo="/admin/latex-review"
              className="rounded-full bg-primary px-4 py-1 text-[11px] font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            />
            <ConfirmActionButton
              action={rejectLatexAction.bind(null, topic.id)}
              confirmText="رفض النسخة المحسّنة؟ يبقى النص الأصلي كما هو."
              label="❌ رفض"
              pendingLabel="جارٍ..."
              redirectTo="/admin/latex-review"
              className="rounded-full border px-3 py-1 text-[11px] transition hover:border-destructive hover:text-destructive disabled:opacity-50"
            />
            <span className="text-[10px] text-muted-foreground">
              القبول يستبدل النصوص مباشرة في الموضوع المنشور
            </span>
          </div>

          {/* مقارنة قبل/بعد لكل تمرين */}
          <div className="mt-4 space-y-6">
            {topic.problems.map((p) => {
              const pol = polished.find(
                (x) => x.problemNumber === p.problemNumber,
              );
              const fields = ["statement", "solution", "remark"] as const;
              return (
                <section key={p.problemNumber}>
                  <div className="flex items-center gap-3">
                    <h3 className="shrink-0 text-xs font-bold">
                      التمرين {p.problemNumber}
                    </h3>
                    <span className="h-px flex-1 bg-gradient-to-l from-border to-transparent" />
                  </div>
                  {fields.map((f) => {
                    const before = p[f];
                    const after = pol?.[f];
                    if (!before || !String(before).trim()) return null;
                    const changed = Boolean(after && after !== before);
                    return (
                      <div key={f} className="mt-3">
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="font-medium">{fieldLabel[f]}</span>
                          {changed ? (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                              تغيّر
                            </span>
                          ) : (
                            <span>بدون تغيير</span>
                          )}
                        </div>
                        {changed ? (
                          <div className="mt-1 grid gap-4 lg:grid-cols-2">
                            <div className="min-w-0">
                              <p className="mb-1 text-[10px] font-medium text-muted-foreground">
                                قبل
                              </p>
                              <div className="border-s-2 border-border ps-3">
                                <MathContent content={String(before)} />
                              </div>
                            </div>
                            <div className="min-w-0">
                              <p className="mb-1 text-[10px] font-medium text-primary">
                                بعد ✨
                              </p>
                              <div className="border-s-2 border-primary/40 ps-3">
                                <MathContent content={String(after)} />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-1 border-s-2 border-border ps-3 opacity-70">
                            <MathContent content={String(before)} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
