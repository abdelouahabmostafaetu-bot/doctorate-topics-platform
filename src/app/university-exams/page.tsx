import Link from "next/link"
import type { Metadata } from "next"
import {
  GLOBAL_UNIVERSITY_EXAM_SOURCES,
  UNIVERSITY_EXAM_ACCESS_LABELS,
  UNIVERSITY_EXAM_LEVEL_LABELS,
  UNIVERSITY_EXAM_SUBJECT_LABELS,
} from "@/data/university-exams"

export const metadata: Metadata = {
  title: "أرشيف الاختبارات الجامعية",
  description: "تصفح اختبارات الرياضيات الجامعية من جامعات عالمية حسب الجامعة والمادة والمستوى والدولة.",
}

type SearchParams = { q?: string; country?: string; level?: string; subject?: string; access?: string }
const selectClass = "min-h-11 w-full border-0 border-b border-border bg-transparent px-1 py-2 text-sm text-foreground outline-none transition focus:border-indigo-500"

function unique(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b))
}

export default async function UniversityExamsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const query = (sp.q ?? "").trim().toLocaleLowerCase()
  const rows = GLOBAL_UNIVERSITY_EXAM_SOURCES.flatMap((source) => source.collections.map((collection) => ({ source, collection })))
  const countries = unique(GLOBAL_UNIVERSITY_EXAM_SOURCES.map((source) => source.countryCode))
  const subjects = unique(rows.map(({ collection }) => collection.subject))
  const results = rows.filter(({ source, collection }) => {
    const haystack = [source.name, source.nameAr, source.shortName, source.country, source.countryAr, collection.title, collection.titleAr, collection.courseCode ?? "", UNIVERSITY_EXAM_SUBJECT_LABELS[collection.subject] ?? collection.subject].join(" ").toLocaleLowerCase()
    if (query && !haystack.includes(query)) return false
    if (sp.country && source.countryCode !== sp.country) return false
    if (sp.level && collection.level !== sp.level) return false
    if (sp.subject && collection.subject !== sp.subject) return false
    if (sp.access && source.access !== sp.access) return false
    return true
  })
  const examAssets = rows.reduce((total, row) => total + (row.collection.assets?.filter((asset) => asset.kind === "exam").length ?? 0), 0)
  const hasFilters = Boolean(query || sp.country || sp.level || sp.subject || sp.access)

  return (
    <main className="mx-auto max-w-4xl px-4 py-8" dir="rtl">
      <Link href="/" className="text-sm text-muted-foreground transition hover:text-primary">→ الصفحة الرئيسية</Link>
      <section className="mt-4 border-b pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-indigo-500">مشروع عالمي جديد</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">🎓 أرشيف الاختبارات الجامعية</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">اختبارات الرياضيات من جامعات عالمية، مرتبة حسب الجامعة والمادة والمستوى والسنة، مع روابط رسمية وملفات PDF عندما تكون متاحة للعامة.</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-sm text-muted-foreground">
            <span><b className="block text-lg text-foreground">{GLOBAL_UNIVERSITY_EXAM_SOURCES.length}</b>جامعة</span>
            <span><b className="block text-lg text-foreground">{countries.length}</b>دول</span>
            <span><b className="block text-lg text-foreground">{rows.length}</b>مجموعة</span>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">تم التحقق من {examAssets} روابط PDF مباشرة في الدفعة الأولى، بينما تبقى المواد المحمية مرتبطة بأرشيف جامعتها دون نسخها.</p>
      </section>

      <form className="mt-5 border-b pb-5" method="get">
        <div className="flex items-center gap-3">
          <input name="q" defaultValue={sp.q ?? ""} placeholder="ابحث عن جامعة، مادة أو رمز مقرر…" className="min-h-11 min-w-0 flex-1 border-0 border-b border-border bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-indigo-500" />
          <button className="min-h-11 shrink-0 rounded-full bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-500">بحث</button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
          <select name="country" defaultValue={sp.country ?? ""} className={selectClass}>
            <option value="">🌍 كل الدول</option>
            {countries.map((code) => {
              const source = GLOBAL_UNIVERSITY_EXAM_SOURCES.find((item) => item.countryCode === code)!
              return <option key={code} value={code}>{source.countryAr}</option>
            })}
          </select>
          <select name="subject" defaultValue={sp.subject ?? ""} className={selectClass}>
            <option value="">📐 كل المواد</option>
            {subjects.map((subject) => <option key={subject} value={subject}>{UNIVERSITY_EXAM_SUBJECT_LABELS[subject] ?? subject}</option>)}
          </select>
          <select name="level" defaultValue={sp.level ?? ""} className={selectClass}>
            <option value="">🎓 كل المستويات</option>
            {Object.entries(UNIVERSITY_EXAM_LEVEL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select name="access" defaultValue={sp.access ?? ""} className={selectClass}>
            <option value="">🔓 كل طرق الوصول</option>
            {Object.entries(UNIVERSITY_EXAM_ACCESS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        {hasFilters && <Link href="/university-exams" className="mt-3 inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-destructive">✕ مسح الفلاتر</Link>}
      </form>

      <div className="mt-5 flex items-center justify-between text-sm">
        <h2 className="font-semibold">المجموعات المتاحة</h2>
        <span className="text-muted-foreground">{results.length} نتيجة</span>
      </div>
      {results.length === 0 ? <p className="py-16 text-center text-sm text-muted-foreground">لا توجد نتائج مطابقة — جرّب إزالة بعض الفلاتر.</p> : (
        <div className="mt-2 divide-y">
          {results.map(({ source, collection }) => (
            <article key={`${source.slug}-${collection.id}`} className="grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-sm font-semibold text-indigo-500">{source.countryAr}</span>
                  <span className="text-sm text-muted-foreground">{UNIVERSITY_EXAM_LEVEL_LABELS[collection.level]}</span>
                  <span className="text-sm text-muted-foreground">{collection.years}</span>
                </div>
                <h3 className="mt-2 text-sm font-bold">{collection.titleAr}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{source.nameAr}{collection.courseCode ? ` · ${collection.courseCode}` : ""} · {UNIVERSITY_EXAM_SUBJECT_LABELS[collection.subject] ?? collection.subject}</p>
                <p className="mt-1 text-sm text-muted-foreground">{collection.languages.join("، ")} · {UNIVERSITY_EXAM_ACCESS_LABELS[source.access]}{collection.assets?.length ? ` · ${collection.assets.length} ملفات مباشرة` : " · أرشيف رسمي"}</p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Link href={`/university-exams/${source.slug}`} className="font-medium text-indigo-500 hover:underline">صفحة الجامعة ←</Link>
                <a href={collection.archiveUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">المصدر ↗</a>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
