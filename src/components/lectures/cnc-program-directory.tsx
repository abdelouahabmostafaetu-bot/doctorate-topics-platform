import Link from "next/link";
import { ExternalLink, ListTree } from "lucide-react";
import { getCncModuleMeta, getCncModuleTitle, levelLabel, type CncProgramSummary } from "@/lib/cnc-math-catalog";

export function CncProgramDirectory({ programs, sourceUrl }: { programs: CncProgramSummary[]; sourceUrl: string }) {
  if (!programs.length) return null;

  const grouped = programs.reduce<Record<string, CncProgramSummary[]>>((groups, program) => {
    (groups[program.level] ||= []).push(program);
    return groups;
  }, {});

  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-primary/15 bg-card shadow-[0_2px_12px_hsl(var(--primary)/0.04)]">
      <div className="flex items-center justify-between border-b border-primary/10 bg-gradient-to-l from-primary/[0.07] to-amber-500/[0.035] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ListTree className="h-3.5 w-3.5" />
          </span>
          <div>
            <h2 className="text-xs font-bold">البرامج والمقاييس الرسمية</h2>
            <p className="text-[9px] text-muted-foreground">حسب بيانات CNC / MESRS</p>
          </div>
        </div>
        <Link href={sourceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[9px] text-primary hover:underline">
          المصدر الرسمي
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <div className="divide-y divide-primary/[0.08]">
        {Object.entries(grouped).map(([level, levelPrograms]) => (
          <div key={level} className="p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[11px] font-bold text-primary">{levelLabel(level)}</h3>
              <span className="text-[9px] text-muted-foreground">{levelPrograms.length} برنامج</span>
            </div>
            <div className="space-y-2">
              {levelPrograms.map((program) => (
                <details key={program.id} className="group rounded-lg border border-primary/10 bg-background/40">
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-semibold leading-5">{program.title}</span>
                      <span className="block text-[9px] text-muted-foreground">{program.code} · {program.semesterCount} سداسي · {program.moduleCount} مقياس</span>
                    </span>
                    <span className="text-[10px] text-primary/60 transition group-open:rotate-90">‹</span>
                  </summary>
                  <div className="border-t border-primary/10 px-3 pb-3 pt-2">
                    <div className="space-y-2">
                      {program.semesters.map((semester) => (
                        <div key={semester.name} className="rounded-md border border-primary/[0.08] bg-card/70 p-2">
                          <div className="mb-1.5 text-[10px] font-bold text-foreground">{semester.name}</div>
                          <div className="space-y-1">
                            {semester.modules.map((module) => (
                              <div key={`${semester.name}-${module.number}-${module.name}`} className="flex items-start justify-between gap-2 border-b border-primary/[0.06] py-1 last:border-0">
                                <span className="text-[10px] leading-4 text-foreground/90">{module.number}. {getCncModuleTitle(module)}</span>
                                <span className="shrink-0 text-left text-[8px] leading-4 text-muted-foreground">{getCncModuleMeta(module)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
