import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Building2, ChevronLeft, GraduationCap, Layers3 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { LEVELS } from "@/lib/lectures";
import { UniversityLogo } from "@/components/lectures/university-logo";
import { getCncProgramsForLevel, getCncSummary } from "@/lib/cnc-math-catalog";

export const dynamic = "force-dynamic";

export default async function UniversityLevelsPage({ params }: { params: Promise<{ univ: string }> }) {
  const { univ } = await params;
  const university = await prisma.university.findUnique({ where: { slug: univ } });
  if (!university) notFound();

  const counts = await prisma.module.groupBy({
    by: ["level"],
    where: { universityId: university.id },
    _count: { _all: true },
  });
  const countFor = (value: string) => counts.find((c: { level: string; _count: { _all: number } }) => c.level === value)?._count._all ?? 0;
  const title = university.nameAr?.trim() || university.name;
  const cnc = getCncSummary(university);
  const logoUrl = university.logoUrl || cnc.logoUrl;
  const levelItems = LEVELS
    .map((level) => ({ level, programs: getCncProgramsForLevel(university, level.value) }))
    .filter((item) => item.programs.length > 0);

  return (
    <main className="mx-auto max-w-3xl px-4 py-5 sm:py-6" style={{ fontFamily: "var(--font-article), Amiri, Georgia, serif" }}>
      <nav className="mb-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Link href="/lectures" className="transition hover:text-primary">المحاضرات</Link>
        <ChevronLeft className="h-3 w-3" />
        <span className="truncate">{title}</span>
      </nav>

      <section className="rounded-xl border border-primary/15 bg-gradient-to-l from-blue-500/[0.09] via-card to-amber-500/[0.045] p-3.5 shadow-[0_3px_16px_hsl(var(--primary)/0.045)]">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <UniversityLogo
              src={logoUrl}
              alt={title}
              boxClass="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-primary/10 bg-white shadow-sm"
              fallbackClass="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
              iconClass="h-3.5 w-3.5"
            />
          ) : (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Building2 className="h-3.5 w-3.5" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold">{title}</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">اختر المستوى ثم التخصص ثم السداسي والمقياس</p>
            <p className="mt-1 text-[9px] text-primary/80">{cnc.programCount} برنامج رياضيات · {cnc.moduleCount} مقياس رسمي</p>
          </div>
        </div>
      </section>

      <div className="mt-4 overflow-hidden rounded-lg border border-primary/15 bg-card shadow-[0_2px_12px_hsl(var(--primary)/0.04)]">
        <div className="flex items-center justify-between border-b border-primary/10 bg-gradient-to-l from-primary/[0.07] to-amber-500/[0.035] px-3 py-1.5 text-[10px] text-muted-foreground">
          <span>{levelItems.length} مستوى رسمي</span>
          <span>اضغط للانتقال إلى التخصصات</span>
        </div>
        <div className="divide-y divide-primary/[0.08]">
          {levelItems.map(({ level, programs }) => {
            const count = countFor(level.value);
            const Icon = level.isMaster ? GraduationCap : Layers3;
            return (
              <Link
                key={level.key}
                href={`/lectures/${university.slug}/${level.key}`}
                className="group flex items-center gap-2.5 border-r-2 border-r-transparent px-3 py-2.5 transition hover:border-r-primary hover:bg-primary/[0.035]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{level.label}</span>
                  <span className="block text-[10px] text-muted-foreground">{programs.length} تخصص · {programs.reduce((total, program) => total + program.semesterCount, 0)} سداسيًا</span>
                </span>
                <span className="rounded-full border border-primary/10 bg-primary/[0.04] px-1.5 py-0.5 text-[9px] text-muted-foreground">
                  {count > 0 ? `${count} موديل` : "التخصصات الرسمية"}
                </span>
                <ChevronLeft className="h-4 w-4 text-muted-foreground/50 transition group-hover:-translate-x-0.5 group-hover:text-primary" />
              </Link>
            );
          })}
        </div>
      </div>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
        <BookOpen className="h-3 w-3" /> اختر المستوى لعرض كل التخصصات والسداسيات والمقاييس
      </p>
    </main>
  );
}
