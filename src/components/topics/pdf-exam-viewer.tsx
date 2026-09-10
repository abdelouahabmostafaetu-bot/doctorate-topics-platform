"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink, Maximize2, Minus, Plus, RotateCcw } from "lucide-react";

type PdfExamViewerProps = {
  fileUrl: string;
  downloadUrl?: string;
  sourceUrl?: string;
  fileName: string;
  title: string;
};

type PdfPage = {
  getViewport: (options: { scale: number }) => { width: number; height: number };
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
    transform?: number[];
  }) => { promise: Promise<void> };
};

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
  destroy: () => Promise<void>;
};

type PdfJsModule = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (url: string) => { promise: Promise<PdfDocument> };
};

const PDFJS_VERSION = "4.10.38";
const PDFJS_MODULE_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.mjs`;
const PDFJS_WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;
const ZOOM_LEVELS = [70, 85, 100, 115, 130, 150, 175];
const iconButton =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-30";

export function PdfExamViewer({
  fileUrl,
  downloadUrl,
  sourceUrl,
  fileName,
  title,
}: PdfExamViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [zoomIndex, setZoomIndex] = useState(2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const zoom = ZOOM_LEVELS[zoomIndex];

  useEffect(() => {
    let cancelled = false;
    let documentToDestroy: PdfDocument | null = null;

    async function renderPdf() {
      const host = pagesRef.current;
      if (!host) return;
      host.replaceChildren();
      setLoading(true);
      setError(null);

      try {
        const pdfjs = (await import(
          /* webpackIgnore: true */ PDFJS_MODULE_URL
        )) as PdfJsModule;
        pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        const pdf = await pdfjs.getDocument(fileUrl).promise;
        documentToDestroy = pdf;
        if (cancelled) return;
        setPageCount(pdf.numPages);

        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        const baseScale = 1.25 * (zoom / 100);

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: baseScale });
          const wrapper = document.createElement("figure");
          wrapper.className = "m-0 flex flex-col items-center gap-1.5";
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d", { alpha: false });
          if (!context) throw new Error("Canvas is unavailable");

          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;
          canvas.className = "max-w-none bg-white shadow-[0_1px_4px_rgba(0,0,0,0.16)]";

          const caption = document.createElement("figcaption");
          caption.className = "text-[10px] tabular-nums text-muted-foreground";
          caption.textContent = `${pageNumber} / ${pdf.numPages}`;
          wrapper.append(canvas, caption);
          host.appendChild(wrapper);

          await page.render({
            canvasContext: context,
            viewport,
            transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
          }).promise;
        }
      } catch {
        if (!cancelled) setError("تعذر تشغيل القارئ المباشر. يمكنك فتح الملف أو تحميله.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void renderPdf();
    return () => {
      cancelled = true;
      if (documentToDestroy) void documentToDestroy.destroy();
    };
  }, [fileUrl, zoom]);

  async function enterFullscreen() {
    try {
      await viewerRef.current?.requestFullscreen();
    } catch {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <section ref={viewerRef} className="bg-background" aria-label={`قارئ PDF: ${title}`}>
      <div className="flex min-h-11 items-center justify-between gap-2 border-y bg-background px-1.5 sm:px-2">
        <div className="min-w-0 px-1.5">
          <p className="truncate text-xs font-medium">{title}</p>
          <p className="text-[10px] text-muted-foreground">{pageCount ? `${pageCount} صفحة` : "PDF"}</p>
        </div>
        <div className="flex shrink-0 items-center" dir="ltr">
          <button type="button" onClick={() => setZoomIndex((value) => Math.max(0, value - 1))} disabled={zoomIndex === 0} className={iconButton} aria-label="تصغير" title="تصغير"><Minus className="h-3.5 w-3.5" /></button>
          <span className="w-10 text-center text-[10px] tabular-nums text-muted-foreground">{zoom}%</span>
          <button type="button" onClick={() => setZoomIndex((value) => Math.min(ZOOM_LEVELS.length - 1, value + 1))} disabled={zoomIndex === ZOOM_LEVELS.length - 1} className={iconButton} aria-label="تكبير" title="تكبير"><Plus className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={() => setZoomIndex(2)} className={`${iconButton} hidden sm:inline-flex`} aria-label="إعادة الحجم" title="الحجم الأصلي"><RotateCcw className="h-3.5 w-3.5" /></button>
          <span className="mx-1 h-5 w-px bg-border" />
          <button type="button" onClick={enterFullscreen} className={iconButton} aria-label="ملء الشاشة" title="ملء الشاشة"><Maximize2 className="h-3.5 w-3.5" /></button>
          {sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className={`${iconButton} hidden sm:inline-flex`} aria-label="المصدر الرسمي" title="المصدر الرسمي"><ExternalLink className="h-3.5 w-3.5" /></a>}
          <a href={downloadUrl || fileUrl} download={fileName} className="ms-1 inline-flex h-8 items-center gap-1.5 bg-foreground px-2.5 text-[11px] font-medium text-background transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Download className="h-3.5 w-3.5" />تحميل</a>
        </div>
      </div>

      <div className="relative h-[calc(100dvh-11rem)] min-h-[520px] overflow-auto bg-[#eeeeec] py-4 dark:bg-[#171717]">
        {loading && <div className="absolute inset-x-0 top-1/3 z-10 text-center"><span className="inline-flex items-center gap-2 bg-background/90 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />جارٍ تجهيز صفحات الامتحان…</span></div>}
        {error && <div className="mx-auto mt-24 max-w-sm px-5 text-center text-sm"><p>{error}</p><a href={fileUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block font-medium text-primary hover:underline">فتح ملف PDF</a></div>}
        <div ref={pagesRef} className="mx-auto flex w-max min-w-full flex-col items-center gap-4 px-3" />
      </div>
    </section>
  );
}
