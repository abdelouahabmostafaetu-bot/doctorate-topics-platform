import { prisma } from "@/lib/prisma";
import { reviewContribution } from "./actions";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  pending: "قيد المراجعة",
  accepted: "مقبولة",
  duplicate: "مكررة",
  rejected: "مرفوضة",
};

const statusClass: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  accepted:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  duplicate: "bg-secondary text-secondary-foreground",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

const kindLabel: Record<string, string> = {
  latex: "✍️ LaTeX",
  files: "📎 ملفات",
};

export default async function AdminContributionsPage() {
  const [pending, handled] = await Promise.all([
    prisma.contribution.findMany({
      where: { status: "pending" },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.contribution.findMany({
      where: { status: { not: "pending" } },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <h1 className="text-2xl font-bold">🌱 مراجعة المساهمات</h1>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          قيد المراجعة ({pending.length})
        </h2>
        {pending.length === 0 && (
          <p className="text-sm text-muted-foreground">
            لا توجد مساهمات بانتظار المراجعة. 🎉
          </p>
        )}
        {pending.map((c) => (
          <article
            key={c.id}
            className="space-y-3 rounded-lg border bg-card p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{c.title}</h3>
              <span
                className={
                  "rounded-full px-3 py-1 text-xs " + (statusClass[c.status] ?? "")
                }
              >
                {statusLabel[c.status] ?? c.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {kindLabel[c.kind] ?? c.kind} — {c.user.name} ({c.user.email}) —{" "}
              {c.createdAt.toLocaleDateString("ar-DZ")}
              {c.universityName ? " — " + c.universityName : ""}
              {c.year ? " — " + c.year : ""}
              {c.specialtyName ? " — " + c.specialtyName : ""}
              {c.examType
                ? " — " + (c.examType === "general" ? "مسابقة عامة" : "مسابقة تخصص")
                : ""}
            </p>
            {c.message && (
              <p className="rounded-md bg-muted px-3 py-2 text-sm">{c.message}</p>
            )}
            {c.latexContent && (
              <pre
                dir="ltr"
                className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-left text-xs leading-6"
              >
                {c.latexContent}
              </pre>
            )}
            {c.files.length > 0 && (
              <ul className="space-y-1 text-sm">
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
                      ({Math.round(f.sizeBytes / 1024)} ك.ب)
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <form action={reviewContribution} className="space-y-2 border-t pt-3">
              <input type="hidden" name="id" value={c.id} />
              <textarea
                name="adminNotes"
                rows={2}
                placeholder="ملاحظات إدارية (اختياري)"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-2 text-sm">
                <button
                  name="decision"
                  value="accept10"
                  className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground transition hover:opacity-90"
                >
                  قبول — موضوع جديد مع الحل (+10)
                </button>
                <button
                  name="decision"
                  value="accept5"
                  className="rounded-md bg-primary/80 px-3 py-1.5 font-medium text-primary-foreground transition hover:opacity-90"
                >
                  قبول — بدون حل أو حل فقط (+5)
                </button>
                <button
                  name="decision"
                  value="duplicate"
                  className="rounded-md border px-3 py-1.5 transition hover:border-primary hover:text-primary"
                >
                  مكررة (0)
                </button>
                <button
                  name="decision"
                  value="reject"
                  className="rounded-md border border-destructive/50 px-3 py-1.5 text-destructive transition hover:bg-destructive/10"
                >
                  رفض
                </button>
              </div>
            </form>
          </article>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">آخر المساهمات المراجعة</h2>
        {handled.length === 0 && (
          <p className="text-sm text-muted-foreground">لا شيء بعد.</p>
        )}
        <div className="space-y-2">
          {handled.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card px-4 py-2 text-sm"
            >
              <span>
                {c.title} —{" "}
                <span className="text-muted-foreground">{c.user.name}</span>
                {c.pointsAwarded > 0 ? " (+" + c.pointsAwarded + ")" : ""}
              </span>
              <span
                className={
                  "rounded-full px-3 py-1 text-xs " + (statusClass[c.status] ?? "")
                }
              >
                {statusLabel[c.status] ?? c.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
