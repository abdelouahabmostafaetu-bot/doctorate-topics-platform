import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { MathContent } from "@/components/math-content"
import { ScribdExamViewer } from "@/components/topics/scribd-exam-viewer"
import {
  ensureExamPdfFromUrl,
  getExamDownloadUrl,
  getExamReadUrl,
} from "@/lib/exam-storage"
import {
  rasterizeExamPdf,
  signedExamPageManifest,
} from "@/lib/exam-page-images"
import {
  LANGUAGE_LABELS,
  SUBJECT_LABELS,
  getCompetitionEdition,
} from "@/data/world-competitions"

export const dynamic = "force-dynamic"
export const maxDuration = 300

type PreparedPdf = {
  azure: boolean
  viewUrl: string
  downloadUrl: string
  pages: Array<{ page: number; width: number; height: number; url: string }>
}

async function preparePdf(sourceUrl: string, blobName: string, fileName: string, reader: boolean): Promise<PreparedPdf> {
  try {
    const stored = await ensureExamPdfFromUrl(sourceUrl, blobName, fileName)
    let manifest = reader ? await signedExamPageManifest(stored.url) : null
    if (reader && !manifest) {
      await rasterizeExamPdf(stored.url)
      manifest = await signedExamPageManifest(stored.url)
    }
    return {
      azure: true,
      viewUrl: await getExamReadUrl(stored.url),
      downloadUrl: await getExamDownloadUrl(stored.url, fileName),
      pages: manifest?.pages ?? [],
    }
  } catch (error) {
    console.error(`[competitions] Azure copy failed for ${blobName}:`, error)
    return { azure: false, viewUrl: sourceUrl, downloadUrl: sourceUrl, pages: [] }
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; year: string }> }): Promise<Metadata> {
  const { slug, year } = await params
  const data = getCompetitionEdition(slug, Number(year))
  if (!data) return { title: "اختبار غير موجود" }
  return { title: `${data.competition.shortName} ${data.edition.year} — موضوع المسابقة`, description: data.competition.descriptionAr }
}

export default async function CompetitionEditionPage({ params }: { params: Promise<{ slug: string; year: string }> }) {
  const { slug, year: rawYear } = await params
  const data = getCompetitionEdition(slug, Number(rawYear))
  if (!data) notFound()
  const { competition, edition } = data

  const examAsset = edition.officialPdfUrl
    ? await preparePdf(
        edition.officialPdfUrl,
        `competitions/${competition.slug}/${edition.year}/${competition.slug}-${edition.year}-problems.pdf`,
        `${competition.slug}-${edition.year}-problems.pdf`,
        true,
      )
    : null
  const solutionAsset = edition.officialSolutionPdfUrl
    ? await preparePdf(
        edition.officialSolutionPdfUrl,
        `competitions/${competition.slug}/${edition.year}/${competition.slug}-${edition.year}-solutions.pdf`,
        `${competition.slug}-${edition.year}-solutions.pdf`,
        false,
      )
    : null

  return (
    <div>
      <div className="mx-auto max-w-4xl px-4 py-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href={`/competitions/${competition.slug}`} className="text-[11px] text-muted-foreground transition hover:text-primary">→ {competition.shortName} وكل السنوات</Link>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${examAsset?.azure ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
            {examAsset?.azure ? "محفوظ على Azure ✓" : edition.officialPdfUrl ? "نسخة PDF الرسمية" : "أرشيف المصدر الرسمي"}
          </span>
        </div>
        <h1 className="mt-4 text-xl font-bold">{competition.shortName} {edition.year} — موضوع المسابقة</h1>
        <p className="mt-2 text-sm text-muted-foreground">{competition.nameAr}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          {edition.problemsCount && <span className="rounded-full border px-2.5 py-1">{edition.problemsCount} مسائل</span>}
          {edition.durationMinutes && <span className="rounded-full border px-2.5 py-1">{edition.durationMinutes / 60} ساعات</span>}
          {edition.languages.map((language) => <span key={language} className="rounded-full border px-2.5 py-1">{LANGUAGE_LABELS[language] ?? language}</span>)}
          {edition.subjects.map((subject) => <span key={subject} className="rounded-full border px-2.5 py-1">{SUBJECT_LABELS[subject] ?? subject}</span>)}
        </div>
        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          {solutionAsset && <a href={solutionAsset.downloadUrl} target="_blank" rel="noopener noreferrer" className="rounded-full border border-primary/40 px-3 py-1.5 font-medium text-primary transition hover:bg-primary/5">تحميل الحلول الرسمية</a>}
          {edition.resultsUrl && <a href={edition.resultsUrl} target="_blank" rel="noopener noreferrer nofollow" className="rounded-full border px-3 py-1.5 transition hover:border-primary hover:text-primary">النتائج الرسمية ↗</a>}
          {edition.officialPdfUrl && <a href={edition.officialPdfUrl} target="_blank" rel="noopener noreferrer nofollow" className="rounded-full border px-3 py-1.5 transition hover:border-primary hover:text-primary">ملف المصدر الرسمي ↗</a>}
          {edition.officialProblemsUrl && <a href={edition.officialProblemsUrl} target="_blank" rel="noopener noreferrer nofollow" className="rounded-full border px-3 py-1.5 transition hover:border-primary hover:text-primary">صفحة مسائل الدورة ↗</a>}
        </div>
        {edition.officialPdfUrl && <p className="mt-4 text-[11px] leading-5 text-muted-foreground">هذا الاختبار متوفر بصيغة PDF رسمية؛ لذلك لم نعد كتابة محتواه بـ LaTeX حفاظًا على النسخة الأصلية ومنع أخطاء النسخ.</p>}
      </div>

      {examAsset?.pages.length ? (
        <ScribdExamViewer
          title={`${competition.shortName} ${edition.year}`}
          fileName={`${competition.slug}-${edition.year}-problems.pdf`}
          downloadUrl={examAsset.downloadUrl}
          sourceUrl={edition.officialPdfUrl}
          pages={examAsset.pages}
        />
      ) : examAsset ? (
        <div className="mx-auto max-w-4xl px-4 pb-10">
          <div className="rounded-xl border p-5 text-center">
            <p className="text-sm font-semibold">موضوع المسابقة بصيغة PDF</p>
            <p className="mt-2 text-xs text-muted-foreground">تعذّر تجهيز قارئ الصور حاليًا، لكن الملف الرسمي متاح للفتح أو التحميل.</p>
            <a href={examAsset.viewUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">فتح PDF</a>
          </div>
        </div>
      ) : edition.problemsMarkdown ? (
        <div className="mx-auto max-w-3xl px-4 pb-12"><MathContent content={edition.problemsMarkdown} /></div>
      ) : edition.officialProblemsUrl ? (
        <div className="mx-auto max-w-4xl px-4 pb-12">
          <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-6 text-center">
            <p className="text-sm font-semibold">مسائل هذه الدورة متوفرة في الأرشيف الرسمي</p>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">لم ننسخ المحتوى أو نحوله إلى LaTeX لأن ملف PDF مباشرًا غير متاح لدينا. افتح المصدر الرسمي للوصول إلى المسائل الأصلية.</p>
            <a href={edition.officialProblemsUrl} target="_blank" rel="noopener noreferrer nofollow" className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">فتح الأرشيف الرسمي ↗</a>
          </div>
        </div>
      ) : (
        <p className="px-4 py-16 text-center text-sm text-muted-foreground">لا يتوفر محتوى هذا الاختبار بعد.</p>
      )}
    </div>
  )
}
