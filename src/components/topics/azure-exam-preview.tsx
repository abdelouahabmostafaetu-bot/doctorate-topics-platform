"use client";

import { useEffect, useState } from "react";
import { PdfExamViewer } from "@/components/topics/pdf-exam-viewer";
import { ScribdExamViewer } from "@/components/topics/scribd-exam-viewer";

const SOURCE = "https://uwaterloo.ca/pure-mathematics/sites/default/files/uploads/documents/2025-a-fields-galois.pdf";
const STABLE_READER_URL = "/api/preview/waterloo-pdf";
const FILE_NAME = "waterloo-2025-fields-galois.pdf";
type Images = { pages: Array<{ page: number; width: number; height: number; url: string }> };

export function AzureExamPreview() {
  const [message, setMessage] = useState("القارئ يعمل الآن. يجري تجهيز عرض الصفحات عالي الوضوح لأول مرة فقط.");
  const [images, setImages] = useState<Images | null>(null);
  const [downloadUrl, setDownloadUrl] = useState(SOURCE);
  const [showImages, setShowImages] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/preview/azure-exam", { method: "POST", signal: controller.signal, cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((data) => {
        if (!data.images?.pages?.length) throw new Error();
        setImages(data.images); setDownloadUrl(data.downloadUrl || SOURCE);
        setMessage(`العرض المحسن جاهز: ${data.images.pages.length} صفحة. اضغط الزر للانتقال دون إعادة تحميل الصفحة.`);
      })
      .catch(() => setMessage("القارئ الأساسي يعمل؛ تعذر تجهيز صور الصفحات على الخادم الحالي."));
    return () => controller.abort();
  }, []);
  if (showImages && images) return <><div className="mb-3 flex items-center justify-between gap-2"><p className="text-xs text-emerald-600">عرض صفحات WebP من Azure</p><button onClick={() => setShowImages(false)} className="rounded-md border px-3 py-1 text-xs">العودة إلى PDF</button></div><ScribdExamViewer title="Waterloo 2025 — Fields and Galois Theory" fileName={FILE_NAME} downloadUrl={downloadUrl} sourceUrl={SOURCE} pages={images.pages} /></>;
  return <><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-emerald-600">{message}</p>{images && <button onClick={() => setShowImages(true)} className="rounded-md bg-[#2383e2] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1b6fc1]">فتح العرض المحسن</button>}</div><PdfExamViewer fileUrl={STABLE_READER_URL} downloadUrl={downloadUrl} sourceUrl={SOURCE} fileName={FILE_NAME} title="Waterloo 2025 — Fields and Galois Theory" /></>;
}
