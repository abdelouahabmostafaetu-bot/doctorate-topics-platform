import Link from "next/link";
import { Building2, ChevronLeft, ExternalLink, Layers3 } from "lucide-react";
import { UniversityLogo } from "./university-logo";
import { levelLabel } from "@/lib/cnc-math-catalog";
import type { CncUniversitySummary } from "@/lib/cnc-math-catalog";

type UniversityItem = {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  city: string | null;
  logoUrl: string | null;
  modulesCount: number;
  cnc: CncUniversitySummary;
};

type CncOnlyItem = {
  id: string;
  name: string;
  nameAr: string;
  logoUrl: string | null;
  portalUrl: string | null;
  levels: string[];
  programCount: number;
  moduleCount: number;
};

export function UniversityDirectory({ items, extra }: { items: UniversityItem[]; extra?: CncOnlyItem[] }) {
  const extraCount = extra?.length ?? 0;
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-primary/15 bg-card shadow-[0_2px_12px_hsl(var(--primary)/0.04)]">
      {items.length > 0 && (
        <div className="divide-y divide-primary/[0.08]">
          {items.map((u, index) => {
            const title = u.nameAr?.trim() || u.name;
            const colors = [
              "bg-blue-500/10 text-blue-600 dark:text-blue-400",
              "bg-amber-500/10 text-amber-600 dark:text-amber-400",
              "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
              "bg-violet-500/10 text-violet-600 dark:text-violet-400",
            ];
            const levels = u.cnc.levels.map(levelLabel);
            return (
              <div key={u.id} className="group relative flex items-center gap-2.5 border-r-2 border-r-transparent px-3 py-2 transition hover:border-r-primary hover:bg-primary/[0.035]">
                <Link href={`/lectures/${u.slug}`} className="flex min-w-0 flex-1 items-center gap-2.5">
                  {u.logoUrl ? (
                    <UniversityLogo
                      src={u.logoUrl}
                      alt={title}
                      boxClass="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-primary/10 bg-white"
                      fallbackClass={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${colors[index % colors.length]}`}
                      iconClass="h-3.5 w-3.5"
                    />
                  ) : (
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${colors[index % colors.length]}`}>
                      <Building2 className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold leading-5">{title}</span>
                    <span className="block truncate text-[9px] text-muted-foreground">
                      {u.city || u.name}
                      {u.cnc.programCount > 0 ? ` · ${u.cnc.programCount} برنامج رياضيات` : ""}
                    </span>
                    {levels.length > 0 && (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {levels.map((level) => (
                          <span key={level} className="rounded-full border border-primary/10 bg-primary/[0.045] px-1.5 py-0.5 text-[8px] text-muted-foreground">
                            {level}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                  <span className="hidden shrink-0 text-left sm:block">
                    <span className="flex items-center justify-end gap-1 text-[9px] text-muted-foreground">
                      <Layers3 className="h-3 w-3 text-primary/60" />
                      {u.cnc.moduleCount > 0 ? `${u.cnc.moduleCount} مقياس رسمي` : u.modulesCount > 0 ? `${u.modulesCount} مقياس` : "قريبًا"}
                    </span>
                    {u.cnc.semesterCount > 0 && (
                      <span className="mt-0.5 block text-[8px] text-muted-foreground/75">{u.cnc.semesterCount} سداسيًا</span>
                    )}
                  </span>
                  <ChevronLeft className="h-3.5 w-3.5 shrink-0 text-primary/40 transition group-hover:-translate-x-0.5 group-hover:text-primary" />
                </Link>
                {u.cnc.portalUrl && (
                  <a
                    href={u.cnc.portalUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`الموقع الرسمي لـ ${title}`}
                    className="relative z-10 shrink-0 rounded-md p-1 text-muted-foreground/60 transition hover:bg-primary/10 hover:text-primary"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
      {extraCount > 0 && (
        <>
          <div className="flex items-center justify-between border-t border-primary/10 bg-primary/[0.035] px-3 py-1.5 text-[10px] text-muted-foreground">
            <span>{extraCount} جامعة إضافية</span>
            <span>جامعات لها برامج رسمية (CNC) — المحتوى عبر المنصة الرسمية</span>
          </div>
          <div className="divide-y divide-primary/[0.08]">
            {extra!.map((u, index) => {
              const title = u.nameAr?.trim() || u.name;
              const colors = [
                "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                "bg-sky-500/10 text-sky-600 dark:text-sky-400",
                "bg-orange-500/10 text-orange-600 dark:text-orange-400",
                "bg-teal-500/10 text-teal-600 dark:text-teal-400",
              ];
              const levels = u.levels.map(levelLabel);
              return (
                <div key={`cnc-${u.id}`} className="group relative flex items-center gap-2.5 border-r-2 border-r-transparent px-3 py-2 opacity-90 transition hover:border-r-primary hover:bg-primary/[0.035]">
                  {u.logoUrl ? (
                    <UniversityLogo
                      src={u.logoUrl}
                      alt={title}
                      boxClass="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-primary/10 bg-white"
                      fallbackClass={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${colors[index % colors.length]}`}
                      iconClass="h-3.5 w-3.5"
                    />
                  ) : (
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${colors[index % colors.length]}`}>
                      <Building2 className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold leading-5">{title}</span>
                    <span className="block truncate text-[9px] text-muted-foreground">
                      {u.name}{u.programCount > 0 ? ` · ${u.programCount} برنامج رياضيات` : ""}
                    </span>
                    {levels.length > 0 && (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {levels.map((level) => (
                          <span key={level} className="rounded-full border border-primary/10 bg-primary/[0.045] px-1.5 py-0.5 text-[8px] text-muted-foreground">
                            {level}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                  <span className="hidden shrink-0 text-left sm:block">
                    <span className="flex items-center justify-end gap-1 text-[9px] text-muted-foreground">
                      <Layers3 className="h-3 w-3 text-primary/60" />
                      {u.moduleCount > 0 ? `${u.moduleCount} مقياس رسمي` : "قريبًا"}
                    </span>
                  </span>
                  {u.portalUrl && (
                    <a
                      href={u.portalUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`الموقع الرسمي لـ ${title}`}
                      className="relative z-10 shrink-0 rounded-md p-1 text-muted-foreground/60 transition hover:bg-primary/10 hover:text-primary"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
      {items.length === 0 && extraCount === 0 && <p className="px-4 py-8 text-center text-xs text-muted-foreground">لا توجد جامعات بعد.</p>}
    </div>
  );
}
