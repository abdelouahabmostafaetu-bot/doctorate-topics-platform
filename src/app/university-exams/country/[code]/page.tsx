import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, ChevronLeft, FileText, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { countryFlag, directAssetCount, getUniversityExamCountry } from "@/lib/university-exam-navigation";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const country = getUniversityExamCountry((await params).code);
  return country ? { title: `جامعات ${country.nameAr} — الاختبارات الجامعية`, description: `اختبارات الرياضيات من جامعات ${country.nameAr}.` } : { title: "الدولة غير موجودة" };
}

export default async function UniversityExamCountryPage({ params }: { params: Promise<{ code: string }> }) {
  const country = getUniversityExamCountry((await params).code);
  if (!country) notFound();
  return (
    <main className="mx-auto max-w-3xl px-4 py-5 sm:py-6" dir="rtl" style={{ fontFamily: "var(--font-article), Amiri, Georgia, serif" }}>
      <nav className="mb-3 flex items-center gap-1.5 text-[11px] text-muted-foreground"><Link href="/university-exams" className="transition hover:text-primary">الاختبارات الجامعية</Link><ChevronLeft className="h-3 w-3" /><span>{country.nameAr}</span></nav>
      <section className="rounded-xl border border-primary/15 bg-gradient-to-l from-blue-500/[0.09] via-card to-amber-500/[0.045] p-3.5 shadow-[0_3px_16px_hsl(var(--primary)/0.045)]">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-2xl shadow-sm ring-1 ring-black/5 dark:bg-secondary" aria-hidden="true">{countryFlag(country.code)}</span>
          <div className="min-w-0 flex-1"><h1 className="truncate text-base font-bold">{country.nameAr}</h1><p dir="ltr" className="mt-0.5 text-right text-xs text-muted-foreground">{country.name}</p><p className="mt-1 text-[9px] text-primary/80">{country.universities.length} جامعة · {country.collections} مادة ومجموعة</p></div>
        </div>
      </section>
      <section className="mt-4 overflow-hidden rounded-lg border border-primary/15 bg-card shadow-[0_2px_12px_hsl(var(--primary)/0.04)]">
        <div className="flex items-center justify-between border-b border-primary/10 bg-gradient-to-l from-primary/[0.07] to-amber-500/[0.035] px-3 py-1.5 text-[10px] text-muted-foreground"><span>جامعات {country.nameAr}</span><span>اختر الجامعة</span></div>
        <div className="divide-y divide-primary/[0.08]">
          {country.universities.map((university) => {
            const files = directAssetCount(university);
            return (
              <Link key={university.slug} href={`/university-exams/${university.slug}`} className="group flex items-center gap-2.5 border-r-2 border-r-transparent px-3 py-2.5 transition hover:border-r-primary hover:bg-primary/[0.035]">
                <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-primary"><Building2 className="h-4 w-4" /><span className="absolute -bottom-1 -left-1 text-sm" aria-hidden="true">{countryFlag(country.code)}</span></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{university.nameAr}</span><span className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">{university.city && <><MapPin className="h-2.5 w-2.5" />{university.city}<span>·</span></>}{university.collections.length} مادة</span></span>
                {files > 0 && <span className="flex items-center gap-1 rounded-full border border-primary/10 bg-primary/[0.04] px-2 py-0.5 text-[9px] text-muted-foreground"><FileText className="h-2.5 w-2.5" />{files} ملف</span>}
                <ChevronLeft className="h-4 w-4 text-muted-foreground/50 transition group-hover:-translate-x-0.5 group-hover:text-primary" />
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
