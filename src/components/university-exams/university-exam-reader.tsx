"use client";

import { useEffect, useState } from "react";
import { ScribdExamViewer } from "@/components/topics/scribd-exam-viewer";

type PageData = { pages: Array<{ page: number; width: number; height: number; url: string }>; downloadUrl: string; fileName: string };
export function UniversityExamReader({ source, collection, asset, title, sourceUrl }: { source: string; collection: string; asset: string; title: string; sourceUrl: string }) {
  const [data, setData] = useState<PageData | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setData(null); setError(false);
    const query = new URLSearchParams({ source, collection, asset });
    fetch(`/api/university-exams/pages?${query}`, { method: "POST", signal: controller.signal, cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<PageData>; })
      .then((value) => { if (!value.pages?.length || !value.downloadUrl) throw new Error(); if (active) setData(value); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; controller.abort(); };
  }, [source, collection, asset, attempt]);
  if (error) return <section className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border bg-muted/20 px-5 py-10 text-center" role="alert"><h2 className="text-base font-medium">تعذر فتح القارئ الآن</h2><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">قد يكون المصدر الجامعي غير متاح مؤقتًا. جرّب مرة أخرى أو افتح الملف الرسمي.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><button onClick={() => { setError(false); setAttempt((value) => value + 1); }} className="min-h-11 rounded-md bg-primary px-4 text-sm text-primary-foreground">إعادة المحاولة</button><a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-md border px-4 text-sm hover:border-primary hover:text-primary">المصدر الرسمي</a></div></section>;
  if (!data) return <section className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border bg-muted/20 px-5 py-10 text-center" aria-busy="true" aria-live="polite"><span className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary motion-reduce:animate-none" aria-hidden="true" /><h2 className="mt-4 text-base font-medium">جارٍ فتح الاختبار…</h2><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">قد يستغرق الفتح الأول قليلًا لتجهيز صفحات القراءة. تُحفظ النسخة للمرات التالية.</p></section>;
  return <div className="overflow-hidden rounded-lg border"><ScribdExamViewer title={title} fileName={data.fileName} downloadUrl={data.downloadUrl} sourceUrl={sourceUrl} pages={data.pages} /></div>;
}
