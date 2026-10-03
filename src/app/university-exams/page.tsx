import Link from "next/link";
import { BookOpenCheck, ChevronLeft, Globe2 } from "lucide-react";
import type { Metadata } from "next";
import { countryFlag, universityExamCountries } from "@/lib/university-exam-navigation";

export const metadata: Metadata = {
  title: "الاختبارات الجامعية حسب الدولة",
  description: "اختر الدولة ثم الجامعة والمادة والسنة لقراءة اختبارات الرياضيات بصيغة PDF.",
};

export default function UniversityExamsPage() {
  const countries = universityExamCountries();
  const universityCount = countries.reduce((total, country) => total + country.universities.length, 0);
  return (
    <main className="mx-auto max-w-3xl px-4 py-5 sm:py-6" dir="rtl" style={{ fontFamily: "var(--font-article), Amiri, Georgia, serif" }}>
      <section className="relative overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-l from-blue-500/[0.10] via-card to-amber-500/[0.06] px-3.5 py-3 shadow-[0_3px_18px_hsl(var(--primary)/0.05)]">
        <div className="absolute -left-5 -top-8 h-20 w-20 rounded-full bg-amber-400/10 blur-xl" />
        <div className="relative flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-blue-500 text-primary-foreground shadow-sm"><BookOpenCheck className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold leading-6">الاختبارات الجامعية</h1>
            <p className="text-[11px] leading-5 text-muted-foreground">اختر الدولة، ثم الجامعة والمادة، وصولًا إلى اختبار السنة.</p>
          </div>
        </div>
        <div className="relative mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-primary/10 pt-2 text-[10px] text-primary/80">
          <Globe2 className="h-3 w-3 text-amber-500" />
          <span>{countries.length} دول</span><span className="text-muted-foreground/70">{universityCount} جامعة عالمية</span><span className="text-muted-foreground/70">ملفات رسمية تُضاف تدريجيًا</span>
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-lg border border-primary/15 bg-card shadow-[0_2px_12px_hsl(var(--primary)/0.04)]">
        <div className="flex items-center justify-between border-b border-primary/10 bg-gradient-to-l from-primary/[0.07] to-amber-500/[0.035] px-3 py-1.5 text-[10px] text-muted-foreground"><span>الدول المتاحة</span><span>اضغط لعرض الجامعات</span></div>
        <div className="divide-y divide-primary/[0.08]">
          {countries.map((country) => (
            <Link key={country.code} href={`/university-exams/country/${country.code.toLowerCase()}`} className="group flex items-center gap-2.5 border-r-2 border-r-transparent px-3 py-2.5 transition hover:border-r-primary hover:bg-primary/[0.035]">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-xl shadow-sm" aria-hidden="true">{countryFlag(country.code)}</span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{country.nameAr}</span><span dir="ltr" className="block text-right text-[10px] text-muted-foreground">{country.name}</span></span>
              <span className="rounded-full border border-primary/10 bg-primary/[0.04] px-2 py-0.5 text-[9px] text-muted-foreground">{country.universities.length} جامعة</span>
              <ChevronLeft className="h-4 w-4 text-muted-foreground/50 transition group-hover:-translate-x-0.5 group-hover:text-primary" />
            </Link>
          ))}
        </div>
      </section>
      <p className="mt-4 text-center text-[10px] text-muted-foreground">تظهر الدول التي أُضيفت لها مصادر جامعية موثوقة فقط.</p>
    </main>
  );
}
