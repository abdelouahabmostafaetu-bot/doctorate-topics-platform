import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TopicCard } from "@/components/topic-card";

// صفحة البحث تُصيّر عند كل طلب (النتائج تتغير حسب الفلاتر)
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const difficultyOptions = [
  { value: "easy", label: "سهل" },
  { value: "medium", label: "متوسط" },
  { value: "hard", label: "صعب" },
];

const examTypeOptions = [
  { value: "general", label: "مسابقة عامة" },
  { value: "specialty", label: "مسابقة تخصص" },
];

type SearchParams = {
  q?: string;
  university?: string;
  year?: string;
  examType?: string;
  difficulty?: string;
  page?: string;
};

export const metadata = {
  title: "البحث — منصة مواضيع دكتوراه الرياضيات",
};

const selectClass =
  "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  // قوائم الفلاتر: الجامعات + السنوات المتوفرة فعليًا
  const [universities, yearsRaw] = await Promise.all([
    prisma.university.findMany({ orderBy: { name: "asc" } }),
    prisma.topic.aggregateRaw({
      pipeline: [
        { $match: { status: "published" } },
        { $group: { _id: "$year" } },
        { $sort: { _id: -1 } },
      ],
    }) as unknown as Promise<Array<{ _id: number }>>,
  ]);
  const years = yearsRaw.map((y) => y._id).filter((y) => y != null);

  // بناء شرط المطابقة — ‎$text‎ يستخدم الفهرس النصي المنشأ في الأسبوع 2
  const match: Record<string, Prisma.InputJsonValue> = { status: "published" };
  if (q) match.$text = { $search: q };
  if (sp.year && /^\d{4}$/.test(sp.year)) match.year = parseInt(sp.year, 10);
  if (sp.examType && examTypeOptions.some((o) => o.value === sp.examType)) {
    match.examType = sp.examType;
  }
  if (
    sp.difficulty &&
    difficultyOptions.some((o) => o.value === sp.difficulty)
  ) {
    match["problems.difficulty"] = sp.difficulty;
  }
  if (sp.university) {
    const uni = universities.find((u) => u.slug === sp.university);
    if (uni) match.universityId = { $oid: uni.id };
  }

  // بناء خط أنابيب التجميع
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
    if (sp.year) params.set("year", sp.year);
    if (sp.examType) params.set("examType", sp.examType);
    if (sp.difficulty) params.set("difficulty", sp.difficulty);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/search?${qs}` : "/search";
  }

  const hasAnyFilter =
    Boolean(q) ||
    Boolean(sp.university) ||
    Boolean(sp.year) ||
    Boolean(sp.examType) ||
    Boolean(sp.difficulty);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold">البحث في المواضيع</h1>
      <p className="mt-1 text-muted-foreground">
        ابحث بالكلمات المفتاحية (بالفرنسية غالبًا) أو استخدم الفلاتر فقط
      </p>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* الفلاتر — شريط جانبي */}
        <aside className="shrink-0 lg:w-72">
          <form
            method="get"
            action="/search"
            className="space-y-4 rounded-lg border bg-card p-4 shadow-sm lg:sticky lg:top-20"
          >
            <p className="text-sm font-semibold">🎛️ فلاتر البحث</p>

            <label className="block text-sm font-medium">
              كلمات مفتاحية
              <input
                type="text"
                name="q"
                defaultValue={q}
                dir="auto"
                placeholder="مثال: intégrale، topologie..."
                className={selectClass}
              />
            </label>

            <label className="block text-sm font-medium">
              الجامعة
              <select
                name="university"
                defaultValue={sp.university ?? ""}
                className={selectClass}
              >
                <option value="">كل الجامعات</option>
                {universities.map((u) => (
                  <option key={u.id} value={u.slug}>
                    {u.nameAr}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium">
              السنة
              <select
                name="year"
                defaultValue={sp.year ?? ""}
                className={selectClass}
              >
                <option value="">كل السنوات</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium">
              مستوى الصعوبة
              <select
                name="difficulty"
                defaultValue={sp.difficulty ?? ""}
                className={selectClass}
              >
                <option value="">كل المستويات</option>
                {difficultyOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium">
              نوع المسابقة
              <select
                name="examType"
                defaultValue={sp.examType ?? ""}
                className={selectClass}
              >
                <option value="">كل الأنواع</option>
                {examTypeOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="w-full rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              بحث 🔍
            </button>
            {hasAnyFilter && (
              <Link
                href="/search"
                className="block rounded-md border px-4 py-2 text-center text-sm text-muted-foreground transition hover:text-foreground"
              >
                مسح الفلاتر
              </Link>
            )}
          </form>
        </aside>

        {/* النتائج */}
        <div className="min-w-0 flex-1">
          {topics.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
              {hasAnyFilter
                ? "لا توجد نتائج مطابقة — جرّب كلمات أقل أو أزل بعض الفلاتر"
                : "اكتب كلمة مفتاحية أو اختر فلترًا ثم اضغط بحث"}
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                النتائج {(page - 1) * PAGE_SIZE + 1}–
                {(page - 1) * PAGE_SIZE + topics.length}
                {hasMore ? " (يوجد المزيد)" : ""}
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {topics.map((t) => (
                  <TopicCard key={t.id} topic={t} />
                ))}
              </div>
              <div className="mt-8 flex items-center justify-center gap-3">
                {page > 1 && (
                  <Link
                    href={pageLink(page - 1)}
                    className="rounded-md border px-4 py-2 text-sm transition hover:border-primary hover:text-primary"
                  >
                    → السابق
                  </Link>
                )}
                <span className="text-sm text-muted-foreground">
                  صفحة {page}
                </span>
                {hasMore && (
                  <Link
                    href={pageLink(page + 1)}
                    className="rounded-md border px-4 py-2 text-sm transition hover:border-primary hover:text-primary"
                  >
                    التالي ←
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
