import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { deleteTopicAction, duplicateTopicAction } from "./actions";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;

const statusLabel: Record<string, string> = {
  published: "منشور",
  draft: "مسوحة",
  needs_completion: "يحتاج تكميلًا",
};

type SearchParams = {
  q?: string;
  status?: string;
  university?: string;
  year?: string;
  specialty?: string;
  page?: string;
};

export default async function AdminTopicsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  // قوائم الفلاتر لتسهيل العثور على موضوع معيّن قبل التعديل/الحذف
  const [universities, specialties, yearsRaw] = await Promise.all([
    prisma.university.findMany({ orderBy: { nameAr: "asc" } }),
    prisma.specialty.findMany({ orderBy: { nameAr: "asc" } }),
    prisma.topic.aggregateRaw({
      pipeline: [
        { $group: { _id: "$year" } },
        { $sort: { _id: -1 } },
      ] as Prisma.InputJsonValue[],
    }) as unknown as Promise<Array<{ _id: number }>>,
  ]);
  const years = yearsRaw.map((y) => y._id).filter((y) => y != null);

  const match: Record<string, unknown> = {};
  if (q) match.$text = { $search: q };
  if (sp.status && statusLabel[sp.status]) match.status = sp.status;
  if (sp.year && /^\d{4}$/.test(sp.year)) match.year = parseInt(sp.year, 10);
  if (sp.university) {
    const uni = universities.find((u) => u.id === sp.university);
    if (uni) match.universityId = { $oid: uni.id };
  }
  if (sp.specialty) {
    const spec = specialties.find((s) => s.id === sp.specialty);
    if (spec) match.specialtyId = { $oid: spec.id };
  }

  const pipeline: Prisma.InputJsonValue[] = [
    { $match: match } as Prisma.InputJsonValue,
  ];
  if (q) {
    pipeline.push({ $addFields: { score: { $meta: "textScore" } } });
    pipeline.push({ $sort: { score: -1 } });
  } else {
    pipeline.push({ $sort: { year: -1, createdAt: -1 } });
  }
  pipeline.push({ $skip: (page - 1) * PAGE_SIZE });
  pipeline.push({ $limit: PAGE_SIZE + 1 });
  pipeline.push({ $project: { _id: 1 } });

  const raw = (await prisma.topic.aggregateRaw({
    pipeline,
  })) as unknown as Array<{ _id: { $oid: string } }>;
  const hasMore = raw.length > PAGE_SIZE;
  const ids = raw.slice(0, PAGE_SIZE).map((r) => r._id.$oid);

  const topicsUnordered = ids.length
    ? await prisma.topic.findMany({
        where: { id: { in: ids } },
        include: { university: true, specialty: true },
      })
    : [];
  const topics = ids
    .map((id) => topicsUnordered.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  function pageLink(p: number): string {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (sp.status) params.set("status", sp.status);
    if (sp.university) params.set("university", sp.university);
    if (sp.year) params.set("year", sp.year);
    if (sp.specialty) params.set("specialty", sp.specialty);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/admin/topics?${qs}` : "/admin/topics";
  }

  const hasAnyFilter =
    Boolean(q) ||
    Boolean(sp.status) ||
    Boolean(sp.university) ||
    Boolean(sp.year) ||
    Boolean(sp.specialty);

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">المواضيع</h2>
        <Link
          href="/admin/topics/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          + إضافة موضوع جديد
        </Link>
      </div>
      <form method="get" className="mt-4 flex flex-wrap gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="بحث بالعنوان..."
          dir="auto"
          className="rounded-md border bg-background px-3 py-2 text-sm"
        />
        <select
          name="university"
          defaultValue={sp.university ?? ""}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">كل الجامعات</option>
          {universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nameAr}
            </option>
          ))}
        </select>
        <select
          name="year"
          defaultValue={sp.year ?? ""}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">كل السنوات</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          name="specialty"
          defaultValue={sp.specialty ?? ""}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">كل التخصّصات</option>
          {specialties.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nameAr}
            </option>
          ))}
        </select>
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
        {hasAnyFilter && (
          <Link
            href="/admin/topics"
            className="rounded-md border px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            مسح الفلاتر
          </Link>
        )}
      </form>

      {topics.length === 0 ? (
        <div className="mt-6 rounded-lg border bg-card p-8 text-center text-muted-foreground">
          لا توجد نتائج
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-secondary-foreground">
              <tr>
                <th className="p-2 text-right">العنوان</th>
                <th className="p-2 text-right">الجامعة</th>
                <th className="p-2 text-right">السنة</th>
                <th className="p-2 text-right">الحالة</th>
                <th className="p-2 text-right">الملفات</th>
                <th className="p-2 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {topics.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="p-2">{t.title}</td>
                  <td className="p-2">{t.university.nameAr}</td>
                  <td className="p-2">{t.year}</td>
                  <td className="p-2">{statusLabel[t.status] ?? t.status}</td>
                  <td className="p-2">{t.files.length}/2</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/topics/${t.id}`}
                        className="text-primary hover:underline"
                      >
                        تعديل
                      </Link>
                      <form action={duplicateTopicAction.bind(null, t.id)}>
                        <button
                          type="submit"
                          className="rounded-md border px-2 py-1 text-xs transition hover:border-primary hover:text-primary"
                        >
                          نسخ
                        </button>
                      </form>
                      <ConfirmActionButton
                        action={deleteTopicAction.bind(null, t.id)}
                        confirmText={`حذف "${t.title}"؟ لا يمكن التراجع.`}
                        label="حذف"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center justify-center gap-3">
        {page > 1 && (
          <Link
            href={pageLink(page - 1)}
            className="rounded-md border px-3 py-1.5 text-sm"
          >
            → السابق
          </Link>
        )}
        <span className="text-sm text-muted-foreground">صفحة {page}</span>
        {hasMore && (
          <Link
            href={pageLink(page + 1)}
            className="rounded-md border px-3 py-1.5 text-sm"
          >
            التالي ←
          </Link>
        )}
      </div>
    </div>
  );
}
