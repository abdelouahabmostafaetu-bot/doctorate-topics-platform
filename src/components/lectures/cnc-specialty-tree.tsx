import Link from "next/link";
import { BookOpen, ChevronLeft, ChevronDown, ExternalLink, GraduationCap } from "lucide-react";
import type { CncProgramSummary } from "@/lib/cnc-math-catalog";
import { cncModuleKey, getCncModuleMeta, getCncModuleTitle, getCncSemesterNumber } from "@/lib/cnc-math-catalog";
import type { DriveResource } from "@/lib/drive-math-resources";

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
  driveResourcesByProgram?: Record<string, DriveResource[]>;
};

function academicBucket(resource: DriveResource) {
  if (resource.semesterHint === "M1") return "السنة الأولى ماستر";
  if (resource.semesterHint === "M2") return "السنة الثانية ماستر";
  if (resource.semesterHint === "L1") return "السنة الأولى ليسانس";
  if (resource.semesterHint === "L2") return "السنة الثانية ليسانس";
  if (resource.semesterHint === "L3") return "السنة الثالثة ليسانس";
  if (resource.semesterHint === "S1") return "السداسي 1";
  if (resource.semesterHint === "S2") return "السداسي 2";
  return "ملفات عامة للتخصص";
}

function groupedDriveResources(resources: DriveResource[]) {
  const groups = new Map<string, DriveResource[]>();
  for (const resource of resources) groups.set(academicBucket(resource), [...(groups.get(academicBucket(resource)) || []), resource]);
  return [...groups.entries()];
}

function InlineDriveResources({ resources }: { resources: DriveResource[] }) {
  if (!resources.length) return null;
  return (
    <div className="mt-2 rounded-lg border border-primary/10 bg-primary/[0.025]">
      <div className="flex items-center gap-2 border-b border-primary/10 px-3 py-2">
        <BookOpen className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] font-bold">ملفات المحاضرات المتاحة</span>
        <span className="text-[9px] text-muted-foreground">{resources.length} مصدر</span>
      </div>
      {groupedDriveResources(resources).map(([bucket, bucketResources]) => (
        <details key={bucket} open className="border-b border-primary/[0.08] last:border-b-0">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-[10px] font-semibold text-muted-foreground [&::-webkit-details-marker]:hidden">
            <span className="flex-1">{bucket}</span>
            <span className="rounded bg-secondary px-1.5 text-[9px]">{bucketResources.length}</span>
          </summary>
          <div className="divide-y divide-primary/[0.08] border-t border-primary/[0.08]">
            {bucketResources.map((resource) => (
              <a key={resource.id} href={resource.url} target="_blank" rel="noopener noreferrer" className="group/drive flex items-center gap-2 px-3 py-2 transition hover:bg-primary/[0.035]">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[10px] font-semibold">{resource.name}</span>
                  <span className="block truncate text-[9px] text-muted-foreground">{resource.topicArabic} · المصدر الأصلي</span>
                </span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition group-hover/drive:text-primary" />
              </a>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

export function CncSpecialtyTree({ programs, moduleMatches = {}, driveResourcesByProgram = {} }: Props) {
  if (!programs.length) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <GraduationCap className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold">التخصصات</h2>
        <span className="text-[10px] text-muted-foreground">{programs.length} تخصص</span>
      </div>
      {programs.map((program) => {
        const driveResources = driveResourcesByProgram[program.id] || [];
        return (
          <details key={program.id} open={programs.length === 1} className="group overflow-hidden rounded-xl border border-primary/15 bg-card shadow-sm">
            <summary className="flex cursor-pointer list-none items-center gap-2.5 bg-gradient-to-l from-primary/[0.07] to-amber-500/[0.035] px-3 py-2.5 [&::-webkit-details-marker]:hidden">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <GraduationCap className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-5">{program.title}</span>
                <span className="block text-[10px] text-muted-foreground">{program.code} · {program.moduleCount} مقياس رسمي{driveResources.length ? ` · ${driveResources.length} ملف محاضرة` : ""}</span>
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
              <InlineDriveResources resources={driveResources} />
            </div>
          </details>
        );
      })}
    </section>
  );
}
