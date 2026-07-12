import Link from "next/link";
import type { Prisma, TopicStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { deleteTopicAction } from "./actions";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;

const statusLabel: Record<string, string> = {
  published: "✅ منشور",
  draft: "📝 مسودة",
  needs_completion: "⛳ يحتاج تكميلًا",
};

type SearchParams = {
  university?: string;
  specialty?: string;
  year?: string;
  status?: string;
  page?: string;
};

const selectClass =
  "rounded-md border bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none";

export default async function AdminTopicsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const [universities, specialties, yearsRaw] = await Promise.all([
    prisma.university.findMany({ orderBy: { nameAr: "asc" } }),
    prisma.specialty.findMany({ orderBy: { nameAr: "asc" } }),
    prisma.topic.aggregateRaw({
      pipeline: [{ $group: { _id: "$year" } }, { $sort: { _id: -1 } }],
    }) as unknown as Promise<Array<{ _id: number }>>,
  ]);
  const years = yearsRaw.map((y) => y._id).filter((y) => y != null);

  // تصفية بالجامعة + التخصص + السنة + الحالة (بدون بحث بالعنوان)
  const where: Prisma.TopicWhereInput = {};
  if (sp.university) where.universityId = sp.university;
  if (sp.specialty) where.specialtyId = sp.specialty;
  if (sp.year && /^\d{4}$/.test(sp.year)) where.year = parseInt(sp.year, 10);
  if (sp.status && statusLabel[sp.status]) where.status = sp.status as TopicStatus;

  const rows = await prisma.topic.findMany({
    where,
    include: { university: true, specialty: true },
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
  });
  const hasMore = rows.length > PAGE_SIZE;
  const topics = rows.slice(0, PAGE_SIZE);

  function pageLink(p: number): string {
    const params = new URLSearchParams();
    if (sp.university) params.set("university", sp.university);
    if (sp.specialty) params.set("specialty", sp.specialty);
    if (sp.year) params.set("year", sp.year);
    if (sp.status) params.set("status", sp.status);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/admin/topics?${qs}` : "/admin/topics";
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold">📄 المواضيع</h2>
        <Link
          href="/admin/topics/new"
          className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition hover:opacity-90"
        >
          ➕ موضوع جديد
        </Link>
      </div>

      {/* فلاتر صغيرة: جامعة + تخصص + سنة + حالة */}
      <form method="get" className="mt-3 flex flex-wrap items-center gap-2">
        <select
          name="university"
          defaultValue={sp.university ?? ""}
          className={selectClass}
        >
          <option value="">🏛️ كل الجامعات</option>
          {universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nameAr || u.name}
            </option>
          ))}
        </select>
        <select
          name="specialty"
          defaultValue={sp.specialty ?? ""}
          className={selectClass}
        >
          <option value="">🧭 كل التخصصات</option>
          {specialties.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nameAr || s.name}
            </option>
          ))}
        </select>
        <select name="year" defaultValue={sp.year ?? ""} className={selectClass}>
          <option value="">📅 كل السنوات</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className={selectClass}
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
          className="rounded-full border px-3 py-1 text-[11px] text-muted-foreground transition hover:border-primary hover:text-primary"
        >
          تصفية
        </button>
        <Link
          href="/admin/topics"
          className="text-[11px] text-muted-foreground transition hover:text-destructive"
        >
          ✕ مسح
        </Link>
      </form>

      {topics.length === 0 ? (
        <p className="mt-8 py-8 text-center text-xs text-muted-foreground">
          لا توجد نتائج مطابقة
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-secondary text-secondary-foreground">
              <tr>
                <th className="p-1.5 text-right text-[11px]">العنوان</th>
                <th className="p-1.5 text-right text-[11px]">الجامعة</th>
                <th className="p-1.5 text-right text-[11px]">التخصص</th>
                <th className="p-1.5 text-right text-[11px]">السنة</th>
                <th className="p-1.5 text-right text-[11px]">الحالة</th>
                <th className="p-1.5 text-right text-[11px]">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {topics.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="p-1.5">
                    <span className="block max-w-[260px] truncate" title={t.title}>
                      {t.title}
                    </span>
                  </td>
                  <td className="p-1.5 whitespace-nowrap">
                    {t.university.nameAr}
                  </td>
                  <td className="p-1.5 whitespace-nowrap">
                    {t.specialty.nameAr}
                  </td>
                  <td className="p-1.5">{t.year}</td>
                  <td className="p-1.5 whitespace-nowrap">
                    {statusLabel[t.status] ?? t.status}
                  </td>
                  <td className="p-1.5">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/topics/${t.id}`}
                        className="text-primary hover:underline"
                      >
                        تعديل
                      </Link>
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

      <div className="mt-3 flex items-center justify-center gap-3 text-xs">
        {page > 1 && (
          <Link
            href={pageLink(page - 1)}
            className="rounded-full border px-3 py-1 transition hover:border-primary hover:text-primary"
          >
            → السابق
          </Link>
        )}
        <span className="text-muted-foreground">صفحة {page}</span>
        {hasMore && (
          <Link
            href={pageLink(page + 1)}
            className="rounded-full border px-3 py-1 transition hover:border-primary hover:text-primary"
          >
            التالي ←
          </Link>
        )}
      </div>
    </div>
  );
}
