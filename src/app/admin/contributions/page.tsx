import { prisma } from "@/lib/prisma";
import { MathContent } from "@/components/math-content";
import { reviewContribution } from "./actions";

export const dynamic = "force-dynamic";

const kindLabel: Record<string, string> = {
  latex: "✍️ كتابة LaTeX",
  files: "📎 ملفات",
};

const statusLabel: Record<string, string> = {
  accepted: "مقبولة ✅",
  duplicate: "مكررة",
  rejected: "مرفوضة ✖",
};

const statusClass: Record<string, string> = {
  accepted: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  duplicate: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  rejected: "bg-destructive/10 text-destructive",
};

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " م.ب";
  return Math.max(1, Math.round(bytes / 1024)) + " ك.ب";
}

export default async function AdminContributionsPage() {
  const [pending, handled] = await Promise.all([
    prisma.contribution.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.contribution.findMany({
      where: { status: { not: "pending" } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-bold">
          📬 المساهمات المعلّقة ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="mt-4 rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
            📭 لا توجد مساهمات معلّقة — كل شيء تمت مراجعته!
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {pending.map((c) => (
              <div key={c.id} className="rounded-lg border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">{c.title}</h3>
                  <span className="rounded-md bg-secondary px-2 py-1 text-xs">
                    {kindLabel[c.kind] ?? c.kind}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  من: {c.user?.name ?? "مستخدم"} ({c.user?.email ?? "—"}) —{" "}
                  {new Date(c.createdAt).toLocaleString("ar-DZ")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[
                    c.universityName,
                    c.specialtyName,
                    c.year ? String(c.year) : null,
                    c.examType === "general"
                      ? "مسابقة عامة"
                      : c.examType === "specialty"
                        ? "مسابقة تخصص"
                        : null,
                  ]
                    .filter(Boolean)
                    .join(" • ") || "بدون معلومات إضافية"}
                </p>
                {c.message && (
                  <p className="mt-2 rounded-md bg-secondary/40 px-3 py-2 text-sm">
                    💬 {c.message}
                  </p>
                )}
                {c.latexContent && (
                  <details className="mt-3 rounded-md border px-3 py-2">
                    <summary className="cursor-pointer text-sm font-medium">
                      📄 عرض المحتوى
                    </summary>
                    <div className="mt-2">
                      <MathContent content={c.latexContent} className="text-sm" />
                    </div>
                  </details>
                )}
                {c.files.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm">
                    {c.files.map((f) => (
                      <li key={f.url}>
                        📎{" "}
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          {f.fileName}
                        </a>{" "}
                        <span className="text-xs text-muted-foreground">
                          ({formatSize(f.sizeBytes)})
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <form
                  action={reviewContribution}
                  className="mt-4 space-y-3 border-t pt-4"
                >
                  <input type="hidden" name="id" value={c.id} />
                  <textarea
                    name="adminNotes"
                    rows={2}
                    placeholder="ملاحظات إدارية (اختياري)"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      name="decision"
                      value="accept10"
                      className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:opacity-90"
                    >
                      قبول — موضوع جديد مع الحل (+10)
                    </button>
                    <button
                      type="submit"
                      name="decision"
                      value="accept5"
                      className="rounded-md bg-primary/80 px-3 py-2 text-xs font-medium text-primary-foreground transition hover:opacity-90"
                    >
                      قبول — بدون حل أو حل فقط (+5)
                    </button>
                    <button
                      type="submit"
                      name="decision"
                      value="duplicate"
                      className="rounded-md border px-3 py-2 text-xs transition hover:border-primary hover:text-primary"
                    >
                      مكررة (0)
                    </button>
                    <button
                      type="submit"
                      name="decision"
                      value="reject"
                      className="rounded-md border border-destructive/50 px-3 py-2 text-xs text-destructive transition hover:bg-destructive/10"
                    >
                      رفض
                    </button>
                  </div>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold">🗂️ آخر المراجعات</h2>
        {handled.length === 0 ? (
          <p className="mt-4 rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
            لا يوجد سجل بعد.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {handled.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-4 py-3 text-sm"
              >
                <span className="font-medium">{c.title}</span>
                <span className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">
                    {c.user?.name ?? "مستخدم"}
                  </span>
                  {c.pointsAwarded > 0 && <span>⭐ +{c.pointsAwarded}</span>}
                  <span
                    className={
                      "rounded-md px-2 py-1 " +
                      (statusClass[c.status] ?? "bg-secondary")
                    }
                  >
                    {statusLabel[c.status] ?? c.status}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
