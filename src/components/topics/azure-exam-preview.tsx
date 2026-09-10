"use client";

import { useCallback, useEffect, useState } from "react";
import { ScribdExamViewer } from "@/components/topics/scribd-exam-viewer";

const SOURCE = "https://uwaterloo.ca/pure-mathematics/sites/default/files/uploads/documents/2025-a-fields-galois.pdf";
const FILE_NAME = "waterloo-2025-fields-galois.pdf";
type Images = { pages: Array<{ page: number; width: number; height: number; url: string }> };
export function AzureExamPreview() {
  const [images, setImages] = useState<Images | null>(null);
  const [downloadUrl, setDownloadUrl] = useState(SOURCE);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const load = useCallback(() => {
    setError(false); setImages(null);
    const controller = new AbortController();
    fetch("/api/preview/azure-exam", { method: "POST", signal: controller.signal, cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((data) => { if (!data.images?.pages?.length) throw new Error(); setImages(data.images); setDownloadUrl(data.downloadUrl || SOURCE); })
      .catch(() => setError(true));
    return () => controller.abort();
  }, []);
  useEffect(() => load(), [load, attempt]);
  if (error) return <div className="flex min-h-[420px] flex-col items-center justify-center rounded-lg border bg-muted/20 px-5 text-center"><p className="text-sm font-medium">تعذر تجهيز العرض المحسن</p><p className="mt-1 max-w-md text-xs text-muted-foreground">لم يعد هناك قارئ بديل. أعد المحاولة بعد اكتمال معالجة صفحات Azure.</p><button onClick={() => setAttempt((value) => value + 1)} className="mt-4 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground">إعادة المحاولة</button></div>;
  if (!images) return <div className="flex min-h-[420px] flex-col items-center justify-center rounded-lg border bg-muted/20 px-5 text-center"><span className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" /><p className="mt-4 text-sm font-medium">تجهيز العرض المحسن</p><p className="mt-1 text-xs text-muted-foreground">يحدث هذا مرة واحدة فقط، ثم تفتح الصفحات مباشرة من Azure.</p></div>;
  return <ScribdExamViewer title="Waterloo 2025 — Fields and Galois Theory" fileName={FILE_NAME} downloadUrl={downloadUrl} sourceUrl={SOURCE} pages={images.pages} />;
}
