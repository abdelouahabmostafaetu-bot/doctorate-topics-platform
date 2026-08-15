import Link from "next/link";
import { BookOpen, ChevronLeft, ChevronDown } from "lucide-react";

type ModuleItem = {
  id: string;
  name: string;
  semester: number;
  coefficient: number | null;
  resourcesCount: number;
};

export function SemesterModuleTree({ modules, emptyMessage = "لا توجد موديلات بعد في هذا التخصص 🌱" }: { modules: ModuleItem[]; emptyMessage?: string }) {
  const grouped = modules.reduce<Record<number, ModuleItem[]>>((groups, module) => {
    (groups[module.semester] ||= []).push(module);
    return groups;
  }, {});
  const semesters = Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b));

  if (!semesters.length) {
    return <p className="rounded-xl border border-dashed bg-card p-8 text-center text-xs text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2">
      {semesters.map(([semester, semesterModules], index) => (
        <details key={semester} open={index === 0} className="group overflow-hidden rounded-xl border border-primary/15 bg-card shadow-sm">
          <summary className="flex cursor-pointer list-none items-center gap-2.5 bg-gradient-to-l from-primary/[0.07] to-amber-500/[0.035] px-3 py-2.5 [&::-webkit-details-marker]:hidden">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <BookOpen className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">السداسي {semester}</span>
              <span className="block text-[10px] text-muted-foreground">{semesterModules.length} مقياس</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
          </summary>
          <div className="divide-y divide-primary/[0.08] border-t border-primary/10">
            {semesterModules.map((module) => (
              <Link
                key={module.id}
                href={`/lectures/module/${module.id}`}
                className="group/module flex items-center gap-2.5 px-3 py-2.5 transition hover:bg-primary/[0.035]"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-primary transition group-hover/module:bg-primary group-hover/module:text-primary-foreground">
                  <BookOpen className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{module.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {module.resourcesCount} ملف
                    {module.coefficient ? ` · معامل ${module.coefficient}` : ""}
                  </span>
                </span>
                <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground/60 transition group-hover/module:-translate-x-0.5 group-hover/module:text-primary" />
              </Link>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
