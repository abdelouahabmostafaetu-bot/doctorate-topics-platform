import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, ChevronLeft, ExternalLink, Shapes } from "lucide-react";
import type { Metadata } from "next";
import { getUniversityExamSource, UNIVERSITY_EXAM_SUBJECT_LABELS } from "@/data/university-exams";
import { countryFlag, subjectsForSource, UNIVERSITY_EXAM_SUBJECT_ENGLISH } from "@/lib/university-exam-navigation";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const source = getUniversityExamSource((await params).slug);
  return source ? { title: `${source.nameAr} — مواد الرياضيات`, description: source.descriptionAr } : { title: "الجامعة غير موجودة" };
}

export default async function UniversityExamSourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const source = getUniversityExamSource((await params).slug);
  if (!source) notFound();
  const subjects = subjectsForSource(source);
  return (
    <main className="mx-auto max-w-3xl px-4 py-5 sm:py-6" dir="rtl" style={{ fontFamily: "var(--font-article), Amiri, Georgia, serif" }}>
      <nav className="mb-3 flex items-center gap-1.5 overflow-hidden text-[11px] text-muted-foreground">
        <Link href="/university-exams" className="shrink-0 transition hover:text-primary">الاختبارات</Link><ChevronLeft className="h-3 w-3 shrink-0" />
        <Link href={`/university-exams/country/${source.countryCode.toLowerCase()}`} className="shrink-0 transition hover:text-primary">{source.countryAr}</Link><ChevronLeft className="h-3 w-3 shrink-0" /><span className="truncate">{source.nameAr}</span>
      </nav>
      <section className="rounded-xl border border-primary/15 bg-gradient-to-l from-blue-500/[0.09] via-card to-amber-500/[0.045] p-3.5 shadow-[0_3px_16px_hsl(var(--primary)/0.045)]">
        <div className="flex items-start gap-3">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-primary"><BookOpen className="h-4 w-4" /><span className="absolute -bottom-1 -left-1 text-sm" aria-hidden>{countryFlag(source.countryCode)}</span></span>
          <div className="min-w-0 flex-1"><h1 className="text-base font-bold">{source.nameAr}</h1><p dir="ltr" className="mt-0.5 text-right text-xs text-muted-foreground">{source.name}</p><p className="mt-1 text-[9px] text-primary/80">اختر المادة لعرض الاختبارات مرتبة حسب السنة</p></div>
          <a href={source.officialUrl} target="_blank" rel="noopener noreferrer" title="الموقع الرسمي" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition hover:border-primary hover:text-primary"><ExternalLink className="h-3.5 w-3.5" /></a>
        </div>
      </section>
      <section className="mt-4 overflow-hidden rounded-lg border border-primary/15 bg-card shadow-[0_2px_12px_hsl(var(--primary)/0.04)]">
        <div className="flex items-center justify-between border-b border-primary/10 bg-gradient-to-l from-primary/[0.07] to-amber-500/[0.035] px-3 py-1.5 text-[10px] text-muted-foreground"><span>{subjects.length} مواد</span><span>اضغط لعرض الاختبارات</span></div>
        <div className="divide-y divide-primary/[0.08]">
          {subjects.map((subject) => (
            <Link key={subject.key} href={`/university-exams/${source.slug}/subject/${subject.key}`} className="group flex items-center gap-2.5 border-r-2 border-r-transparent px-3 py-2.5 transition hover:border-r-primary hover:bg-primary/[0.035]">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-primary transition group-hover:bg-primary group-hover:text-primary-foreground"><Shapes className="h-3.5 w-3.5" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{UNIVERSITY_EXAM_SUBJECT_LABELS[subject.key] || subject.key}</span><span dir="ltr" className="block text-right text-[10px] text-muted-foreground">{UNIVERSITY_EXAM_SUBJECT_ENGLISH[subject.key] || subject.key}</span></span>
              <span className="rounded-full border border-primary/10 bg-primary/[0.04] px-2 py-0.5 text-[9px] text-muted-foreground">{subject.examCount ? `${subject.examCount} اختبار` : `${subject.collections.length} أرشيف`}</span>
              <ChevronLeft className="h-4 w-4 text-muted-foreground/50 transition group-hover:-translate-x-0.5 group-hover:text-primary" />
            </Link>
          ))}
        </div>
      </section>
      <p className="mt-4 text-center text-[10px] leading-5 text-muted-foreground">{source.descriptionAr}</p>
    </main>
  );
}
