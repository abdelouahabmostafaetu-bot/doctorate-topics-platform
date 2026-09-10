import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getWorldCountries } from "@/lib/topic-cache";
import { getTopicScope } from "@/lib/topic-scope";
import { COUNTRIES, getCountryBySlug } from "@/lib/countries";

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
type TopicIdRow = { _id: { $oid: string } };
type CountRow = { n: number };

const selectClass =
  "max-w-[42vw]] cursor-pointer border-0 border-b border-border bg-transparent px-1 py-1 text-xs text-foreground transition focus:border-primary focus:outline-none sm:max-w-[220px]";
const yearClass =
  "w-24 cursor-pointer border-0 border-b border-border bg-transparent px-1 py-1 text-[11px] text-foreground transition focus:border-primary focus:outline-none";

export async function generateMetadata({ params }: { params: Promise<{ country: string }> }): Promise<Metadata> {
  const { country: slug } = await params;
  const country = getCountryBySlug(slug);
  if (!country) return { title: "مواضيع دكتوراه أجنبية" };
  return {
    title: `${country.nameAr} — مواضيع دكتوراه أجنبية`,
    description: `تصفّح مواضيع امتحانات دكتوراه الرياضيات في ${country.nameAr}.`,
  };
}

export default async function CountrySearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ country: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ country: slug }, sp] = await Promise.all([params, searchParams]);
  const country = getCountryBySlug(slug);
  if (!country) return notFound();

  const [scope, worldCountries] = await Promise.all([
    getTopicScope(country.iso),
    getWorldCountries(),
  ]);
  if (
    !COUNTRIES.some((known) => known.iso === country.iso) &&
    !worldCountries.some((known) => known.iso === country.iso)
  ) return notFound();

  const countrySlug = country.slug;
  const selectedUniversity =
    scope.universities.find((item) => item.slug === sp.university) ?? null;
  const selectedSpecialty =
    scope.specialties.find((item) => item.slug === sp.specialty) ?? null;
  const requestedYear = /^\d{4}$/.test(sp.year ?? "") ? Number(sp.year) : null;
  const selectedYear = requestedYear && scope.years.includes(requestedYear) ? requestedYear : null;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const eligibleUniversityIds = selectedUniversity
    ? [selectedUniversity.id]
    : scope.universities.map((item) => item.id);
  const match: Record<string, Prisma.InputJsonValue> = {
    status: "published",
    universityId: { $in: eligibleUniversityIds.map((id) => ({ $oid: id })) },
  };
  if (selectedYear) match.year = selectedYear;
  if (selectedSpecialty) match.specialtyId = { $oid: selectedSpecialty.id };

  let raw: TopicIdRow[] = [];
  let countRaw: CountRow[] = [];
  if (eligibleUniversityIds.length) {
    [raw, countRaw] = await Promise.all([
      prisma.topic.aggregateRaw({
        pipeline: [
          { $match: match },
          { $sort: { year: -1, examNumber: 1 } },
          { $skip: (page - 1) * PAGE_SIZE },
          { $limit: PAGE_SIZE + 1 },
          { $project: { _id: 1 } },
        ] as Prisma.InputJsonValue[],
      }) as unknown as Promise<TopicIdRow[]>,
      prisma.topic.aggregateRaw({
        pipeline: [{ $match: match }, { $count: "n" }] as Prisma.InputJsonValue[],
      }) as unknown as Promise<CountRow[]>,
    ]);
  }

  const total = countRaw[0]?.n ?? 0;
  const hasMore = raw.length > PAGE_SIZE;
  const ids = raw.slice(0, PAGE_SIZE).map((row) => row._id.$oid);
  const unordered = ids.length
    ? await prisma.topic.findMany({
        where: { id: { in: ids } },
        include: { university: true, specialty: true },
      })
    : [];
  const topics = ids
    .map((id) => unordered.find((topic) => topic.id === id))
    .filter((topic): topic is NonNullable<typeof topic> => Boolean(topic));

  const cleanParams = new URLSearchParams();
  if (selectedUniversity) cleanParams.set("university", selectedUniversity.slug);
  if (selectedSpecialty) cleanParams.set("specialty", selectedSpecialty.slug);
  if (selectedYear) cleanParams.set("year", String(selectedYear));
  const hasAnyFilter = cleanParams.size > 0;
  const topicQs = hasAnyFilter ? `?${cleanParams.toString()}` : "";
  function pageLink(nextPage: number) {
    const query = new URLSearchParams(cleanParams);
    if (nextPage > 1) query.set("page", String(nextPage));
    const qs = query.toString();
    return qs ? `/world/${countrySlug}?${qs}` : `/world/${countrySlug}`;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/world" className="block text-[11px] text-muted-foreground underline-offset-2 transition hover:text-primary hover:underline">
        → كل الدول
      </Link>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="flex items-center gap-2 text-base font-bold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={country.flag} alt="" width={20} height={20} className="h-5 w-5 rounded-full object-cover ring-1 ring-border" />
          {country.nameAr}
        </h1>
        <p className="text-[11px] text-muted-foreground">{country.nameNative} · اختر من الخيارات المتاحة فقط</p>
      </div>

      <form method="get" action={`/world/${countrySlug}`} className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <select name="university" defaultValue={selectedUniversity?.slug ?? ""} className={selectClass} aria-label={`جامعات ${country.nameAr}`}>
          <option value="">🏛️ جامعات {country.nameAr}</option>
          {scope.universities.map((item) => <option key={item.slug} value={item.slug}>{item.nameAr}</option>)}
        </select>
        <select name="specialty" defaultValue={selectedSpecialty?.slug ?? ""} className={selectClass} aria-label={`تخصصات ${country.nameAr}`}>
          <option value="">🧭 تخصصات متاحة في {country.nameAr}</option>
          {scope.specialties.map((item) => <option key={item.slug} value={item.slug}>{item.nameAr}</option>)}
        </select>
        <select name="year" defaultValue={selectedYear ? String(selectedYear) : ""} className={yearClass} aria-label="السنة">
          <option value="">📅 السنة</option>
          {scope.years.map((year) => <option key={year} value={year}>{year}</option>)}
        </select>
        <button type="submit" className="rounded-full bg-primary px-4 py-1 text-[11px] font-medium text-primary-foreground transition hover:opacity-90">🔍 بحث</button>
        {hasAnyFilter && <Link href={`/world/${countrySlug}`} className="text-[11px] text-muted-foreground transition hover:text-destructive">✕ مسح</Link>}
      </form>

      <div className="mt-4 h-px bg-gradient-to-l from-primary/40 via-border to-transparent" />
      {topics.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">{hasAnyFilter ? "لا توجد مواضيع مطابقة — أزل بعض الفلاتر" : `لا توجد مواضيع منشورة لـ${country.nameAr} بعد`}</p>
      ) : (
        <>
          <p className="mt-3 text-[11px] text-muted-foreground">عرض {(page - 1) * PAGE_SIZE + 1}–{(page - 1) * PAGE_SIZE + topics.length} من {total}</p>
          <div className="mt-1 divide-y">
            {topics.map((topic) => (
              <Link key={topic.id} href={`/topics/${topic.slug}${topicQs}`} className="group flex items-center gap-3 py-3">
                <span className="w-11 shrink-0 text-center text-xs font-bold text-primary">{topic.year}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium transition group-hover:text-primary">{topic.university.nameAr}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {topic.specialty.nameAr} · {examTypeLabel[topic.examType] ?? topic.examType}
                    {topic.examNumber != null && ` — موضوع ${String(topic.examNumber).padStart(2, "0")}`} · {topic.problems.length} تمارين
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground transition group-hover:-translate-x-0.5 group-hover:text-primary">←</span>
              </Link>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-center gap-3 text-xs">
            {page > 1 && <Link href={pageLink(page - 1)} className="rounded-full border px-3 py-1 transition hover:border-primary hover:text-primary">→ السابق</Link>}
            <span className="text-muted-foreground">صفحة {page}</span>
            {hasMore && <Link href={pageLink(page + 1)} className="rounded-full border px-3 py-1 transition hover:border-primary hover:text-primary">التالي ←</Link>}
          </div>
        </>
      )}
    </div>
  );
}
