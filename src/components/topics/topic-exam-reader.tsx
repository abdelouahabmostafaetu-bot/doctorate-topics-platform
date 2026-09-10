"use client";

import { useEffect, useState } from "react";
import { PdfExamViewer } from "@/components/topics/pdf-exam-viewer";
import { ScribdExamViewer } from "@/components/topics/scribd-exam-viewer";

type ReadData = { readUrl: string; downloadUrl: string; fileName: string };
type PageData = { pages: Array<{ page: number; width: number; height: number; url: string }>; downloadUrl: string; fileName: string };

export function TopicExamReader({ slug, title, sourceUrl }: { slug: string; title: string; sourceUrl?: string }) {
  const [data, setData] = useState<{ read: ReadData; images: PageData | null } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`/api/exams/read?slug=${encodeURIComponent(slug)}`, { cache: "no-store" }).then(async (r) => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch(`/api/exams/pages?slug=${encodeURIComponent(slug)}`, { cache: "no-store" }).then(async (r) => r.ok ? r.json() : null),
    ]).then(([read, images]) => active && setData({ read, images })).catch(() => active && setError(true));
    return () => { active = false; };
  }, [slug]);
  if (error) return <p className="mt-5 text-center text-xs text-muted-foreground">تعذر تجهيز قارئ الملف.</p>;
  if (!data) return <div className="mt-5 flex h-40 items-center justify-center text-xs text-muted-foreground">جارٍ فتح الاختبار…</div>;
  return <div className="mt-6 overflow-hidden rounded-lg border">{data.images?.pages?.length ? <ScribdExamViewer title={title} fileName={data.images.fileName} downloadUrl={data.images.downloadUrl} sourceUrl={sourceUrl} pages={data.images.pages} /> : <PdfExamViewer fileUrl={data.read.readUrl} downloadUrl={data.read.downloadUrl} sourceUrl={sourceUrl} fileName={data.read.fileName} title={title} />}</div>;
}
