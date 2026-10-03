import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Download, ExternalLink, FileText } from "lucide-react";
import type { Metadata } from "next";
import { getUniversityExamSource, UNIVERSITY_EXAM_SUBJECT_LABELS } from "@/data/university-exams";

type Params = { slug: string; subject: string; collection: string; asset: string };
function findAsset(params: Params) {
  const source = getUniversityExamSource(params.slug);
  const collection = source?.collections.find((item) => item.id === params.collection && item.subject === params.subject);
  const index = Number.parseInt(params.asset, 10);
  const asset = Number.isInteger(index) && index >= 0 ? collection?.assets?.[index] : null;
  return { source, collection, asset };
}
export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const found = findAsset(await params);
  return found.asset && found.source ? { title: `${found.asset.label} ${found.asset.year} — ${found.source.nameAr}`, description: "قراءة ملف الاختبار الجامعي الرسمي بصيغة PDF." } : { title: "الاختبار غير موجود" };
}
export default async function UniversityExamPdfReader({ params }: { params: Promise<Params> }) {
  const route = await params;
  const { source, collection, asset } = findAsset(route);
  if (!source || !collection || !asset) notFound();
  const subjectLabel = UNIVERSITY_EXAM_SUBJECT_LABELS[route.subject] || route.subject;
  const query = new URLSearchParams({
    source: source.slug,
    collection: collection.id,
    asset: route.asset,
  });
  const pdfUrl = `/api/university-exams/pdf?${query.toString()}#toolbar=1&navpanes=0&view=FitH`;
  return (
    <main className="mx-auto max-w-6xl px-3 py-4 sm:px-5" dir="rtl" style={{ fontFamily: "var(--font-article), Amiri, Georgia, serif" }}>
      <nav className="flex items-center gap-1.5 overflow-hidden text-[10px] text-muted-foreground"><Link href="/university-exams" className="shrink-0 hover:text-primary">الاختبارات</Link><ChevronLeft className="h-3 w-3 shrink-0" /><Link href={`/university-exams/${source.slug}`} className="max-w-[110px] truncate hover:text-primary">{source.nameAr}</Link><ChevronLeft className="h-3 w-3 shrink-0" /><Link href={`/university-exams/${source.slug}/subject/${route.subject}`} className="shrink-0 hover:text-primary">{subjectLabel}</Link><ChevronLeft className="h-3 w-3 shrink-0" /><span className="truncate">{asset.label}</span></nav>
      <header className="mt-3 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex min-w-0 items-center gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"><FileText className="h-4 w-4" /></span><div className="min-w-0"><h1 className="truncate text-sm font-bold">{asset.kind === "solution" ? "حل الاختبار" : "الاختبار"} — {asset.year}</h1><p className="mt-0.5 truncate text-[10px] text-muted-foreground">{asset.label} · {source.nameAr} · {collection.titleAr}</p></div></div>
        <div className="flex items-center gap-2 text-[10px]"><a href={asset.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 transition hover:border-primary hover:text-primary"><ExternalLink className="h-3 w-3" />فتح خارجي</a><a href={asset.url} download className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 font-semibold text-primary-foreground transition hover:opacity-90"><Download className="h-3 w-3" />تحميل</a></div>
      </header>
      <section className="mt-3 overflow-hidden rounded-lg border bg-card"><iframe src={pdfUrl} title={`${asset.label} ${asset.year}`} className="h-[72vh] min-h-[520px] w-full bg-white sm:h-[78vh]" referrerPolicy="strict-origin-when-cross-origin" /></section>
      <p className="mt-2 text-center text-[9px] text-muted-foreground">تُقرأ النسخة الرسمية داخل الموقع؛ استخدم «فتح خارجي» إذا كان المصدر متوقفًا مؤقتًا.</p>
    </main>
  );
}
