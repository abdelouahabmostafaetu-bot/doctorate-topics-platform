import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ChevronLeft, ExternalLink, FileCheck2, FileText } from "lucide-react";
import type { Metadata } from "next";
import { getUniversityExamSource, UNIVERSITY_EXAM_LEVEL_LABELS, UNIVERSITY_EXAM_SUBJECT_LABELS } from "@/data/university-exams";
import { countryFlag, UNIVERSITY_EXAM_SUBJECT_ENGLISH } from "@/lib/university-exam-navigation";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; subject: string }> }): Promise<Metadata> {
  const { slug, subject } = await params;
  const source = getUniversityExamSource(slug);
  return source ? { title: `${UNIVERSITY_EXAM_SUBJECT_LABELS[subject] || subject} — ${source.nameAr}`, description: `اختبارات ${UNIVERSITY_EXAM_SUBJECT_LABELS[subject] || subject} في ${source.nameAr}.` } : { title: "المادة غير موجودة" };
}

export default async function UniversityExamSubjectPage({ params }: { params: Promise<{ slug: string; subject: string }> }) {
  const { slug, subject } = await params;
  const source = getUniversityExamSource(slug);
  if (!source) notFound();
  const collections = source.collections.filter((collection) => collection.subject === subject);
  if (!collections.length) notFound();
  const directExams = collections.flatMap((collection) => (collection.assets || []).map((asset, assetIndex) => ({ collection, asset, assetIndex }))).sort((a, b) => b.asset.year - a.asset.year || (a.asset.kind === "exam" ? -1 : 1));
  let examNumber = 0;
  let solutionNumber = 0;

  return (
    <main className="mx-auto max-w-3xl px-4 py-5 sm:py-6" dir="rtl" style={{ fontFamily: "var(--font-article), Amiri, Georgia, serif" }}>
      <nav className="mb-3 flex items-center gap-1.5 overflow-hidden text-[11px] text-muted-foreground"><Link href="/university-exams" className="shrink-0 hover:text-primary">الاختبارات</Link><ChevronLeft className="h-3 w-3 shrink-0" /><Link href={`/university-exams/${source.slug}`} className="max-w-[145px] truncate hover:text-primary">{source.nameAr}</Link><ChevronLeft className="h-3 w-3 shrink-0" /><span className="truncate">{UNIVERSITY_EXAM_SUBJECT_LABELS[subject] || subject}</span></nav>
      <section className="rounded-xl border border-primary/15 bg-gradient-to-l from-blue-500/[0.09] via-card to-amber-500/[0.045] p-3.5 shadow-[0_3px_16px_hsl(var(--primary)/0.045)]">
        <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm"><FileText className="h-4 w-4" /></span><div className="min-w-0 flex-1"><h1 className="text-base font-bold">{UNIVERSITY_EXAM_SUBJECT_LABELS[subject] || subject}</h1><p dir="ltr" className="mt-0.5 text-right text-xs text-muted-foreground">{UNIVERSITY_EXAM_SUBJECT_ENGLISH[subject] || subject}</p><p className="mt-1 text-[9px] text-primary/80">{countryFlag(source.countryCode)} {source.nameAr} · {directExams.length} ملفات مباشرة</p></div></div>
      </section>

      {directExams.length > 0 && (
        <section className="mt-4 overflow-hidden rounded-lg border border-primary/15 bg-card shadow-[0_2px_12px_hsl(var(--primary)/0.04)]">
          <div className="flex items-center justify-between border-b border-primary/10 bg-gradient-to-l from-primary/[0.07] to-amber-500/[0.035] px-3 py-1.5 text-[10px] text-muted-foreground"><span>الاختبارات حسب السنوات</span><span>اضغط لقراءة PDF</span></div>
          <div className="divide-y divide-primary/[0.08]">
            {directExams.map(({ collection, asset, assetIndex }) => {
              const number = asset.kind === "solution" ? ++solutionNumber : ++examNumber;
              return (
                <Link key={`${collection.id}-${assetIndex}-${asset.url}`} href={`/university-exams/${source.slug}/subject/${subject}/read/${collection.id}/${assetIndex}`} className="group flex items-center gap-2.5 border-r-2 border-r-transparent px-3 py-2.5 transition hover:border-r-primary hover:bg-primary/[0.035]">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${asset.kind === "solution" ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary"}`}>{asset.kind === "solution" ? <FileCheck2 className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}</span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{asset.kind === "solution" ? `حل ${number}` : `اختبار ${number}`}</span><span className="block truncate text-[10px] text-muted-foreground">{asset.label} · {collection.titleAr}</span></span>
                  <span className="rounded-full border border-primary/10 bg-primary/[0.04] px-2 py-0.5 text-[10px] font-semibold text-primary">{asset.year}</span><ChevronLeft className="h-4 w-4 text-muted-foreground/50 transition group-hover:-translate-x-0.5 group-hover:text-primary" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="mt-4">
        <div className="mb-2 flex items-center gap-2 px-1"><Archive className="h-4 w-4 text-primary" /><h2 className="text-sm font-bold">أرشيفات المقررات الرسمية</h2></div>
        <div className="divide-y border-y">
          {collections.map((collection) => (
            <a key={collection.id} href={collection.archiveUrl} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2.5 py-3">
              <span className="min-w-0 flex-1"><span className="block text-xs font-semibold transition group-hover:text-primary">{collection.titleAr}</span><span dir="ltr" className="mt-0.5 block truncate text-right text-[10px] text-muted-foreground">{collection.courseCode ? `${collection.courseCode} — ` : ""}{collection.title}</span><span className="mt-1 block text-[9px] text-muted-foreground">{UNIVERSITY_EXAM_LEVEL_LABELS[collection.level]} · {collection.years}</span></span><ExternalLink className="h-3.5 w-3.5 text-muted-foreground/60 transition group-hover:text-primary" />
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
