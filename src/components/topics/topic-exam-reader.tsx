"use client";

import { useEffect, useState } from "react";
import { PdfExamViewer } from "@/components/topics/pdf-exam-viewer";

export function TopicExamReader({ slug, title, sourceUrl }: { slug: string; title: string; sourceUrl?: string }) {
  const [data, setData] = useState<{ readUrl: string; downloadUrl: string; fileName: string } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    fetch(`/api/exams/read?slug=${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((value) => active && setData(value))
      .catch(() => active && setError(true));
    return () => { active = false; };
  }, [slug]);
  if (error) return <p className="mt-5 text-center text-xs text-muted-foreground">تعذر تجهيز القراءة المباشرة من Azure.</p>;
  if (!data) return <div className="mt-5 flex h-40 items-center justify-center text-xs text-muted-foreground">جارٍ تجهيز رابط Azure الآمن…</div>;
  return <div className="mt-6 overflow-hidden rounded-lg border"><PdfExamViewer fileUrl={data.readUrl} downloadUrl={data.downloadUrl} sourceUrl={sourceUrl} fileName={data.fileName} title={title} /></div>;
}
