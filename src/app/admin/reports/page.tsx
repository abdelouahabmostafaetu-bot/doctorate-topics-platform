import { prisma } from "@/lib/prisma";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { AutoSaveFormWrapper } from "@/components/admin/auto-save-form-wrapper";
import { setReportStatusAction, saveReportNotesAction } from "./actions";

export const dynamic = "force-dynamic";

const typeLabel: Record<string, string> = {
  wrong_content: "محتوى خاطئ",
  broken_file: "ملف معطل",
  wrong_classification: "تصنيف خاطئ",
  other: "أخرى",
};
const statusLabel: Record<string, string> = {
  open: "مفتوح",
  resolved: "تم الحل",
  rejected: "مرفوض",
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status && statusLabel[sp.status] ? sp.status : undefined;

  const reports = await prisma.report.findMany({
    where: status ? { status: status as "open" | "resolved" | "rejected" } : {},
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const topicIds = [...new Set(reports.map((r) => r.topicId))];
  const topics = topicIds.length
    ? await prisma.topic.findMany({
        where: { id: { in: topicIds } },
        select: { id: true, title: true, slug: true },
      })
    : [];
  const topicMap = new Map(topics.map((t) => [t.id, t]));

  return (
    <div>
      <h2 className="text-lg font-semibold">البلاغات ({reports.length})</h2>
      <form method="get" className="mt-4 flex gap-2">
        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">كل الحالات</option>
          {Object.entries(statusLabel).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          تصفية
        </button>
      </form>

      {reports.length === 0 ? (
        <div className="mt-6 rounded-lg border bg-card p-8 text-center text-muted-foreground">
          لا توجد بلاغات
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {reports.map((r) => {
            const topic = topicMap.get(r.topicId);
            return (
              <div key={r.id} className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-secondary-foreground">
                    {typeLabel[r.type] ?? r.type}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString("ar-DZ")}
                  </span>
                </div>
                <p className="mt-2 text-sm" dir="auto">
                  {r.message}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {topic ? (
                    <a
                      href={`/topics/${topic.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      {topic.title}
                    </a>
                  ) : (
                    "موضوع محذوف"
                  )}
                  {r.problemNumber != null && ` · تمرين ${r.problemNumber}`}
                  {" · بواسطة "}
                  {r.user.name ?? r.user.email}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-md border px-2 py-0.5 text-xs">
                    {statusLabel[r.status]}
                  </span>
                  {r.status !== "resolved" && (
                    <ConfirmActionButton
                      action={setReportStatusAction.bind(
                        null,
                        r.id,
                        "resolved",
                      )}
                      confirmText="تأكيد أن البلاغ تمت معالجته؟"
                      label="تم الحل"
                    />
                  )}
                  {r.status !== "rejected" && (
                    <ConfirmActionButton
                      action={setReportStatusAction.bind(
                        null,
                        r.id,
                        "rejected",
                      )}
                      confirmText="رفض هذا البلاغ؟"
                      label="رفض"
                    />
                  )}
                </div>
                <div className="mt-3 border-t pt-3">
                  <AutoSaveFormWrapper
                    formId={`admin-report-notes-${r.id}`}
                    isLoggedIn
                    action={saveReportNotesAction}
                  >
                    <input type="hidden" name="id" value={r.id} />
                    <label className="block text-xs text-muted-foreground">
                      ملاحظات داخلية (لا تُعرض للمستخدم)
                      <textarea
                        name="adminNotes"
                        defaultValue={r.adminNotes ?? ""}
                        rows={2}
                        dir="auto"
                        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      />
                    </label>
                    <button
                      type="submit"
                      className="mt-2 rounded-md border px-3 py-1 text-xs transition hover:border-primary hover:text-primary"
                    >
                      حفظ الملاحظة
                    </button>
                  </AutoSaveFormWrapper>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
