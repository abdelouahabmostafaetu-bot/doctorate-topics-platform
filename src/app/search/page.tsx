import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { BulkDownloadButton } from "@/components/search/bulk-download-button";
import { MAX_BULK } from "@/lib/pdf/bulk-filters";

// صفحة المواضيع تُصيّر عند كل طلب (النتائج تتغير حسب الفلاتر)
export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

const examTypeLabel: Record<string, string> = {
  general: "مسابقة عامة",
  specialty: "مسابقة تخصص",
};

type SearchParams = {
  university?: string;
  specialty?: string;
  year?: string;
  page?: string;
};

export const metadata = {
  title: "المواضيع — منصة مواضيع دكتوراه الرياضيات",
};

// فلاتر بخط سفلي بدون صناديق — كتابة صغيرة جدًا
const selectClass =
  "max-w-[42vw] cursor-pointer border-0 border-b border-border bg-transparent px-1 py-1 text-xs text-foreground transition focus:border-primary focus:outline-none sm:max-w-[220px]";
const yearClass =
  "w-24 cursor-pointer border-0 border-b border-border bg-transparent px-1 py-1 text-[11px] text-foreground transition focus:border-primary focus:outline-none";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const session = await auth();
  const isLoggedIn = Boolean(session?.user?.id);

  // قوائم الفلاتر: الجامعات + التخصصات + السنوات المتوفرة فعليًا
  const [universities, specialties, yearsRaw] = await Promise.all([
    prisma.university.findMany({ orderBy: { nameAr: "asc" } }),
    prisma.specialty.findMany({ orderBy: { nameAr: "asc" } }),
    prisma.topic.aggregateRaw({
      pipeline: [
        { $match: { status: "published" } },
        { $group: { _id: "$year" } },
        { $sort: { _id: -1 } },
      ],
    }) as unknown as Promise<Array<{ _id: number }>>,
  ]);
  const years = yearsRaw.map((y) => y._id).filter((y) => y != null);

  // شرط المطابقة: الجامعة + التخصص + السنة (بدون بحث بكلمة)
  const match: Record<string, Prisma.InputJsonValue> = { status: "published" };
  if (sp.year && /^\d{4}$/.test(sp.year)) match.year = parseInt(sp.year, 10);
  if (sp.university) {
    const uni = universities.find((u) => u.slug === sp.university);
    if (uni) match.universityId = { $oid: uni.id };
  }
  if (sp.specialty) {
    const spec = specialties.find((s) => s.slug === sp.specialty);
    if (spec) match.specialtyId = { $oid: spec.id };
  }

  const hasAnyFilter = Boolean(sp.university || sp.specialty || sp.year);

  // النتائج + العدد الإجمالي (لزر تحميل الكل)
  const [raw, countRaw] = await Promise.all([
    prisma.topic.aggregateRaw({
      pipeline: [
        { $match: match },
        { $sort: { year: -1, examNumber: 1 } },
        { $skip: (page - 1) * PAGE_SIZE },
        { $limit: PAGE_SIZE + 1 },
        { $project: { _id: 1 } },
      ] as Prisma.InputJsonValue[],
    }) as unknown as Promise<Array<{ _id: { $oid: string } }>>,
    prisma.topic.aggregateRaw({
      pipeline: [{ $match: match }, { $count: "n" }] as Prisma.InputJsonValue[],
    }) as unknown as Promise<Array<{ n: number }>>,
  ]);
  const total = countRaw[0]?.n ?? 0;
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
    if (sp.university) params.set("university", sp.university);
    if (sp.specialty) params.set("specialty", sp.specialty);
    if (sp.year) params.set("year", sp.year);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/search?${qs}` : "/search";
  }

  // نمرر الفلاتر الحالية إلى صفحة الموضوع حتى تتنقل أسهم السابق/التالي ضمن نفس الفلترة
  const topicParams = new URLSearchParams();
  if (sp.university) topicParams.set("university", sp.university);
  if (sp.specialty) topicParams.set("specialty", sp.specialty);
  if (sp.year) topicParams.set("year", sp.year);
  const topicQs = topicParams.toString() ? `?${topicParams.toString()}` : "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* إشعار صغير يقود لصفحة حول الموقع */}
      <Link
        href="/about#search"
        className="block text-[11px] text-muted-foreground underline-offset-2 transition hover:text-primary hover:underline"
      >
        💡 كيف تتصفّح المواضيع بطريقة أفضل؟ اقرأ صفحة «حول الموقع» ←
      </Link>

      {/* رأس صغير */}
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-base font-bold">📄 المواضيع</h1>
        <p className="text-[11px] text-muted-foreground">
          اختر الفلاتر ثم اضغط «بحث»
        </p>
      </div>

      {/* فلاتر + زر بحث واحد — بدون تحديث فوري */}
      <form
        method="get"
        action="/search"
        className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2"
      >
        <select
          name="university"
          defaultValue={sp.university ?? ""}
          className={selectClass}
          aria-label="الجامعة"
        >
          <option value="">🏛️ كل الجامعات</option>
          {universities.map((u) => (
            <option key={u.slug} value={u.slug}>
              {u.nameAr}
            </option>
          ))}
        </select>

        <select
          name="specialty"
          defaultValue={sp.specialty ?? ""}
          className={selectClass}
          aria-label="التخصص"
        >
          <option value="">🧭 كل التخصصات</option>
          {specialties.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.nameAr}
            </option>
          ))}
        </select>

        <select
          name="year"
          defaultValue={sp.year ?? ""}
          className={yearClass}
          aria-label="السنة"
        >
          <option value="">📅 السنة</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="rounded-full bg-primary px-4 py-1 text-[11px] font-medium text-primary-foreground transition hover:opacity-90"
        >
          🔍 بحث
        </button>

        {hasAnyFilter && (
          <Link
            href="/search"
            className="text-[11px] text-muted-foreground transition hover:text-destructive"
          >
            ✕ مسح
          </Link>
        )}
      </form>

      <div className="mt-4 h-px bg-gradient-to-l from-primary/40 via-border to-transparent" />

      {/* النتائج — صفوف مضغوطة بفواصل رفيعة بدل الصناديق */}
      {topics.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          {hasAnyFilter
            ? "لا توجد مواضيع مطابقة — أزل بعض الفلاتر"
            : "لا توجد مواضيع منشورة بعد"}
        </p>
      ) : (
        <>
          {/* عداد النتائج + زر تحميل الكل في الجهة اليسرى عند اختيار فلترة */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p className="text-[11px] text-muted-foreground">
              عرض {(page - 1) * PAGE_SIZE + 1}–
              {(page - 1) * PAGE_SIZE + topics.length} من {total}
            </p>
            {hasAnyFilter && total > 0 && (
              <div className="ms-auto">
                <BulkDownloadButton
                  university={sp.university ?? ""}
                  specialty={sp.specialty ?? ""}
                  year={sp.year ?? ""}
                  count={Math.min(total, MAX_BULK)}
                  isLoggedIn={isLoggedIn}
                />
              </div>
            )}
          </div>

          <div className="mt-1 divide-y">
            {topics.map((t) => (
              <Link
                key={t.id}
                href={`/topics/${t.slug}${topicQs}`}
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
