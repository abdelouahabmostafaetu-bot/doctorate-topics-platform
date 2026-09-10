"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Maximize2,
  Minus,
  Plus,
} from "lucide-react";

type PdfExamViewerProps = {
  fileUrl: string;
  downloadUrl?: string;
  sourceUrl?: string;
  fileName: string;
  title: string;
};

type PdfViewport = { width: number; height: number };
type PdfPage = {
  getViewport: (options: { scale: number }) => PdfViewport;
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewport;
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
const PDFJS_BASE =
  "https" + "://cdnjs.cloudflare.com/ajax/libs/pdf.js/" + PDFJS_VERSION;
const PDFJS_MODULE_URL = PDFJS_BASE + "/pdf.min.mjs";
const PDFJS_WORKER_URL = PDFJS_BASE + "/pdf.worker.min.mjs";
const ZOOM_LEVELS = [70, 85, 100, 115, 130, 150];
const toolButton =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#6b6b6b] transition-colors hover:bg-[#efefed] hover:text-[#2f2f2f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2383e2] disabled:opacity-25 dark:text-[#a7a7a7] dark:hover:bg-[#333] dark:hover:text-white";

export function PdfExamViewer({
  fileUrl,
  downloadUrl,
  sourceUrl,
  fileName,
  title,
}: PdfExamViewerProps) {
  const viewerRef = useRef<HTMLElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [zoomIndex, setZoomIndex] = useState(2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const zoom = ZOOM_LEVELS[zoomIndex];

  useEffect(() => {
    let cancelled = false;
    let documentToDestroy: PdfDocument | null = null;
    let pageObserver: IntersectionObserver | null = null;

    async function renderPdf() {
      const host = pagesRef.current;
      const scroller = scrollerRef.current;
      if (!host || !scroller) return;
      host.replaceChildren();
      setLoading(true);
      setError(null);
      setCurrentPage(1);

      try {
        const pdfjs = (await import(
          /* webpackIgnore: true */ PDFJS_MODULE_URL
        )) as PdfJsModule;
        pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        const pdf = await pdfjs.getDocument(fileUrl).promise;
        documentToDestroy = pdf;
        if (cancelled) return;
        setPageCount(pdf.numPages);

        // Render at 2x–3x physical resolution so equations and small text stay
        // crisp on high-density mobile screens instead of stretching a 1x canvas.
        const outputScale = Math.min(
          3,
          Math.max(2, window.devicePixelRatio || 1),
        );
        const firstPage = await pdf.getPage(1);
        const naturalViewport = firstPage.getViewport({ scale: 1 });
        const availableWidth = Math.max(
          280,
          Math.min(scroller.clientWidth - 32, 920),
        );
        const fitScale = availableWidth / naturalViewport.width;
        const displayScale = fitScale * (zoom / 100);

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled) return;
          const page = pageNumber === 1 ? firstPage : await pdf.getPage(pageNumber);
          const displayViewport = page.getViewport({ scale: displayScale });
          const renderViewport = page.getViewport({
            scale: displayScale * outputScale,
          });
          const wrapper = document.createElement("figure");
          wrapper.dataset.page = String(pageNumber);
          wrapper.className = "m-0 flex scroll-mt-5 flex-col items-center gap-2";

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d", { alpha: false });
          if (!context) throw new Error("Canvas is unavailable");
          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = "high";
          canvas.width = Math.ceil(renderViewport.width);
          canvas.height = Math.ceil(renderViewport.height);
          canvas.style.width = `${Math.floor(displayViewport.width)}px`;
          canvas.style.height = `${Math.floor(displayViewport.height)}px`;
          canvas.className =
            "max-w-none rounded-[3px] bg-white shadow-[0_1px_2px_rgba(15,15,15,0.08),0_4px_16px_rgba(15,15,15,0.08)]";

          const caption = document.createElement("figcaption");
          caption.className =
            "select-none text-[10px] tabular-nums text-[#9b9a97]";
          caption.textContent = `صفحة ${pageNumber}`;
          wrapper.append(canvas, caption);
          host.appendChild(wrapper);

          await page.render({
            canvasContext: context,
            viewport: renderViewport,
          }).promise;
        }

        pageObserver = new IntersectionObserver(
          (entries) => {
            const visible = entries
              .filter((entry) => entry.isIntersecting)
              .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
            const value = visible?.target.getAttribute("data-page");
            if (value) setCurrentPage(Number(value));
          },
          { root: scroller, threshold: [0.25, 0.5, 0.75] },
        );
        host
          .querySelectorAll("figure")
          .forEach((page) => pageObserver?.observe(page));
      } catch {
        if (!cancelled) {
          setError("تعذر عرض الملف الآن. يمكنك فتح النسخة الأصلية أو تحميلها.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void renderPdf();
    return () => {
      cancelled = true;
      pageObserver?.disconnect();
      if (documentToDestroy) void documentToDestroy.destroy();
    };
  }, [fileUrl, zoom]);

  function goToPage(pageNumber: number) {
    const nextPage = Math.max(1, Math.min(pageCount, pageNumber));
    const page = pagesRef.current?.querySelector<HTMLElement>(
      `[data-page="${nextPage}"]`,
    );
    const scroller = scrollerRef.current;
    if (page && scroller) {
      scroller.scrollTo({ top: page.offsetTop - 16, behavior: "smooth" });
      setCurrentPage(nextPage);
    }
  }

  async function enterFullscreen() {
    try {
      await viewerRef.current?.requestFullscreen();
    } catch {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <section
      ref={viewerRef}
      className="relative overflow-hidden bg-[#f7f7f5] dark:bg-[#191919]"
      aria-label={`قارئ PDF: ${title}`}
    >
      <div className="sticky top-0 z-20 flex h-11 items-center justify-between border-y border-[#e9e9e7] bg-white/95 px-2 backdrop-blur-md dark:border-[#303030] dark:bg-[#202020]/95 sm:px-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#f1f1ef] text-xs font-semibold text-[#787774] dark:bg-[#333] dark:text-[#b8b8b8]">
            PDF
          </span>
          <div className="min-w-0">
            <p className="max-w-44 truncate text-[11px] font-medium text-[#37352f] dark:text-[#e9e9e7] sm:max-w-sm">
              {title}
            </p>
            <p className="text-[9px] text-[#9b9a97]">
              {pageCount ? `${pageCount} صفحة · جودة عالية` : fileName}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5" dir="ltr">
          <button type="button" onClick={() => setZoomIndex((value) => Math.max(0, value - 1))} disabled={zoomIndex === 0} className={toolButton} aria-label="تصغير" title="تصغير"><Minus className="h-3.5 w-3.5" /></button>
          <span className="w-9 text-center text-[10px] tabular-nums text-[#787774] dark:text-[#a7a7a7]">{zoom}%</span>
          <button type="button" onClick={() => setZoomIndex((value) => Math.min(ZOOM_LEVELS.length - 1, value + 1))} disabled={zoomIndex === ZOOM_LEVELS.length - 1} className={toolButton} aria-label="تكبير" title="تكبير"><Plus className="h-3.5 w-3.5" /></button>
          <span className="mx-1 h-4 w-px bg-[#e9e9e7] dark:bg-[#3a3a3a]" />
          <button type="button" onClick={enterFullscreen} className={toolButton} aria-label="ملء الشاشة" title="ملء الشاشة"><Maximize2 className="h-3.5 w-3.5" /></button>
          {sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className={`${toolButton} hidden sm:inline-flex`} aria-label="المصدر الرسمي" title="المصدر الرسمي"><ExternalLink className="h-3.5 w-3.5" /></a>}
          <a href={downloadUrl || fileUrl} download={fileName} className="ms-1 inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium text-[#37352f] transition-colors hover:bg-[#efefed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2383e2] dark:text-[#e9e9e7] dark:hover:bg-[#333]"><Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">تحميل</span></a>
        </div>
      </div>

      <div ref={scrollerRef} className="relative h-[calc(100dvh-10.5rem)] min-h-[540px] overflow-auto bg-[#f7f7f5] py-5 dark:bg-[#191919] sm:py-7">
        {loading && (
          <div className="absolute inset-x-0 top-1/3 z-10 text-center">
            <span className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-[11px] text-[#787774] shadow-sm dark:bg-[#252525] dark:text-[#b8b8b8]">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#d3d3d1] border-t-[#787774]" />
              جارٍ تجهيز نسخة عالية الجودة…
            </span>
          </div>
        )}
        {error && (
          <div className="mx-auto mt-24 max-w-sm px-5 text-center text-sm text-[#787774] dark:text-[#b8b8b8]">
            <p>{error}</p>
            <a href={sourceUrl || fileUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-[#2383e2] hover:underline">فتح الملف الأصلي</a>
          </div>
        )}
        <div ref={pagesRef} className="mx-auto flex w-max min-w-full flex-col items-center gap-6 px-4" />
      </div>

      {!loading && !error && pageCount > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center">
          <div className="pointer-events-auto flex h-8 items-center rounded-md bg-white/95 px-1 shadow-[0_1px_4px_rgba(15,15,15,0.14)] backdrop-blur dark:bg-[#252525]/95">
            <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1} className={toolButton} aria-label="الصفحة السابقة"><ChevronRight className="h-3.5 w-3.5" /></button>
            <span className="min-w-14 text-center text-[10px] tabular-nums text-[#787774] dark:text-[#b8b8b8]">{currentPage} / {pageCount}</span>
            <button type="button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= pageCount} className={toolButton} aria-label="الصفحة التالية"><ChevronLeft className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      )}
    </section>
  );
}
