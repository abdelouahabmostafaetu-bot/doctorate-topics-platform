import { ExternalLink, FileText } from "lucide-react";

export type ExternalModuleResourceItem = {
  id: string;
  title: string;
  url: string;
  type: string;
  source: string;
  context?: string;
};

export function ExternalModuleResources({ resources }: { resources: ExternalModuleResourceItem[] }) {
  if (!resources.length) return null;
  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center gap-2 px-1">
        <FileText className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold">مصادر إضافية مرتبطة بالمقياس</h2>
        <span className="text-[10px] text-muted-foreground">{resources.length} مصدر</span>
      </div>
      <div className="overflow-hidden rounded-lg border border-primary/15 bg-card">
        <div className="divide-y divide-primary/[0.06]">
          {resources.map((resource) => (
            <a key={resource.id} href={resource.url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2.5 px-3 py-2.5 transition hover:bg-primary/[0.035]">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                <FileText className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-semibold">{resource.title}</span>
                <span className="block truncate text-[9px] text-muted-foreground">
                  {resource.type} · {resource.source}{resource.context ? ` · ${resource.context}` : ""}
                </span>
              </span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition group-hover:text-primary" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
