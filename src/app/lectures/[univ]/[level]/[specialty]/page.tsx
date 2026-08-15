import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { levelFromParam } from "@/lib/lectures";
import { SemesterModuleTree } from "@/components/lectures/semester-module-tree";

export const dynamic = "force-dynamic";

export default async function SpecialtyPage({ params }: { params: Promise<{ univ: string; level: string; specialty: string }> }) {
  const { univ, level, specialty } = await params;
  const lvl = levelFromParam(level);
  if (!lvl) notFound();

  const [university, spec] = await Promise.all([
    prisma.university.findUnique({ where: { slug: univ } }),
    prisma.lectureSpecialty.findUnique({ where: { slug: specialty } }),
  ]);
  if (!university || !spec || spec.universityId !== university.id || spec.level !== lvl.value) notFound();
  const uName = university.nameAr?.trim() || university.name;

  const modules = await prisma.module.findMany({
    where: {
      universityId: university.id,
      level: lvl.value,
      lectureSpecialtyId: spec.id,
    },
    include: { _count: { select: { resources: true } } },
    orderBy: [{ semester: "asc" }, { name: "asc" }],
  });

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-5 sm:py-6" style={{ fontFamily: "var(--font-article), Amiri, Georgia, serif" }}>
      <nav className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Link href="/lectures" className="transition hover:text-primary">المحاضرات</Link>
        <ChevronLeft className="h-3 w-3" />
        <Link href={`/lectures/${univ}`} className="transition hover:text-primary">{uName}</Link>
        <ChevronLeft className="h-3 w-3" />
        <Link href={`/lectures/${univ}/${level}`} className="transition hover:text-primary">{lvl.label}</Link>
        <ChevronLeft className="h-3 w-3" />
        <span className="truncate">{spec.name}</span>
      </nav>

      <header className="rounded-xl border border-primary/15 bg-gradient-to-l from-blue-500/[0.09] via-card to-amber-500/[0.045] px-3.5 py-3 shadow-[0_3px_16px_hsl(var(--primary)/0.045)]">
        <h1 className="text-base font-bold">{spec.name}</h1>
        <p className="mt-1 text-[11px] text-muted-foreground">{uName} — {lvl.label}</p>
        <p className="mt-1 text-[9px] text-primary/80">اختر السداسي لعرض المقاييس والملفات</p>
      </header>

      <SemesterModuleTree
        modules={modules.map((module) => ({
          id: module.id,
          name: module.name,
          semester: module.semester,
          coefficient: module.coefficient,
          resourcesCount: module._count.resources,
        }))}
      />

      <p className="text-center">
        <Link href={`/lectures/${univ}/${level}`} className="text-[11px] text-primary hover:underline">← الرجوع إلى التخصصات</Link>
      </p>
    </main>
  );
}
