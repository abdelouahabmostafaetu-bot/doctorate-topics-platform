import {
  BookOpen,
  ChevronDown,
  ExternalLink,
  FileText,
  FolderOpen,
  GraduationCap,
} from "lucide-react";
import type { DriveProgram, DriveResource } from "@/lib/drive-math-resources";

function resourceBucket(resource: DriveResource) {
  const text = resource.name.toLocaleLowerCase("fr-FR");
  const level = text.match(/\b(m[12]|l[123])\b/i)?.[1]?.toUpperCase();
  return level ? `المستوى ${level}` : "السداسي 1 و2 · محتوى غير مصنّف";
}

function groupedResources(resources: DriveResource[]) {
  const groups = new Map<string, DriveResource[]>();
  for (const resource of resources) {
    const bucket = resourceBucket(resource);
    groups.set(bucket, [...(groups.get(bucket) || []), resource]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "ar"));
}

function DriveRow({ resource }: { resource: DriveResource }) {
  const isFolder = resource.kind === "folder";
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group/drive flex items-center gap-2.5 px-3 py-2.5 transition hover:bg-primary/[0.035]"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-primary transition group-hover/drive:bg-primary group-hover/drive:text-primary-foreground">
        {isFolder ? <FolderOpen className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-semibold">{resource.name}</span>
        <span className="text-[9px] text-muted-foreground">
          {isFolder ? "مجلد Google Drive" : "ملف أصلي"} · فتح المصدر
        </span>
      </span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition group-hover/drive:text-primary" />
    </a>
  );
}

function ProgramCard({ program }: { program: DriveProgram }) {
  const groups = groupedResources(program.resources);
  return (
    <details className="group/program overflow-hidden rounded-lg border border-primary/10 bg-background/35" open={groups.length === 1}>
      <summary className="flex cursor-pointer list-none items-center gap-2 bg-primary/[0.035] px-3 py-2 [&::-webkit-details-marker]:hidden">
        <GraduationCap className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate text-[11px] font-bold">{program.name}</span>
        <a
          href={program.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="shrink-0 text-[9px] text-primary hover:underline"
        >
          فتح المجلد
        </a>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-open/program:rotate-180" />
      </summary>
      <div className="border-t border-primary/10">
        {groups.length ? (
          groups.map(([bucket, resources]) => (
            <details key={`${program.id}-${bucket}`} className="group/bucket border-b border-primary/[0.08] last:border-b-0" open>
              <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-[10px] font-semibold text-muted-foreground [&::-webkit-details-marker]:hidden">
                <BookOpen className="h-3 w-3 text-primary" />
                <span className="flex-1">{bucket}</span>
                <span className="rounded bg-secondary px-1.5 text-[9px]">{resources.length}</span>
                <ChevronDown className="h-3 w-3 transition group-open/bucket:rotate-180" />
              </summary>
              <div className="divide-y divide-primary/[0.08] border-t border-primary/[0.08]">
                {resources.map((resource) => <DriveRow key={resource.id} resource={resource} />)}
              </div>
            </details>
          ))
        ) : (
          <a
            href={program.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-3 text-[10px] text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" /> فتح محتوى المجلد الأصلي
          </a>
        )}
      </div>
    </details>
  );
}

export function DriveResourceTree({ programs, sourceUrl }: { programs: DriveProgram[]; sourceUrl: string }) {
  if (!programs.length) return null;
  const groups = [...new Map(programs.map((program) => [program.category, [] as DriveProgram[]])).entries()];
  for (const program of programs) groups.find(([category]) => category === program.category)?.[1].push(program);

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <FolderOpen className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold">موارد الرياضيات من Google Drive</h2>
        <span className="text-[10px] text-muted-foreground">{programs.length} تخصص/مجلد</span>
      </div>
      <p className="rounded-lg border border-primary/10 bg-primary/[0.035] px-3 py-2 text-[10px] leading-5 text-muted-foreground">
        محتوى إضافي مفتوح للطلبة. كل رابط يفتح الملف أو المجلد الأصلي مع الحفاظ على المصدر ونسبة المحتوى لصاحبه.
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="ms-1 font-semibold text-primary hover:underline">فتح مجلد المصدر</a>
      </p>
      {groups.map(([category, categoryPrograms]) => (
        <details key={category} className="group/drive-category overflow-hidden rounded-xl border border-primary/15 bg-card shadow-sm" open={groups.length === 1}>
          <summary className="flex cursor-pointer list-none items-center gap-2.5 bg-gradient-to-l from-primary/[0.07] to-amber-500/[0.035] px-3 py-2.5 [&::-webkit-details-marker]:hidden">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><FolderOpen className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{category}</span><span className="block text-[10px] text-muted-foreground">{categoryPrograms.length} تخصص/مجلد</span></span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition group-open/drive-category:rotate-180" />
          </summary>
          <div className="space-y-2 border-t border-primary/10 p-2.5">{categoryPrograms.map((program) => <ProgramCard key={program.id} program={program} />)}</div>
        </details>
      ))}
    </section>
  );
}
