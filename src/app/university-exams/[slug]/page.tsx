import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import {
  getUniversityExamSource,
  UNIVERSITY_EXAM_ACCESS_LABELS,
  UNIVERSITY_EXAM_LEVEL_LABELS,
  UNIVERSITY_EXAM_SUBJECT_LABELS,
} from "@/data/university-exams"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const source = getUniversityExamSource(slug)
  return source ? { title: `${source.nameAr} — الاختبارات الجامعية`, description: source.descriptionAr } : { title: "الجامعة غير موجودة" }
}

export default async function UniversityExamSourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const source = getUniversityExamSource(slug)
  if (!source) notFound()
  const assetCount = source.collections.reduce((total, collection) => total + (collection.assets?.length ?? 0), 0)

  return (
    <main className="mx-auto max-w-3xl px-4 py-8" dir="rtl">
      <Link href="/university-exams" className="text-sm text-muted-foreground transition hover:text-primary">→ أرشيف الاختبارات الجامعية</Link>
      <header className="mt-4 border-b pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-indigo-500">{source.countryAr}{source.city ? ` · ${source.city}` : ""}</p>
            <h1 className="mt-1 text-2xl font-bold">{source.nameAr}</h1>
            <p className="mt-1 text-sm text-muted-foreground" dir="ltr">{source.name}</p>
          </div>
          <a href={source.officialUrl} target="_blank" rel="noopener noreferrer" className="rounded-full border border-indigo-500/40 px-4 py-2 text-sm font-medium text-indigo-500 transition hover:bg-indigo-500/10">الموقع الرسمي ↗</a>
        </div>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">{source.descriptionAr}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-muted px-2.5 py-1">{source.collections.length} مجموعات</span>
          <span className="rounded-full bg-muted px-2.5 py-1">{assetCount} ملفات مباشرة</span>
          <span className="rounded-full bg-muted px-2.5 py-1">{UNIVERSITY_EXAM_ACCESS_LABELS[source.access]}</span>
        </div>
        <p className="mt-3 text-sm leading-5 text-muted-foreground">حقوق المصدر: {source.copyrightNoteAr}</p>
      </header>

      <section className="mt-5">
        <h2 className="text-sm font-bold">المواد ومجموعات الاختبارات</h2>
        <div className="mt-2 divide-y">
          {source.collections.map((collection) => (
            <article key={collection.id} className="py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-indigo-500">{UNIVERSITY_EXAM_SUBJECT_LABELS[collection.subject] ?? collection.subject}</span>
                    <span>{UNIVERSITY_EXAM_LEVEL_LABELS[collection.level]}</span>
                    <span>{collection.years}</span>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold">{collection.titleAr}</h3>
                  <p className="mt-1 text-sm text-muted-foreground" dir="ltr">{collection.courseCode ? `${collection.courseCode} — ` : ""}{collection.title}</p>
                </div>
                <a href={collection.archiveUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-500 hover:underline">فتح الأرشيف الرسمي ↗</a>
              </div>
              {collection.assets?.length ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {collection.assets.map((asset) => (
                    <a key={`${asset.year}-${asset.kind}-${asset.url}`} href={asset.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl border bg-card min-h-11 px-3 py-2.5 text-sm transition hover:border-indigo-500/50">
                      <span><b className="text-foreground">{asset.label}</b><span className="mr-2 text-muted-foreground">{asset.year}</span></span>
                      <span className={asset.kind === "solution" ? "text-emerald-500" : "text-indigo-500"}>{asset.kind === "solution" ? "حل PDF" : "اختبار PDF"} ↗</span>
                    </a>
                  ))}
                </div>
              ) : <p className="mt-3 text-sm text-muted-foreground">الملفات متاحة من خلال أرشيف الجامعة الرسمي، وقد يتطلب بعضها تسجيل الدخول.</p>}
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
