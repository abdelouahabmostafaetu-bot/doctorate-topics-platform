import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getFilterLists } from "@/lib/topic-cache";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

const COUNTRIES = [
  { code: "tn", name: "تونس", flag: "🇹🇳" },
  { code: "ma", name: "المغرب", flag: "🇲🇦" },
  { code: "eg", name: "مصر", flag: "🇪🇬" },
  { code: "sa", name: "السعودية", flag: "🇸🇦" },
  { code: "jo", name: "الأردن", flag: "🇯🇴" },
  { code: "mr", name: "موريتانيا", flag: "🇲🇷" },
  { code: "fr", name: "فرنسا", flag: "🇫🇷" },
] as const;

const examTypeLabel: Record<string, string> = {
  general: "مسابقة عامة",
  specialty: "مسابقة تخصص",
};

type SearchParams = {
  country?: string;
  university?: string;
  specialty?: string;
  year?: string;
  page?: string;
};

export const metadata: Metadata = {
  title: "آفاق — مواضيع الدكتوراه حول العالم",
  description:
    "تصفّح مواضيع مسابقات الدكتوراه في الرياضيات من جامعات ودول مختلفة.",
};

const selectClass =
  "max-w-[44vw] cursor-pointer border-0 border-b border-border bg-transparent px-1 py-1.5 text-xs text-foreground transition focus:border-primary focus:outline-none sm:max-w-[220px]";

