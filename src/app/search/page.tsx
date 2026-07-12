import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { FilterBar } from "@/components/search/filter-bar";

// صفحة المواضيع تُصيّر عند كل طلب (النتائج تتغير حسب الفلاتر)
export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

const examTypeLabel: Record<string, string> = {
  general: "مسابقة عامة",
  specialty: "مسابقة تخصص",
};

type SearchParams = {
  q?: string;
  university?: string;
  specialty?: string;
  year?: string;
  page?: string;
};

export const metadata = {
  title: "المواضيع — منصة مواضيع دكتوراه الرياضيات",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  // قوائم الفلاتر: الجامعات + التخصصات + السنوات المتوفرة فعليًا
  const [universities, specialties, yearsRaw] = await Promise.all([
    prisma.university.findMany({ orderBy: { name: "asc" } }),
    prisma.specialty.findMany({ orderBy: { name: "asc" } }),
    prisma.topic.aggregateRaw({
      pipeline: [
        { $match: { status: "published" } },
        { $group: { _id: "$year" } },
        { $sort: { _id: -1 } },
      ],
    }) as unknown as Promise<Array<{ _id: number }>>,
  ]);
  const years = yearsRaw.map((y) => y._id).filter((y) => y != null);

  // شرط المطابقة: كلمة البحث + السنة + الجامعة + التخصص
  const match: Record<string, Prisma.InputJsonValue> = { status: "published" };
  if (q) match.$text = { $search: q };
  if (sp.year && /^\d{4}$/.test(sp.year)) match.year = parseInt(sp.year, 10);
  if (sp.university) {
    const uni = universities.find((u) => u.slug === sp.university);
    if (uni) match.universityId = { $oid: uni.id };
  }
  if (sp.specialty) {
    const spec = specialties.find((s) => s.slug === sp.specialty);
    if (spec) match.specialtyId = { $oid: spec.id };
  }

  const pipeline: Prisma.InputJsonValue[] = [{ $match: match }];
  if (q) {
    pipeline.push({ $addFields: { score: { $meta: "textScore" } } });
    pipeline.push({ $sort: { score: -1 } });
  } else {
    pipeline.push({ $sort: { year: -1, examNumber: 1 } });
  }
  pipeline.push({ $skip: (page - 1) * PAGE_SIZE });
  pipeline.push({ $limit: PAGE_SIZE + 1 });
  pipeline.push({ $project: { _id: 1 } });

  const raw = (await prisma.topic.aggregateRaw({
    pipeline,
  })) as unknown as Array<{ _id: { $oid: string } }>;
  const hasMore = raw.length > PAGE_SIZE;
  const ids = raw.slice(0, PAGE_SIZE).map((r) => r._id.$oid);

  // جلب المواضيع الكاملة ثم إعادة ترتيبها حسب ترتيب النتائج
  const topicsUnordered = ids.length
    ? await prisma.topic.findMany({
        where: { id: { in: ids } },
        include: { university: true, specialty: true },
      })
    : [];
  const topics = ids
    .map((id) => topicsUnordered.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  // روابط التنقل بين الصفحات مع الحفاظ على الفلاتر
  function pageLink(p: number): string {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (sp.university) params.set("university", sp.university);
    if (sp.specialty) params.set("specialty", sp.specialty);
    if (sp.year) params.set("year", sp.year);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/search?${qs}` : "/search";
  }

  const hasAnyFilter = Boolean(q || sp.university || sp.specialty || sp.year);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* إشعار صغير: كيف تبحث بطريقة أفضل — يقود لصفحة حول الموقع */}
      <Link
        href="/about#search"
        className="block text-[11px] text-muted-foreground underline-offset-2 transition hover:text-primary hover:underline"
      >
        💡 لنتائج أدق: تعرّف على طريقة البحث الأفضل في صفحة «حول الموقع» ←
      </Link>

      {/* رأس صغير */}
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-base font-bold">📄 المواضيع</h1>
        <p className="text-[11px] text-muted-foreground">
          اختر فقط — النتائج تُحدّث فورًا
        </p>
      </div>

      {/* بحث صغير + فلاتر مدمجة في سطر واحد لا يأخذ مساحة */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <form method="get" action="/search" className="flex items-center gap-1.5">
          <input
            type="text"
            name="q"
            defaultValue={q}
            dir="auto"
            placeholder="🔍 بحث بكلمة..."
            className="w-36 border-0 border-b border-border bg-transparent px-1 py-1 text-xs transition focus:border-primary focus:outline-none sm:w-48 sm:text-sm"
          />
          {sp.university && (
            <input type="hidden" name="university" value={sp.university} />
          )}
          {sp.specialty && (
            <input type="hidden" name="specialty" value={sp.specialty} />
          )}
          {sp.year && <input type="hidden" name="year" value={sp.year} />}
          <button
            type="submit"
            className="shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] text-muted-foreground transition hover:border-primary hover:text-primary"
          >
            بحث
          </button>
        </form>

        <FilterBar
          universities={universities.map((u) => ({
            slug: u.slug,
            nameAr: u.nameAr,
          }))}
          specialties={specialties.map((s) => ({
            slug: s.slug,
            nameAr: s.nameAr,
          }))}
          years={years}
          current={ {
            q,
            university: sp.university ?? "",
            specialty: sp.specialty ?? "",
            year: sp.year ?? "",
          } }
        />
      </div>

      <div className="mt-4 h-px bg-gradient-to-l from-primary/40 via-border to-transparent" />

      {/* النتائج — صفوف مضغوطة بفواصل رفيعة بدل الصناديق */}
      {topics.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          {hasAnyFilter
            ? "لا توجد مواضيع مطابقة — جرّب كلمة أخرى أو أزل بعض الفلاتر"
            : "لا توجد مواضيع منشورة بعد"}
        </p>
      ) : (
        <>
          <p className="mt-3 text-[11px] text-muted-foreground">
            عرض {(page - 1) * PAGE_SIZE + 1}–
            {(page - 1) * PAGE_SIZE + topics.length}
            {hasMore ? " · يوجد المزيد" : ""}
          </p>

          <div className="mt-1 divide-y">
            {topics.map((t) => (
              <Link
                key={t.id}
                href={`/topics/${t.slug}`}
                className="group flex items-center gap-3 py-3"
              >
                <span className="w-11 shrink-0 text-center text-xs font-bold text-primary">
                  {t.year}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium transition group-hover:text-primary">
                    {t.university.nameAr}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {t.specialty.nameAr} ·{" "}
                    {examTypeLabel[t.examType] ?? t.examType}
                    {t.examNumber != null &&
                      ` — موضوع ${String(t.examNumber).padStart(2, "0")}`}
                    {" · "}
                    {t.problems.length} تمارين
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground transition group-hover:-translate-x-0.5 group-hover:text-primary">
                  ←
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-center gap-3 text-xs">
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
        </>
      )}
    </div>
  );
}
