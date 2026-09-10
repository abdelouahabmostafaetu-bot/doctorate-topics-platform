"use client";

import { useEffect, useState } from "react";
import { ScribdExamViewer } from "@/components/topics/scribd-exam-viewer";

type PageData = { pages: Array<{ page: number; width: number; height: number; url: string }>; downloadUrl: string; fileName: string };
export function TopicExamReader({ slug, title, sourceUrl }: { slug: string; title: string; sourceUrl?: string }) {
  const [data, setData] = useState<PageData | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    fetch(`/api/exams/pages?slug=${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((value) => active && setData(value))
      .catch(() => active && setError(true));
    return () => { active = false; };
  }, [slug]);
  if (error) return <div className="mt-6 rounded-lg border bg-muted/20 px-5 py-10 text-center"><p className="text-sm font-medium">العرض المحسن غير جاهز لهذا الاختبار بعد</p><p className="mt-1 text-xs text-muted-foreground">يجب تجهيز صفحات WebP من لوحة الإدارة أولًا.</p></div>;
  if (!data) return <div className="mt-6 flex h-48 items-center justify-center rounded-lg border bg-muted/20 text-xs text-muted-foreground"><span className="inline-flex items-center gap-2"><span className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />جارٍ فتح العرض المحسن…</span></div>;
  return <div className="mt-6 overflow-hidden rounded-lg border"><ScribdExamViewer title={title} fileName={data.fileName} downloadUrl={data.downloadUrl} sourceUrl={sourceUrl} pages={data.pages} /></div>;
}
