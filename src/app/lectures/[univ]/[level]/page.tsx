import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { levelFromParam } from "@/lib/lectures";
import { CncSpecialtyTree } from "@/components/lectures/cnc-specialty-tree";
import { SemesterModuleTree } from "@/components/lectures/semester-module-tree";
import { cncModuleKey, getCncProgramsForLevel, getCncSummary } from "@/lib/cnc-math-catalog";
import { getDriveResourcesForCncProgram } from "@/lib/drive-math-resources";
import { getMoodleResourcesForCncProgram } from "@/lib/moodle-math-resources";

export const dynamic = "force-dynamic";

export default async function LevelPage({ params }: { params: Promise<{ univ: string; level: string }> }) {
  const { univ, level } = await params;
  const lvl = levelFromParam(level);
  if (!lvl) notFound();

  const university = await prisma.university.findUnique({ where: { slug: univ } });
  if (!university) notFound();
  const universityName = university.nameAr?.trim() || university.name;
  const programs = getCncProgramsForLevel(university, lvl.value);
  const cnc = getCncSummary(university);
  const driveResourcesByProgram = Object.fromEntries(
    programs.map((program) => [
      program.id,
      getDriveResourcesForCncProgram(university, lvl.value, program, programs),
    ]),
  );
  const moodleResourcesByProgram = Object.fromEntries(
    programs.map((program) => [
      program.id,
      getMoodleResourcesForCncProgram(university, lvl.value, program),
    ]),
  );

  const allModules = await prisma.module.findMany({
    where: { universityId: university.id, level: lvl.value },
    include: { _count: { select: { resources: true } } },
    orderBy: [{ semester: "asc" }, { name: "asc" }],
  });

  const moduleMatches = allModules.reduce<Record<string, { id: string; name: string; semester: number; coefficient: number | null; resourcesCount: number }>>((matches, module) => {
    matches[cncModuleKey(module.name, module.semester)] = {
      id: module.id,
      name: module.name,
      semester: module.semester,
      coefficient: module.coefficient,
      resourcesCount: module._count.resources,
    };
    return matches;
  }, {});

  const commonModules = allModules.filter((module) => !module.lectureSpecialtyId);

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-5 sm:py-6" style={{ fontFamily: "var(--font-article), Amiri, Georgia, serif" }}>
      <nav className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Link href="/lectures" className="transition hover:text-primary">المحاضرات</Link>
        <ChevronLeft className="h-3 w-3" />
        <Link href={`/lectures/${univ}`} className="truncate transition hover:text-primary">{universityName}</Link>
        <ChevronLeft className="h-3 w-3" />
        <span>{lvl.label}</span>
      </nav>

      <header className="rounded-xl border border-primary/15 bg-gradient-to-l from-blue-500/[0.09] via-card to-amber-500/[0.045] px-3.5 py-3 shadow-[0_3px_16px_hsl(var(--primary)/0.045)]">
        <h1 className="text-base font-bold">{lvl.icon} {universityName} — {lvl.label}</h1>
        <p className="mt-1 text-[11px] text-muted-foreground">اضغط على التخصص ثم السداسي لعرض كل المقاييس والملفات</p>
        <p className="mt-1 text-[9px] text-primary/80">{programs.length} تخصص رسمي · {programs.reduce((total, program) => total + program.semesterCount, 0)} سداسي · {cnc.moduleCount} مقياس في الجامعة</p>
      </header>

      {programs.length > 0 ? (
        <CncSpecialtyTree programs={programs} moduleMatches={moduleMatches} driveResourcesByProgram={driveResourcesByProgram} moodleResourcesByProgram={moodleResourcesByProgram} />
      ) : (
        <p className="rounded-xl border border-dashed bg-card p-8 text-center text-xs text-muted-foreground">لا توجد تخصصات رسمية لهذا المستوى بعد.</p>
      )}


      {commonModules.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <BookOpen className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">المقاييس المشتركة</h2>
            <span className="text-[10px] text-muted-foreground">{commonModules.length} مقياس</span>
          </div>
          <SemesterModuleTree
            modules={commonModules.map((module) => ({
              id: module.id,
              name: module.name,
              semester: module.semester,
              coefficient: module.coefficient,
              resourcesCount: module._count.resources,
            }))}
          />
        </section>
      )}

      <p className="text-center">
        <Link href={`/lectures/${univ}`} className="text-[11px] text-primary hover:underline">← الرجوع إلى مستويات الجامعة</Link>
      </p>
    </main>
  );
}
