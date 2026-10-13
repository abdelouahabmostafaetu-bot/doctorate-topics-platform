import Link from "next/link";
import { ArrowLeft, BookOpen, Search, X } from "lucide-react";
import type { Metadata } from "next";
import { UNIVERSITY_EXAM_SUBJECT_LABELS } from "@/data/university-exams";
import { countryFlag, examCount } from "@/lib/university-exam-navigation";
import { searchUniversityExams, type UniversityExamSearchParams } from "@/lib/university-exam-search";

export const metadata: Metadata = {
  title: "الاختبارات الجامعية",
  description: "ابحث في اختبارات الرياضيات حسب الدولة والجامعة والمادة والسنة، واقرأ الملف الرسمي مباشرة داخل الموقع.",
};
const selectClass = "min-h-11 w-full min-w-0 cursor-pointer rounded-none border-0 border-b border-border bg-transparent px-1 py-2 text-sm text-foreground transition focus:border-primary focus:outline-none";
const tabClass = "inline-flex min-h-11 items-center border-b-2 px-1 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";

export default async function UniversityExamsPage({ searchParams }: { searchParams: Promise<UniversityExamSearchParams> }) {
  const result = searchUniversityExams(await searchParams);
  const { country, university, subject, view, assets, sources, total, page, pageCount, offset, link } = result;
  return (
    <main className="mx-auto max-w-3xl px-4 py-8" dir="rtl">
      <header>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-lg font-bold">الاختبارات الجامعية</h1>
          <span className="text-sm text-muted-foreground">رياضيات · مصادر جامعية رسمية</span>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">اختر الاختبار وافتح القارئ مباشرة، دون المرور بصفحات متعددة.</p>
      </header>

      <form key={link()} method="get" action="/university-exams" className="mt-5" aria-label="تصفية الاختبارات الجامعية">
        {view === "universities" && <input type="hidden" name="view" value="universities" />}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          <select name="country" defaultValue={country?.code.toLowerCase() || ""} className={selectClass} aria-label="الدولة">
            <option value="">كل الدول</option>
            {result.countries.map((item) => <option key={item.code} value={item.code.toLowerCase()}>{countryFlag(item.code)} {item.nameAr}</option>)}
          </select>
          <select name="university" defaultValue={university?.slug || ""} className={selectClass} aria-label="الجامعة">
            <option value="">كل الجامعات</option>
            {result.universities.map((item) => <option key={item.slug} value={item.slug}>{item.nameAr}</option>)}
          </select>
          <select name="subject" defaultValue={subject?.key || ""} className={selectClass} aria-label="المادة">
            <option value="">كل المواد</option>
            {result.subjects.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
          {view === "files" && <>
            <select name="year" defaultValue={result.year ? String(result.year) : ""} className={selectClass} aria-label="السنة">
              <option value="">كل السنوات</option>
              {result.years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
            <select name="kind" defaultValue={result.kind} className={selectClass} aria-label="نوع الملف">
              <option value="exam">الاختبارات</option><option value="solution">الحلول</option><option value="all">الاختبارات والحلول</option>
            </select>
          </>}
          <div className="flex min-h-11 items-center gap-3 pt-1">
            <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><Search className="h-4 w-4" />بحث</button>
            {result.hasFilters && <Link href={view === "universities" ? "/university-exams?view=universities" : "/university-exams"} className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" />مسح</Link>}
          </div>
        </div>
      </form>

      <nav className="mt-5 flex items-center gap-5 border-b" aria-label="طريقة التصفح">
        <Link href={link({ view: null, page: null })} aria-current={view === "files" ? "page" : undefined} className={`${tabClass} ${view === "files" ? "border-primary font-medium text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>الملفات المباشرة</Link>
        <Link href={link({ view: "universities", year: null, kind: null, page: null })} aria-current={view === "universities" ? "page" : undefined} className={`${tabClass} ${view === "universities" ? "border-primary font-medium text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>دليل الجامعات</Link>
      </nav>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <p>{total ? `عرض ${offset + 1}–${Math.min(offset + (view === "files" ? assets.length : sources.length), total)} من ${total} ${view === "files" ? "ملفًا" : "جامعة"}` : "لا توجد نتائج"}</p>
        {view === "files" && total > 0 && <span className="inline-flex items-center gap-1.5"><BookOpen className="h-4 w-4" />قراءة مباشرة</span>}
      </div>

      {total === 0 ? (
        <section className="py-14 text-center">
          <p className="text-base font-medium">{view === "files" ? "لا توجد ملفات مباشرة مطابقة" : "لا توجد جامعات مطابقة"}</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{view === "files" ? "جرّب تخفيف الفلاتر أو تصفّح دليل الجامعات؛ بعض المصادر لم تُضف ملفاتها المباشرة بعد." : "أزل بعض الفلاتر لعرض المزيد من الجامعات."}</p>
          <Link href={view === "files" ? link({ view: "universities", year: null, kind: null }) : "/university-exams?view=universities"} className="mt-4 inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4">{view === "files" ? "تصفّح دليل الجامعات" : "عرض جميع الجامعات"}</Link>
        </section>
      ) : (
        <div className="mt-2 divide-y">
          {view === "files" ? assets.map(({ source, collection, asset, assetIndex }) => (
            <Link key={`${source.slug}-${collection.id}-${assetIndex}`} href={`/university-exams/${source.slug}/subject/${collection.subject}/read/${collection.id}/${assetIndex}`} className="group flex items-center gap-3 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
              <span className="w-11 shrink-0 text-center text-sm font-bold tabular-nums text-primary">{asset.year}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium leading-6 transition group-hover:text-primary">{collection.titleAr} — <bdi>{asset.label}</bdi>{asset.kind === "solution" && <span className="ms-2 text-primary">حل رسمي</span>}</span>
                <span className="mt-1 block text-sm leading-6 text-muted-foreground"><span aria-hidden="true">{countryFlag(source.countryCode)}</span> {source.nameAr} · {UNIVERSITY_EXAM_SUBJECT_LABELS[collection.subject] || collection.subject}</span>
              </span>
              <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:-translate-x-0.5 group-hover:text-primary" aria-label="فتح القارئ" />
            </Link>
          )) : sources.map((source) => (
            <Link key={source.slug} href={subject ? `/university-exams/${source.slug}/subject/${subject.key}` : `/university-exams/${source.slug}`} className="group flex items-center gap-3 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
              <span className="w-11 shrink-0 text-center text-2xl" aria-hidden="true">{countryFlag(source.countryCode)}</span>
              <span className="min-w-0 flex-1"><span className="block text-base font-medium leading-6 transition group-hover:text-primary">{source.nameAr}</span><span className="mt-1 block text-sm text-muted-foreground">{source.countryAr} · {source.collections.length} مجموعات مقررات · {examCount(source)} اختبارات مباشرة</span><span className="mt-1 block text-sm text-muted-foreground">{source.access === "restricted" ? "قد تتطلب بعض الأرشيفات حساب الجامعة" : "مصادر رسمية متاحة للعامة"}</span></span>
              <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
            </Link>
          ))}
        </div>
      )}
      {pageCount > 1 && <nav className="mt-6 flex items-center justify-center gap-4 text-sm" aria-label="صفحات النتائج">
        {page > 1 && <Link href={link({ page: page > 2 ? String(page - 1) : null })} className="inline-flex min-h-11 items-center rounded-md border px-3 hover:border-primary hover:text-primary">السابق</Link>}
        <span className="text-muted-foreground">{page} / {pageCount}</span>
        {page < pageCount && <Link href={link({ page: String(page + 1) })} className="inline-flex min-h-11 items-center rounded-md border px-3 hover:border-primary hover:text-primary">التالي</Link>}
      </nav>}
      <p className="mt-6 border-t pt-4 text-sm leading-6 text-muted-foreground">تُضاف الملفات المباشرة تدريجيًا. جميع الحقوق والتراخيص محفوظة لمصادرها الجامعية.</p>
    </main>
  );
}
