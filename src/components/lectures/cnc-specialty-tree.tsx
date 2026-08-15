import Link from "next/link";
import { BookOpen, ChevronLeft, ChevronDown, GraduationCap } from "lucide-react";
import type { CncProgramSummary } from "@/lib/cnc-math-catalog";
import { cncModuleKey, getCncModuleMeta, getCncModuleTitle, getCncSemesterNumber } from "@/lib/cnc-math-catalog";

type MatchedModule = {
  id: string;
  name: string;
  semester: number;
  coefficient: number | null;
  resourcesCount: number;
};

type Props = {
  programs: CncProgramSummary[];
  moduleMatches?: Record<string, MatchedModule>;
};

export function CncSpecialtyTree({ programs, moduleMatches = {} }: Props) {
  if (!programs.length) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <GraduationCap className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold">التخصصات</h2>
        <span className="text-[10px] text-muted-foreground">{programs.length} تخصص</span>
      </div>
      {programs.map((program) => (
        <details key={program.id} open={programs.length === 1} className="group overflow-hidden rounded-xl border border-primary/15 bg-card shadow-sm">
          <summary className="flex cursor-pointer list-none items-center gap-2.5 bg-gradient-to-l from-primary/[0.07] to-amber-500/[0.035] px-3 py-2.5 [&::-webkit-details-marker]:hidden">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <GraduationCap className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold leading-5">{program.title}</span>
              <span className="block text-[10px] text-muted-foreground">{program.code} · {program.moduleCount} مقياس رسمي</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
          </summary>
          <div className="space-y-2 border-t border-primary/10 p-2.5">
            {program.semesters.map((semester) => (
              <details key={`${program.id}-${semester.name}`} open className="group/semester overflow-hidden rounded-lg border border-primary/10 bg-background/35">
                <summary className="flex cursor-pointer list-none items-center gap-2 bg-primary/[0.035] px-3 py-2 [&::-webkit-details-marker]:hidden">
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                  <span className="flex-1 text-[11px] font-bold">{semester.name}</span>
                  <span className="text-[9px] text-muted-foreground">{semester.modules.length} مقياس</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition group-open/semester:rotate-180" />
                </summary>
                <div className="divide-y divide-primary/[0.08] border-t border-primary/10">
                  {semester.modules.map((module) => {
                    const key = cncModuleKey(module.name, getCncSemesterNumber(semester.name));
                    const match = moduleMatches[key];
                    const label = getCncModuleTitle(module);
                    const content = (
                      <>
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-primary transition group-hover/module:bg-primary group-hover/module:text-primary-foreground">
                          <BookOpen className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11px] font-semibold">{label}</span>
                          <span className="text-[9px] text-muted-foreground">
                            {getCncModuleMeta(module)}
                            {match ? ` · ${match.resourcesCount} ملف` : " · المحتوى قريبًا"}
                          </span>
                        </span>
                        {match && <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground/60 transition group-hover/module:-translate-x-0.5 group-hover/module:text-primary" />}
                      </>
                    );
                    return match ? (
                      <Link key={`${semester.name}-${module.number}-${module.name}`} href={`/lectures/module/${match.id}`} className="group/module flex items-center gap-2.5 px-3 py-2.5 transition hover:bg-primary/[0.035]">
                        {content}
                      </Link>
                    ) : (
                      <div key={`${semester.name}-${module.number}-${module.name}`} className="flex items-center gap-2.5 px-3 py-2.5 opacity-80">
                        {content}
                      </div>
                    );
                  })}
                </div>
              </details>
            ))}
          </div>
        </details>
      ))}
    </section>
  );
}