export default async function WorldPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const country = COUNTRIES.find((item) => item.code === sp.country);
  const { universities, specialties, years } = await getFilterLists();

  // الجامعات الدولية تتبع بادئة الدولة في المعرّف، مثل tn-university-tunis.
  const internationalUniversities = universities.filter((university) =>
    COUNTRIES.some((item) => university.slug.startsWith(`${item.code}-`)),
  );
  const countryUniversities = country
    ? internationalUniversities.filter((university) =>
        university.slug.startsWith(`${country.code}-`),
      )
    : internationalUniversities;
  const selectedUniversity = countryUniversities.find(
    (university) => university.slug === sp.university,
  );
  const selectedSpecialty = specialties.find(
    (specialty) => specialty.slug === sp.specialty,
  );
  const eligibleUniversityIds = selectedUniversity
    ? [selectedUniversity.id]
    : countryUniversities.map((university) => university.id);

  const match: Record<string, Prisma.InputJsonValue> = {
    status: "published",
    universityId: {
      $in: eligibleUniversityIds.map((id) => ({ $oid: id })),
    },
  };
  if (sp.year && /^\d{4}$/.test(sp.year)) {
    match.year = Number.parseInt(sp.year, 10);
  }
  if (selectedSpecialty) {
    match.specialtyId = { $oid: selectedSpecialty.id };
  }

  const hasFilters = Boolean(
    country || selectedUniversity || selectedSpecialty || sp.year,
  );

  const [raw, countRaw] = eligibleUniversityIds.length
    ? await Promise.all([
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
      ])
    : [[], []];

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

  function buildLink(nextPage: number): string {
    const params = new URLSearchParams();
    if (country) params.set("country", country.code);
    if (selectedUniversity) params.set("university", selectedUniversity.slug);
    if (selectedSpecialty) params.set("specialty", selectedSpecialty.slug);
    if (sp.year) params.set("year", sp.year);
    if (nextPage > 1) params.set("page", String(nextPage));
    const query = params.toString();
    return query ? `/world?${query}` : "/world";
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="border-b pb-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border bg-secondary/40 text-xl" aria-hidden>
            🌍
          </span>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-primary">DOCMATH INTERNATIONAL</p>
            <h1 className="mt-1 text-xl font-bold">آفاق</h1>
          </div>
        </div>
        <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
          مواضيع مسابقات الدكتوراه في الرياضيات من جامعات خارج الجزائر، مرتبة حسب الدولة والجامعة والتخصص والسنة.
        </p>
      </header>

      <form method="get" action="/world" className="mt-5 flex flex-wrap items-end gap-x-4 gap-y-3">
        <label className="grid gap-1 text-[10px] text-muted-foreground">
          الدولة
          <select name="country" defaultValue={country?.code ?? ""} className={selectClass}>
            <option value="">🌐 كل الدول</option>
            {COUNTRIES.map((item) => (
              <option key={item.code} value={item.code}>{item.flag} {item.name}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-[10px] text-muted-foreground">
          الجامعة
          <select name="university" defaultValue={selectedUniversity?.slug ?? ""} className={selectClass}>
            <option value="">🏛️ كل الجامعات</option>
            {countryUniversities.map((university) => (
              <option key={university.id} value={university.slug}>{university.nameAr}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-[10px] text-muted-foreground">
          التخصص
          <select name="specialty" defaultValue={selectedSpecialty?.slug ?? ""} className={selectClass}>
            <option value="">🧭 كل التخصصات</option>
            {specialties.map((specialty) => (
              <option key={specialty.id} value={specialty.slug}>{specialty.nameAr}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-[10px] text-muted-foreground">
          السنة
          <select name="year" defaultValue={sp.year ?? ""} className={selectClass}>
            <option value="">📅 كل السنوات</option>
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
        <button type="submit" className="min-h-11 rounded-lg bg-primary px-5 text-xs font-semibold text-primary-foreground transition hover:opacity-90">
          بحث
        </button>
        {hasFilters && <Link href="/world" className="flex min-h-11 items-center text-xs text-muted-foreground hover:text-destructive">مسح الفلاتر</Link>}
      </form>

      <div className="mt-6 h-px bg-gradient-to-l from-primary/45 via-border to-transparent" />

      {topics.length === 0 ? (
        <section className="py-16 text-center">
          <span className="text-3xl" aria-hidden>⌁</span>
          <h2 className="mt-3 text-sm font-bold">لا توجد مواضيع دولية منشورة هنا بعد</h2>
          <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-muted-foreground">
            هذا القسم ينمو تدريجيًا. يمكنك مساعدتنا بإرسال موضوع من جامعة خارج الجزائر.
          </p>
          <Link href="/contribute" className="mt-5 inline-flex min-h-11 items-center rounded-lg border px-4 text-xs font-semibold transition hover:border-primary hover:text-primary">
            ساهم بموضوع دولي
          </Link>
        </section>
      ) : (
        <>
          <p className="mt-4 text-[11px] text-muted-foreground">
            عرض {(page - 1) * PAGE_SIZE + 1}–{(page - 1) * PAGE_SIZE + topics.length} من {total}
          </p>
          <div className="mt-2 divide-y">
            {topics.map((topic) => {
              const countryInfo = COUNTRIES.find((item) => topic.university.slug.startsWith(`${item.code}-`));
              return (
                <Link key={topic.id} href={`/topics/${topic.slug}`} className="group flex min-h-16 items-center gap-3 py-3">
                  <span className="w-10 shrink-0 text-center text-lg" aria-hidden>{countryInfo?.flag ?? "🌐"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold group-hover:text-primary">{topic.university.nameAr}</span>
                    <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                      {countryInfo?.name ?? "دولي"} · {topic.specialty.nameAr} · {examTypeLabel[topic.examType] ?? topic.examType} · {topic.year}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground transition group-hover:-translate-x-1 group-hover:text-primary">←</span>
                </Link>
              );
            })}
          </div>
          <nav className="mt-7 flex items-center justify-center gap-3 text-xs" aria-label="صفحات النتائج">
            {page > 1 && <Link href={buildLink(page - 1)} className="rounded-lg border px-3 py-2 hover:border-primary hover:text-primary">→ السابق</Link>}
            <span className="text-muted-foreground">صفحة {page}</span>
            {hasMore && <Link href={buildLink(page + 1)} className="rounded-lg border px-3 py-2 hover:border-primary hover:text-primary">التالي ←</Link>}
          </nav>
        </>
      )}
    </div>
  );
}
