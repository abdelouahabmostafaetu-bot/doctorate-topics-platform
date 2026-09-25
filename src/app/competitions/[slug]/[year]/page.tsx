import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { MathContent } from "@/components/math-content"
import { ScribdExamViewer } from "@/components/topics/scribd-exam-viewer"
import { resolveCompetitionAssets } from "@/lib/competition-archive"
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

async function preparePdf(sourceUrl: string, blobName: string, fileName: string): Promise<PreparedPdf> {
  try {
    const stored = await ensureExamPdfFromUrl(sourceUrl, blobName, fileName)
    let manifest = await signedExamPageManifest(stored.url)
    if (!manifest) {
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

export default async function CompetitionEditionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; year: string }>
  searchParams: Promise<{ asset?: string }>
}) {
  const [{ slug, year: rawYear }, sp] = await Promise.all([params, searchParams])
  const data = getCompetitionEdition(slug, Number(rawYear))
  if (!data) notFound()
  const { competition, edition } = data

  const assets = await resolveCompetitionAssets(competition, edition)
  const requestedAsset = Number.parseInt(sp.asset ?? "0", 10)
  const selectedIndex = Math.min(Math.max(Number.isFinite(requestedAsset) ? requestedAsset : 0, 0), Math.max(assets.length - 1, 0))
  const selectedAsset = assets[selectedIndex] ?? null
  const fileName = selectedAsset ? `${competition.slug}-${edition.year}-${selectedAsset.kind}-${selectedIndex + 1}.pdf` : ""
  const preparedAsset = selectedAsset
    ? await preparePdf(
        selectedAsset.url,
        `competitions/${competition.slug}/${edition.year}/${fileName}`,
        fileName,
      )
    : null

  return (
    <div>
      <div className="mx-auto max-w-4xl px-4 py-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href={`/competitions/${competition.slug}`} className="text-[11px] text-muted-foreground transition hover:text-primary">→ {competition.shortName} وكل السنوات</Link>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${preparedAsset?.azure ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
            {preparedAsset?.azure ? "محفوظ على Azure ✓" : selectedAsset ? "ملف رسمي" : "أرشيف المصدر الرسمي"}
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

        {assets.length > 0 && (
          <section className="mt-5 rounded-xl border border-primary/15 bg-primary/[0.02] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-bold">📚 ملفات الدورة الرسمية</h2>
              <span className="text-[10px] text-muted-foreground">{assets.length} {assets.length === 1 ? "ملف" : "ملفات"}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {assets.map((asset, index) => (
                <Link
                  key={`${asset.url}-${index}`}
                  href={`/competitions/${competition.slug}/${edition.year}?asset=${index}`}
                  className={`rounded-full border px-3 py-1.5 text-[11px] transition ${index === selectedIndex ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary hover:text-primary"}`}
                >
                  {asset.kind === "solutions" ? "✅" : asset.kind === "problems" ? "📄" : "📎"} {asset.label}
                </Link>
              ))}
            </div>
            {assets.some((asset) => asset.source === "discovered") && <p className="mt-2 text-[10px] text-muted-foreground">تم اكتشاف الروابط والتحقق منها من صفحة الأرشيف الرسمية.</p>}
          </section>
        )}

        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          {preparedAsset && <a href={preparedAsset.downloadUrl} target="_blank" rel="noopener noreferrer" className="rounded-full border border-primary/40 px-3 py-1.5 font-medium text-primary transition hover:bg-primary/5">تحميل الملف المختار</a>}
          {edition.resultsUrl && <a href={edition.resultsUrl} target="_blank" rel="noopener noreferrer nofollow" className="rounded-full border px-3 py-1.5 transition hover:border-primary hover:text-primary">النتائج الرسمية ↗</a>}
          {edition.officialProblemsUrl && <a href={edition.officialProblemsUrl} target="_blank" rel="noopener noreferrer nofollow" className="rounded-full border px-3 py-1.5 transition hover:border-primary hover:text-primary">صفحة الأرشيف الرسمية ↗</a>}
        </div>
        {selectedAsset && <p className="mt-4 text-[11px] leading-5 text-muted-foreground">الملف معروض بنسخته الرسمية؛ لذلك لم نعد كتابة محتواه بـ LaTeX حفاظًا على النص والرسومات الأصلية.</p>}
      </div>

      {preparedAsset?.pages.length && selectedAsset ? (
        <ScribdExamViewer
          title={`${competition.shortName} ${edition.year} — ${selectedAsset.label}`}
          fileName={fileName}
          downloadUrl={preparedAsset.downloadUrl}
          sourceUrl={selectedAsset.url}
          pages={preparedAsset.pages}
        />
      ) : preparedAsset ? (
        <div className="mx-auto max-w-4xl px-4 pb-10">
          <div className="rounded-xl border p-5 text-center">
            <p className="text-sm font-semibold">الملف الرسمي متاح بصيغة PDF</p>
            <p className="mt-2 text-xs text-muted-foreground">تعذّر تجهيز قارئ الصور حاليًا، لكن الملف متاح للفتح أو التحميل.</p>
            <a href={preparedAsset.viewUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">فتح PDF</a>
          </div>
        </div>
      ) : edition.problemsMarkdown ? (
        <div className="mx-auto max-w-3xl px-4 pb-12"><MathContent content={edition.problemsMarkdown} /></div>
      ) : edition.officialProblemsUrl ? (
        <div className="mx-auto max-w-4xl px-4 pb-12">
          <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-6 text-center">
            <p className="text-sm font-semibold">لم نجد ملف PDF مباشرًا في الصفحة الرسمية</p>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">قد يكون المحتوى معروضًا كصفحة HTML، أو يحتاج اختيار اللغة أو الجولة داخل موقع المسابقة.</p>
            <a href={edition.officialProblemsUrl} target="_blank" rel="noopener noreferrer nofollow" className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">فتح صفحة الدورة الرسمية ↗</a>
          </div>
        </div>
      ) : (
        <p className="px-4 py-16 text-center text-sm text-muted-foreground">لا يتوفر محتوى هذا الاختبار بعد.</p>
      )}
    </div>
  )
}
