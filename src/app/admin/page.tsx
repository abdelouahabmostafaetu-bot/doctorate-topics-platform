import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { deleteDuplicateTopicAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "مقارنة المواضيع — لوحة الإدارة",
};

type SP = { mode?: string; university?: string };

const statusLabel: Record<string, string> = {
  published: "✅ منشور",
  draft: "📝 مسودة",
  needs_completion: "⛳ ناقص",
};

export default async function DuplicatesPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const strict = sp.mode === "specialty";

  const universities = await prisma.university.findMany({
    orderBy: { name: "asc" },
  });

  const topics = await prisma.topic.findMany({
    where: sp.university ? { universityId: sp.university } : undefined,
    include: { university: true, specialty: true },
    orderBy: [{ year: "desc" }, { createdAt: "asc" }],
  });

  // الخوارزمية: تجميع المواضيع حسب (الجامعة + السنة) أو (+ التخصص)
  const groups = new Map<string, typeof topics>();
  for (const t of topics) {
    const key = strict
      ? [t.universityId, t.year, t.specialtyId].join("|")
      : [t.universityId, t.year].join("|");
    const arr = groups.get(key);
    if (arr) {
      arr.push(t);
    } else {
      groups.set(key, [t]);
    }
  }
  const dupGroups = Array.from(groups.values())
    .filter((g) => g.length > 1)
    .sort((a, b) => b.length - a.length);

  const dateFmt = new Intl.DateTimeFormat("ar-DZ", { dateStyle: "medium" });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">🔍 مقارنة المواضيع — كشف التكرار</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            تُجمّع المواضيع التي تتطابق في الجامعة والسنة
            {strict ? " والتخصص" : ""} — راجعها واحذف المكرر بعد التأكّد.
          </p>
        </div>
        <span className="rounded-md bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          {dupGroups.length} مجموعة مشتبه بها من فحص {topics.length} موضوعًا
        </span>
      </div>

      {/* الفلاتر */}
      <form
        method="get"
        action="/admin/duplicates"
        className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4"
      >
        <label className="text-sm font-medium">
          معيار التطابق
          <select
            name="mode"
            defaultValue={strict ? "specialty" : "univ-year"}
            className="mt-1 block rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="univ-year">نفس الجامعة + نفس السنة</option>
            <option value="specialty">
              نفس الجامعة + السنة + التخصص (أدق)
            </option>
          </select>
        </label>
        <label className="text-sm font-medium">
          الجامعة
          <select
            name="university"
            defaultValue={sp.university ?? ""}
            className="mt-1 block max-w-[280px] rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">كل الجامعات</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nameAr}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          تطبيق
        </button>
      </form>

      {/* النتائج */}
      {dupGroups.length === 0 ? (
        <div className="mt-6 rounded-lg border bg-card p-10 text-center text-muted-foreground">
          🎉 لا توجد مواضيع متطابقة وفق هذا المعيار
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {dupGroups.map((g) => {
            const first = g[0];
            const groupKey = first.universityId + "-" + first.year + "-" + (strict ? first.specialtyId : "all");
            // مواضيع تحمل نفس رقم الموضوع داخل المجموعة → تكرار مرجّح جدًا
            const numCount = new Map<number, number>();
            for (const t of g) {
              if (t.examNumber != null) {
                numCount.set(t.examNumber, (numCount.get(t.examNumber) ?? 0) + 1);
              }
            }
            return (
              <section
                key={groupKey}
                className="overflow-hidden rounded-lg border bg-card shadow-sm"
              >
                <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-3">
                  <h3 className="text-sm font-bold">
                    🏛️ {first.university.nameAr} — {first.year}
                    {strict ? " — " + first.specialty.nameAr : ""}
                  </h3>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {g.length} مواضيع متطابقة
                  </span>
                </header>
                <div>
                  {g.map((t) => {
                    const likelyDup =
                      t.examNumber != null &&
                      (numCount.get(t.examNumber) ?? 0) > 1;
                    return (
                      <div
                        key={t.id}
                        className="flex flex-wrap items-center gap-3 border-b px-4 py-3 last:border-0"
                      >
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/topics/${t.slug}`}
                            target="_blank"
                            className="font-medium hover:text-primary hover:underline"
                          >
                            {t.title}
                          </Link>
                          <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                            <span className="rounded bg-muted px-1.5 py-0.5">
                              {t.examType === "specialty"
                                ? "تخصص"
                                : "عامة"}
                            </span>
                            {t.examNumber != null && (
                              <span className="rounded bg-muted px-1.5 py-0.5">
                                رقم {t.examNumber}
                              </span>
                            )}
                            <span className="rounded bg-muted px-1.5 py-0.5">
                              {t.specialty.nameAr}
                            </span>
                            <span className="rounded bg-muted px-1.5 py-0.5">
                              {t.problems.length} تمرين
                            </span>
                            <span className="rounded bg-muted px-1.5 py-0.5">
                              {statusLabel[t.status] ?? t.status}
                            </span>
                            <span className="rounded bg-muted px-1.5 py-0.5">
                              أُضيف {dateFmt.format(t.createdAt)}
                            </span>
                            {likelyDup && (
                              <span className="rounded bg-red-100 px-1.5 py-0.5 font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                                ⚠️ نفس رقم الموضوع — تكرار مرجّح
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Link
                            href={`/admin/topics/${t.id}`}
                            className="rounded-md border px-3 py-1.5 text-xs transition hover:border-primary hover:text-primary"
                          >
                            تعديل
                          </Link>
                          <ConfirmActionButton
                            action={deleteDuplicateTopicAction.bind(null, t.id)}
                            confirmText={`هل أنت متأكد من حذف “${t.title}” نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.`}
                            label="🗑️ حذف"
                            pendingLabel="جارٍ الحذف..."
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
