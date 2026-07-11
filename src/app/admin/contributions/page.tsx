import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MathContent } from "@/components/math-content";
import { reviewContribution } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ result?: string }>;

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " م.ب";
  return Math.max(1, Math.round(bytes / 1024)) + " ك.ب";
}

export default async function AdminContributionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const [pending, handled, universities, specialties] = await Promise.all([
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
    prisma.university.findMany({
      orderBy: { nameAr: "asc" },
      select: { id: true, nameAr: true },
    }),
    prisma.specialty.findMany({
      orderBy: { nameAr: "asc" },
      select: { id: true, nameAr: true },
    }),
  ]);

  const notice =
    params.result === "published"
      ? "✅ تم إنشاء الموضوع ونشره في الموقع، ومنح المساهم 10 نقاط."
      : params.result === "file-accepted"
        ? "✅ تم قبول الملفات ومنح المستخدم النقاط التي اخترتها."
        : params.result === "removed"
          ? "✅ تم حذف المساهمة من صندوق المراجعة."
          : params.result === "metadata-required"
            ? "⚠️ اختر الجامعة والتخصص قبل نشر مساهمة LaTeX."
            : params.result === "empty"
              ? "⚠️ لا يوجد نص تمرين صالح للنشر."
              : params.result === "invalid"
                ? "⚠️ تعذر تنفيذ العملية. أعد المحاولة."
                : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">
            📬 مساهمات المستخدمين ({pending.length})
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            قبول LaTeX ينشر موضوعًا جديدًا تلقائيًا. قبول الملفات يمنح نقاطًا
            تحددها أنت.
          </p>
        </div>
        <Link
          href="/admin/topics"
          className="text-sm text-primary underline-offset-2 hover:underline"
        >
          إدارة المواضيع ←
        </Link>
      </div>

      {notice && (
        <p className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          {notice}
        </p>
      )}

      {pending.length === 0 ? (
        <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
          📭 لا توجد مساهمات معلّقة.
        </p>
      ) : (
        <div className="space-y-4">
          {pending.map((c) => {
            const isLatex = c.kind === "latex";
            const matchingUniversity = universities.find(
              (u) => u.nameAr === c.universityName,
            );
            const matchingSpecialty = specialties.find(
              (s) => s.nameAr === c.specialtyName,
            );

            return (
              <article
                key={c.id}
                className="rounded-lg border bg-card p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">{c.title}</h3>
                  <span className="rounded-md bg-secondary px-2 py-1 text-xs">
                    {isLatex ? "✍️ كتابة LaTeX" : "📎 ملفات"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  من: {c.user.name} ({c.user.email}) —{" "}
                  {new Date(c.createdAt).toLocaleString("ar-DZ")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[
                    c.universityName,
                    c.specialtyName,
                    c.year ? String(c.year) : null,
                  ]
                    .filter(Boolean)
                    .join(" • ") || "بدون معلومات إضافية"}
                </p>

                {c.message && (
                  <p className="mt-3 rounded-md bg-secondary/40 px-3 py-2 text-sm">
                    💬 {c.message}
                  </p>
                )}

                {c.latexContent && (
                  <details className="mt-3 rounded-md border px-3 py-2">
                    <summary className="cursor-pointer text-sm font-medium">
                      📄 عرض المحتوى الرياضي
                    </summary>
                    <MathContent
                      content={c.latexContent}
                      className="mt-3 text-sm"
                    />
                  </details>
                )}

                {c.files.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm">
                    {c.files.map((file) => (
                      <li key={file.url}>
                        📎{" "}
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          {file.fileName}
                        </a>{" "}
                        <span className="text-xs text-muted-foreground">
                          ({formatSize(file.sizeBytes)})
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

                  {isLatex ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-sm">
                        الجامعة للنشر *
                        <select
                          name="universityId"
                          required
                          defaultValue={matchingUniversity?.id ?? ""}
                          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                        >
                          <option value="" disabled>
                            — اختر الجامعة —
                          </option>
                          {universities.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.nameAr}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm">
                        التخصص للنشر *
                        <select
                          name="specialtyId"
                          required
                          defaultValue={matchingSpecialty?.id ?? ""}
                          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                        >
                          <option value="" disabled>
                            — اختر التخصص —
                          </option>
                          {specialties.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.nameAr}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : (
                    <label className="block max-w-xs text-sm">
                      نقاط مخصصة للمستخدم
                      <input
                        name="customPoints"
                        type="number"
                        min="0"
                        max="10000"
                        defaultValue="10"
                        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      />
                    </label>
                  )}

                  <textarea
                    name="adminNotes"
                    rows={2}
                    placeholder="ملاحظات إدارية (اختياري)"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    {isLatex ? (
                      <button
                        type="submit"
                        name="decision"
                        value="publishLatex"
                        className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:opacity-90"
                      >
                        قبول ونشر الموضوع (+10)
                      </button>
                    ) : (
                      <button
                        type="submit"
                        name="decision"
                        value="acceptFile"
                        className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:opacity-90"
                      >
                        قبول الملفات بالنقاط المحددة
                      </button>
                    )}
                    <button
                      type="submit"
                      name="decision"
                      value="duplicate"
                      formNoValidate
                      className="rounded-md border px-3 py-2 text-xs transition hover:border-primary hover:text-primary"
                    >
                      مكررة وحذف
                    </button>
                    <button
                      type="submit"
                      name="decision"
                      value="reject"
                      formNoValidate
                      className="rounded-md border border-destructive/50 px-3 py-2 text-xs text-destructive transition hover:bg-destructive/10"
                    >
                      رفض وحذف
                    </button>
                  </div>
                </form>
              </article>
            );
          })}
        </div>
      )}

      <section>
        <h2 className="text-xl font-bold">🗂️ آخر المقبولات</h2>
        {handled.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">لا يوجد سجل بعد.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {handled.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-4 py-3 text-sm"
              >
                <span className="font-medium">{c.title}</span>
                <span className="text-xs text-muted-foreground">
                  {c.user.name}{" "}
                  {c.pointsAwarded > 0 ? "• ⭐ +" + c.pointsAwarded : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
