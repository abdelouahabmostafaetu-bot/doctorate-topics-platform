import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ContributionReviewForm } from "@/components/admin/contribution-review-form";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  pending: "قيد المراجعة",
  accepted: "مقبولة",
  rejected: "مرفوضة",
  duplicate: "مكررة",
};

type UploadedFile = { url: string; fileName?: string };

/** يرجع قائمة ملفات المساهمة (يدعم الملفات المتعددة والقديمة المفردة) */
function contributionFiles(c: {
  filesJson?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
}): UploadedFile[] {
  if (c.filesJson) {
    try {
      const parsed = JSON.parse(c.filesJson);
      if (Array.isArray(parsed)) {
        const files = (parsed as UploadedFile[]).filter(
          (f) => f && typeof f.url === "string" && f.url.length > 0,
        );
        if (files.length > 0) return files;
      }
    } catch {
      // JSON غير صالح — نسقط إلى الملف المفرد
    }
  }
  return c.fileUrl
    ? [{ url: c.fileUrl, fileName: c.fileName ?? undefined }]
    : [];
}

export default async function AdminContributionsPage() {
  // ملاحظة: لا نستخدم include للمستخدم — إذا حُذف حساب المساهم تنهار الصفحة
  // (العلاقة إلزامية في Prisma). نجلب المستخدمين على حدة مع بديل آمن.
  const [pendingRaw, historyRaw] = await Promise.all([
    prisma.contribution.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contribution.findMany({
      where: { status: { not: "pending" } },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
  ]);

  const userIds = [
    ...new Set([...pendingRaw, ...historyRaw].map((c) => c.userId)),
  ];
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));
  const fallbackUser = { name: "مستخدم محذوف", email: "" };
  const pending = pendingRaw.map((c) => ({
    ...c,
    user: userMap.get(c.userId) ?? fallbackUser,
  }));
  const history = historyRaw.map((c) => ({
    ...c,
    user: userMap.get(c.userId) ?? fallbackUser,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">المساهمات 🌱</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          مواضيع LaTeX تُنشر تلقائيًا فور الإرسال (+100 نقطة للمساهم) — صادق على النشر أو ألغِه. الملفات تُراجع يدويًا.
        </p>
      </div>

      <section>
        <h3 className="font-medium">
          الوارد ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <div className="mt-3 rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
            لا توجد مساهمات قيد المراجعة
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            {pending.map((c) => (
              <article
                key={c.id}
                className="rounded-lg border bg-card p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">
                      {c.title || "بدون عنوان"}{" "}
                      <span className="text-xs text-muted-foreground">
                        ({c.type === "latex" ? "LaTeX" : "ملف"})
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {c.user.name} · {c.universityName || "—"} · {" "}
                      {c.specialtyName || "—"} · {c.year ?? "—"} ·{" "}
                      {c.examType === "specialty" ? "تخصص" : "عامة"}
                    </p>
                    {c.createdTopicId && (
                      <p className="mt-1 text-xs font-medium text-emerald-600">
                        ✅ نُشر تلقائيًا من طرف {c.user.name} (+
                        {c.pointsAwarded ?? 0} نقطة) —{" "}
                        <Link
                          href={`/admin/topics/${c.createdTopicId}`}
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          فتح الموضوع للمراجعة
                        </Link>
                      </p>
                    )}
                  </div>
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-xs">
                    {new Date(c.createdAt).toLocaleDateString("ar-DZ")}
                  </span>
                </div>

                {c.type === "file" && contributionFiles(c).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {contributionFiles(c).map((f, fi) => (
                      <a
                        key={fi}
                        href={f.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-primary hover:underline"
                        dir="ltr"
                      >
                        📎 {f.fileName || `ملف ${fi + 1}`}
                      </a>
                    ))}
                  </div>
                )}

                {c.type === "latex" && c.problemsJson && (
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer text-primary">
                      معاينة التمارين
                    </summary>
                    <pre
                      className="mt-2 max-h-48 overflow-auto rounded bg-secondary/40 p-2 text-xs"
                      dir="ltr"
                    >
                      {c.problemsJson.slice(0, 2000)}
                    </pre>
                  </details>
                )}

                <ContributionReviewForm
                  id={c.id}
                  type={c.type}
                  published={!!c.createdTopicId}
                />
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="font-medium">السجل الأخير</h3>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">لا يوجد سجل بعد</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-secondary-foreground">
                <tr>
                  <th className="p-2 text-right">العنوان</th>
                  <th className="p-2 text-right">المستخدم</th>
                  <th className="p-2 text-right">الحالة</th>
                  <th className="p-2 text-right">النقاط</th>
                  <th className="p-2 text-right">الموضوع</th>
                </tr>
              </thead>
              <tbody>
                {history.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-2">{c.title || "—"}</td>
                    <td className="p-2">{c.user.name}</td>
                    <td className="p-2">{statusLabel[c.status] ?? c.status}</td>
                    <td className="p-2">{c.pointsAwarded ?? 0}</td>
                    <td className="p-2">
                      {c.createdTopicId ? (
                        <Link
                          href={`/admin/topics/${c.createdTopicId}`}
                          className="text-primary hover:underline"
                        >
                          فتح
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
