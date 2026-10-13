import Link from "next/link";
import type { Metadata } from "next";
import { countryFlag } from "@/lib/university-exam-navigation";
import { searchUniversityExams, type UniversityExamSearchParams } from "@/lib/university-exam-search";

export const metadata: Metadata = {
  title: "الاختبارات الجامعية",
  description: "اختبارات الرياضيات الجامعية حسب الدولة والجامعة والمادة والسنة، مع قراءة الملف مباشرة داخل الموقع.",
};
// Keep these classes identical to /search. The country selector is the only
// additional interface control; the existing direct reader remains unchanged.
const selectClass =
  "max-w-[42vw] cursor-pointer border-0 border-b border-border bg-transparent px-1 py-1 text-xs text-foreground transition focus:border-primary focus:outline-none sm:max-w-[220px]";
const yearClass =
  "w-24 cursor-pointer border-0 border-b border-border bg-transparent px-1 py-1 text-[11px] text-foreground transition focus:border-primary focus:outline-none";

export default async function UniversityExamsPage({ searchParams }: { searchParams: Promise<UniversityExamSearchParams> }) {
  const sp = await searchParams;
  const result = searchUniversityExams({ ...sp, subject: sp.specialty ?? sp.subject, view: "files", kind: "all" });
  const { country, university, subject, year, assets, total, page, offset } = result;
  const cleanParams = new URLSearchParams();
  if (country) cleanParams.set("country", country.code.toLowerCase());
  if (university) cleanParams.set("university", university.slug);
  if (subject) cleanParams.set("specialty", subject.key);
  if (year) cleanParams.set("year", String(year));
  const hasAnyFilter = cleanParams.size > 0;
  const hasMore = page < result.pageCount;
  function pageLink(nextPage: number) {
    const query = new URLSearchParams(cleanParams);
    if (nextPage > 1) query.set("page", String(nextPage));
    const qs = query.toString();
    return qs ? `/university-exams?${qs}` : "/university-exams";
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/about#search" className="block text-[11px] text-muted-foreground underline-offset-2 transition hover:text-primary hover:underline">
        💡 كيف تتصفّح المواضيع بطريقة أفضل؟ اقرأ صفحة «حول الموقع» ←
      </Link>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-base font-bold">🌍 الاختبارات الجامعية</h1>
        <p className="text-[11px] text-muted-foreground">اختبارات الرياضيات من الجامعات العالمية</p>
      </div>

      <form method="get" action="/university-exams" className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <select name="country" defaultValue={country?.code.toLowerCase() ?? ""} className={selectClass} aria-label="الدولة">
          <option value="">🌍 الدولة</option>
          {result.countries.map((item) => <option key={item.code} value={item.code.toLowerCase()}>{countryFlag(item.code)} {item.nameAr}</option>)}
        </select>
        <select name="university" defaultValue={university?.slug ?? ""} className={selectClass} aria-label="الجامعات">
          <option value="">🏛️ الجامعات</option>
          {result.universities.map((item) => <option key={item.slug} value={item.slug}>{item.nameAr}</option>)}
        </select>
        <select name="specialty" defaultValue={subject?.key ?? ""} className={selectClass} aria-label="المواد المتاحة">
          <option value="">🧭 المواد المتاحة</option>
          {result.subjects.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
        </select>
        <select name="year" defaultValue={year ? String(year) : ""} className={yearClass} aria-label="السنة">
          <option value="">📅 السنة</option>
          {result.years.map((year) => <option key={year} value={year}>{year}</option>)}
        </select>
        <button type="submit" className="rounded-full bg-primary px-4 py-1 text-[11px] font-medium text-primary-foreground transition hover:opacity-90">🔍 بحث</button>
        {hasAnyFilter && <Link href="/university-exams" className="text-[11px] text-muted-foreground transition hover:text-destructive">✕ مسح</Link>}
      </form>

      <div className="mt-4 h-px bg-gradient-to-l from-primary/40 via-border to-transparent" />
      {assets.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">{hasAnyFilter ? "لا توجد اختبارات مطابقة — أزل بعض الفلاتر" : "لا توجد اختبارات جامعية متاحة بعد"}</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p className="text-[11px] text-muted-foreground">عرض {offset + 1}–{offset + assets.length} من {total}</p>
          </div>
          <div className="mt-1 divide-y">
            {assets.map(({ source, collection, asset, assetIndex }) => (
              <Link key={`${source.slug}-${collection.id}-${assetIndex}`} href={`/university-exams/${source.slug}/subject/${collection.subject}/read/${collection.id}/${assetIndex}`} className="group flex items-center gap-3 py-3">
                <span className="w-11 shrink-0 text-center text-xs font-bold text-primary">{asset.year}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium transition group-hover:text-primary">{source.nameAr}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {collection.titleAr} · {asset.kind === "solution" ? "حل الاختبار" : "اختبار"} — {asset.label}
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
