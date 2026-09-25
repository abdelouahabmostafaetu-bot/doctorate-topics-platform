import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import {
  FORMAT_LABELS,
  LANGUAGE_LABELS,
  LEVEL_LABELS,
  PARTICIPATION_LABELS,
  REGION_LABELS,
  SCOPE_LABELS,
  getWorldCompetition,
} from "@/data/world-competitions"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const competition = getWorldCompetition(slug)
  if (!competition) return { title: "مسابقة غير موجودة" }
  return { title: `${competition.shortName} — ${competition.nameAr}`, description: competition.descriptionAr }
}

export default async function CompetitionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const competition = getWorldCompetition(slug)
  if (!competition) notFound()
  const editions = competition.editions.filter((edition) => edition.published).sort((a, b) => b.year - a.year)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/competitions" className="text-[11px] text-muted-foreground transition hover:text-primary">→ كل المسابقات</Link>
      <header className="mt-4 border-b pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-primary">{competition.shortName}</p>
            <h1 className="mt-1 text-xl font-bold">{competition.nameAr}</h1>
            <p className="mt-1 text-sm text-muted-foreground" dir="ltr">{competition.name}</p>
          </div>
          <a href={competition.officialUrl} target="_blank" rel="noopener noreferrer nofollow" className="rounded-full border px-3 py-1.5 text-xs transition hover:border-primary hover:text-primary">الموقع الرسمي ↗</a>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">{competition.descriptionAr}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
          {[LEVEL_LABELS[competition.level], SCOPE_LABELS[competition.scope], FORMAT_LABELS[competition.format], PARTICIPATION_LABELS[competition.participation], REGION_LABELS[competition.region] ?? competition.region, ...competition.languages.map((lang) => LANGUAGE_LABELS[lang] ?? lang)].map((label) => <span key={label} className="rounded-full border px-2.5 py-1 text-muted-foreground">{label}</span>)}
        </div>
      </header>

      <section className="mt-6">
        <h2 className="text-sm font-bold">الدورات المتوفرة</h2>
        <div className="mt-2 divide-y">
          {editions.map((edition) => (
            <Link key={edition.year} href={`/competitions/${competition.slug}/${edition.year}`} className="group flex items-center gap-3 py-4">
              <span className="w-14 text-sm font-bold text-primary">{edition.year}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium transition group-hover:text-primary">{edition.title}</span>
                <span className="mt-1 block text-[11px] text-muted-foreground">{edition.problemsCount ? `${edition.problemsCount} مسائل` : "موضوع المسابقة"}{edition.durationMinutes ? ` · ${edition.durationMinutes / 60} ساعات` : ""}{edition.officialPdfUrl ? " · PDF رسمي" : edition.problemsMarkdown ? " · داخل الموقع" : " · أرشيف رسمي خارجي"}{edition.officialSolutionPdfUrl || edition.solutionsMarkdown ? " · حلول" : ""}</span>
              </span>
              <span className="text-xs text-muted-foreground transition group-hover:-translate-x-0.5 group-hover:text-primary">←</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
