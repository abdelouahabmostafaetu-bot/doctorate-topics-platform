import Link from "next/link"
import type { Metadata } from "next"
import {
  FORMAT_LABELS,
  LANGUAGE_LABELS,
  LEVEL_LABELS,
  PARTICIPATION_LABELS,
  REGION_LABELS,
  SCOPE_LABELS,
  SUBJECT_LABELS,
  WORLD_COMPETITIONS,
} from "@/data/world-competitions"

export const metadata: Metadata = {
  title: "مسابقات رياضيات حول العالم",
  description: "ابحث في الأولمبيادات والمسابقات الجامعية ومسابقات النمذجة الرياضية حسب السنة والمستوى والمنطقة واللغة.",
}

type SearchParams = {
  q?: string
  competition?: string
  year?: string
  level?: string
  scope?: string
  format?: string
  participation?: string
  region?: string
  language?: string
  subject?: string
  material?: string
}

const selectClass =
  "max-w-[44vw] cursor-pointer border-0 border-b border-border bg-transparent px-1 py-1 text-xs text-foreground transition focus:border-primary focus:outline-none sm:max-w-[220px]"

function unique(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b))
}

export default async function CompetitionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const query = (sp.q ?? "").trim().toLocaleLowerCase()
  const rows = WORLD_COMPETITIONS.flatMap((competition) =>
    competition.editions
      .filter((edition) => edition.published)
      .map((edition) => ({ competition, edition })),
  )

  const years = unique(rows.map(({ edition }) => String(edition.year))).sort((a, b) => Number(b) - Number(a))
  const regions = unique(WORLD_COMPETITIONS.map((item) => item.region))
  const languages = unique(rows.flatMap(({ edition }) => edition.languages))
  const subjects = unique(rows.flatMap(({ edition }) => edition.subjects))

  const results = rows.filter(({ competition, edition }) => {
    const haystack = [competition.shortName, competition.name, competition.nameAr, competition.descriptionAr, edition.title, ...edition.subjects.map((subject) => SUBJECT_LABELS[subject] ?? subject)].join(" ").toLocaleLowerCase()
    if (query && !haystack.includes(query)) return false
    if (sp.competition && competition.slug !== sp.competition) return false
    if (sp.year && String(edition.year) !== sp.year) return false
    if (sp.level && competition.level !== sp.level) return false
    if (sp.scope && competition.scope !== sp.scope) return false
    if (sp.format && competition.format !== sp.format) return false
    if (sp.participation && competition.participation !== sp.participation) return false
    if (sp.region && competition.region !== sp.region) return false
    if (sp.language && !edition.languages.includes(sp.language)) return false
    if (sp.subject && !edition.subjects.includes(sp.subject)) return false
    if (sp.material === "pdf" && !edition.officialPdfUrl) return false
    if (sp.material === "solutions" && !edition.officialSolutionPdfUrl && !edition.solutionsMarkdown) return false
    if (sp.material === "results" && !edition.resultsUrl) return false
    if (sp.material === "markdown" && !edition.problemsMarkdown) return false
    return true
  })

  const hasAdvanced = Boolean(sp.level || sp.scope || sp.format || sp.participation || sp.region || sp.language || sp.subject || sp.material)
  const hasAnyFilter = Boolean(query || sp.competition || sp.year || hasAdvanced)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="block text-[11px] text-muted-foreground transition hover:text-primary">→ الصفحة الرئيسية</Link>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-base font-bold">🌍 مسابقات رياضيات حول العالم</h1>
          <p className="mt-1 text-[11px] text-muted-foreground">أرشيف تجريبي يتوسع تدريجيًا من المصادر الرسمية</p>
        </div>
        <p className="text-[11px] text-muted-foreground">{results.length} نتيجة</p>
      </div>

      <form method="get" action="/competitions" className="mt-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="ابحث باسم المسابقة أو المجال…"
            className="min-w-[210px] flex-1 border-0 border-b border-border bg-transparent px-1 py-1 text-xs outline-none transition placeholder:text-muted-foreground focus:border-primary"
          />
          <select name="competition" defaultValue={sp.competition ?? ""} className={selectClass} aria-label="المسابقة">
            <option value="">🏅 كل المسابقات</option>
            {WORLD_COMPETITIONS.map((item) => <option key={item.slug} value={item.slug}>{item.shortName} — {item.nameAr}</option>)}
          </select>
          <select name="year" defaultValue={sp.year ?? ""} className={selectClass} aria-label="السنة">
            <option value="">📅 كل السنوات</option>
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          <button type="submit" className="rounded-full bg-primary px-4 py-1 text-[11px] font-medium text-primary-foreground transition hover:opacity-90">🔍 بحث</button>
          {hasAnyFilter && <Link href="/competitions" className="text-[11px] text-muted-foreground transition hover:text-destructive">✕ مسح</Link>}
        </div>

        <details className="mt-3 border-t pt-2" open={hasAdvanced}>
          <summary className="cursor-pointer select-none text-[11px] font-medium text-muted-foreground hover:text-primary">⚙️ مزيد من الفلاتر</summary>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-3">
            <select name="level" defaultValue={sp.level ?? ""} className={selectClass}><option value="">🎓 كل المستويات</option>{Object.entries(LEVEL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select name="scope" defaultValue={sp.scope ?? ""} className={selectClass}><option value="">🗺️ كل النطاقات</option>{Object.entries(SCOPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select name="format" defaultValue={sp.format ?? ""} className={selectClass}><option value="">🧮 كل الأنواع</option>{Object.entries(FORMAT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select name="participation" defaultValue={sp.participation ?? ""} className={selectClass}><option value="">👤 كل طرق المشاركة</option>{Object.entries(PARTICIPATION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select name="region" defaultValue={sp.region ?? ""} className={selectClass}><option value="">🌐 كل المناطق</option>{regions.map((value) => <option key={value} value={value}>{REGION_LABELS[value] ?? value}</option>)}</select>
            <select name="language" defaultValue={sp.language ?? ""} className={selectClass}><option value="">🗣️ كل اللغات</option>{languages.map((value) => <option key={value} value={value}>{LANGUAGE_LABELS[value] ?? value}</option>)}</select>
            <select name="subject" defaultValue={sp.subject ?? ""} className={selectClass}><option value="">📐 كل المجالات</option>{subjects.map((value) => <option key={value} value={value}>{SUBJECT_LABELS[value] ?? value}</option>)}</select>
            <select name="material" defaultValue={sp.material ?? ""} className={selectClass}>
              <option value="">📁 كل المواد</option>
              <option value="pdf">PDF رسمي</option>
              <option value="solutions">حلول متوفرة</option>
              <option value="results">نتائج متوفرة</option>
              <option value="markdown">مسائل مكتوبة داخل الموقع</option>
            </select>
          </div>
        </details>
      </form>

      <div className="mt-4 h-px bg-gradient-to-l from-primary/40 via-border to-transparent" />
      {results.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">لا توجد مسابقات مطابقة — جرّب إزالة بعض الفلاتر.</p>
      ) : (
        <div className="mt-1 divide-y">
          {results.map(({ competition, edition }) => (
            <Link key={`${competition.slug}-${edition.year}`} href={`/competitions/${competition.slug}/${edition.year}`} className="group flex items-center gap-3 py-4">
              <span className="w-14 shrink-0 text-center"><span className="block text-sm font-bold text-primary">{edition.year}</span><span className="text-[10px] font-semibold text-muted-foreground">{competition.shortName}</span></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold transition group-hover:text-primary">{competition.nameAr}</span>
                <span className="mt-1 block text-[11px] leading-5 text-muted-foreground">
                  {LEVEL_LABELS[competition.level]} · {SCOPE_LABELS[competition.scope]} · {FORMAT_LABELS[competition.format]} · {PARTICIPATION_LABELS[competition.participation]}
                </span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground">
                  {edition.problemsCount ? `${edition.problemsCount} مسائل` : "عدد المسائل غير محدد"} · {edition.languages.map((lang) => LANGUAGE_LABELS[lang] ?? lang).join("، ")} · {edition.officialPdfUrl ? "PDF رسمي" : "Markdown"}{edition.officialSolutionPdfUrl || edition.solutionsMarkdown ? " · حلول متوفرة" : ""}
                </span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground transition group-hover:-translate-x-0.5 group-hover:text-primary">←</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
