import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { UNIVERSITY_EXAM_SUBJECT_LABELS } from "@/data/university-exams";
import { findUniversityExamAsset } from "@/lib/university-exam-asset";
import { UniversityExamReader } from "@/components/university-exams/university-exam-reader";

type Params = { slug: string; subject: string; collection: string; asset: string };
function findAsset(params: Params) { return findUniversityExamAsset(params.slug, params.collection, params.asset, params.subject); }
export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const found = findAsset(await params);
  return found.asset && found.source ? { title: `${found.asset.label} ${found.asset.year} — ${found.source.nameAr}`, description: "قراءة الاختبار الجامعي الرسمي داخل الموقع مع التكبير وعرض الصفحات." } : { title: "الاختبار غير موجود" };
}
export default async function UniversityExamPdfReader({ params }: { params: Promise<Params> }) {
  const route = await params;
  const { source, collection, asset } = findAsset(route);
  if (!source || !collection || !asset) notFound();
  const subjectLabel = UNIVERSITY_EXAM_SUBJECT_LABELS[route.subject] || route.subject;
  const backQuery = new URLSearchParams({ country: source.countryCode.toLowerCase(), university: source.slug, subject: collection.subject, year: String(asset.year), kind: asset.kind });
  return (
    <main className="mx-auto max-w-5xl px-4 py-6" dir="rtl">
      <Link href={`/university-exams?${backQuery}`} className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowRight className="h-4 w-4" />اختبارات {source.nameAr}</Link>
      <header className="mb-4 mt-2 flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div className="min-w-0 flex-1"><h1 className="text-lg font-bold leading-7">{collection.titleAr} — {asset.year}</h1><p className="mt-1 text-sm leading-6 text-muted-foreground"><bdi>{asset.label}</bdi> · {source.nameAr} · {subjectLabel}</p></div>
        <a href={asset.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md border px-3 text-sm text-muted-foreground hover:border-primary hover:text-primary"><ExternalLink className="h-4 w-4" />المصدر الرسمي</a>
      </header>
      <UniversityExamReader source={source.slug} collection={collection.id} asset={route.asset} title={`${collection.titleAr} · ${asset.label} · ${asset.year}`} sourceUrl={asset.url} />
      <p className="mt-4 text-sm leading-6 text-muted-foreground">{source.copyrightNoteAr}</p>
    </main>
  );
}
