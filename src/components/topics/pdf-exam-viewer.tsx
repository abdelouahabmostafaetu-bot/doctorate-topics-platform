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

type ReaderMode = "pdfium" | "pdfjs" | "compatibility";
type PdfViewport = { width: number; height: number };
type PdfPage = {
  getViewport: (options: { scale: number }) => PdfViewport;
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewport;
    transform?: number[];
  }) => { promise: Promise<void> };
};
type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
  destroy: () => Promise<void>;
};
type PdfLoadingOptions = {
  url: string;
  cMapUrl?: string;
  cMapPacked?: boolean;
  standardFontDataUrl?: string;
  wasmUrl?: string;
  disableFontFace?: boolean;
};
type PdfJsModule = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (
    source: string | PdfLoadingOptions,
  ) => { promise: Promise<PdfDocument> };
};
type EmbedPdfInstance = { destroy?: () => void | Promise<void> };
type EmbedPdfModule = {
  default: {
    init: (options: {
      type: "container";
      target: HTMLElement;
      src: string;
      theme: { preference: "system" };
    }) => EmbedPdfInstance | Promise<EmbedPdfInstance>;
  };
};

const PDFJS_VERSION = "4.10.38";
const PDFJS_BASE =
  "https" + "://cdnjs.cloudflare.com/ajax/libs/pdf.js/" + PDFJS_VERSION;
const PDFJS_ASSET_BASE =
  "https" + "://unpkg.com/pdfjs-dist@" + PDFJS_VERSION;
const PDFJS_MODULE_URL = PDFJS_BASE + "/pdf.min.mjs";
const PDFJS_WORKER_URL = PDFJS_BASE + "/pdf.worker.min.mjs";
const EMBEDPDF_MODULE_URL =
  "https" + "://cdn.jsdelivr.net/npm/@embedpdf/snippet@2/dist/embedpdf.js";
const ZOOM_LEVELS = [70, 85, 100, 115, 130, 150, 175, 200];
const toolButton =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#6b6b6b] transition-colors hover:bg-[#efefed] hover:text-[#2f2f2f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2383e2] disabled:opacity-25 dark:text-[#a7a7a7] dark:hover:bg-[#333] dark:hover:text-white";

function PdfiumReader({
  fileUrl,
  onFailure,
}: {
  fileUrl: string;
  onFailure: () => void;
}) {
  const targetRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let instance: EmbedPdfInstance | null = null;

    async function mountViewer() {
      const target = targetRef.current;
      if (!target) return;

      try {
        const module = (await import(
          /* webpackIgnore: true */ EMBEDPDF_MODULE_URL
        )) as EmbedPdfModule;
        if (cancelled) return;
        instance = await module.default.init({
          type: "container",
          target,
          src: fileUrl,
          theme: { preference: "system" },
        });
        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) onFailure();
      }
    }

    void mountViewer();
    return () => {
      cancelled = true;
      if (instance?.destroy) void instance.destroy();
      targetRef.current?.replaceChildren();
    };
  }, [fileUrl, onFailure]);

  return (
    <div className="relative h-full min-h-[540px] bg-[#f7f7f5] dark:bg-[#191919]">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#f7f7f5] dark:bg-[#191919]">
          <span className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-[11px] text-[#787774] shadow-sm dark:bg-[#252525] dark:text-[#b8b8b8]">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#d3d3d1] border-t-[#2383e2]" />
            جارٍ تشغيل محرك PDFium عالي الدقة…
          </span>
        </div>
      )}
      <div ref={targetRef} className="h-full min-h-[540px] w-full" />
    </div>
  );
}

function PdfJsReader({
  fileUrl,
  compatibilityMode,
}: {
  fileUrl: string;
  compatibilityMode: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [zoomIndex, setZoomIndex] = useState(2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [sizeRevision, setSizeRevision] = useState(0);
  const zoom = ZOOM_LEVELS[zoomIndex];

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || typeof ResizeObserver === "undefined") return;
    let previousWidth = scroller.clientWidth;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new ResizeObserver(() => {
      const nextWidth = scroller.clientWidth;
      if (Math.abs(nextWidth - previousWidth) < 2) return;
      previousWidth = nextWidth;
      clearTimeout(timer);
      timer = setTimeout(() => setSizeRevision((value) => value + 1), 160);
    });
    observer.observe(scroller);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

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
        const source: PdfLoadingOptions = {
          url: fileUrl,
          cMapUrl: PDFJS_ASSET_BASE + "/cmaps/",
          cMapPacked: true,
          standardFontDataUrl: PDFJS_ASSET_BASE + "/standard_fonts/",
          wasmUrl: PDFJS_ASSET_BASE + "/wasm/",
          disableFontFace: compatibilityMode,
        };
        const pdf = await pdfjs.getDocument(source).promise;
        documentToDestroy = pdf;
        if (cancelled) return;
        setPageCount(pdf.numPages);

        const outputScale = Math.min(
          4,
          Math.max(2, window.devicePixelRatio || 1),
        );
        const firstPage = await pdf.getPage(1);
        const naturalViewport = firstPage.getViewport({ scale: 1 });
        const availableWidth = Math.max(
          280,
          Math.min(scroller.clientWidth - 24, 920),
        );
        const displayScale =
          (availableWidth / naturalViewport.width) * (zoom / 100);

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled) return;
          const page = pageNumber === 1 ? firstPage : await pdf.getPage(pageNumber);
          const displayViewport = page.getViewport({ scale: displayScale });
          const wrapper = document.createElement("figure");
          wrapper.dataset.page = String(pageNumber);
          wrapper.className = "m-0 flex scroll-mt-5 flex-col items-center gap-2";

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d", { alpha: false });
          if (!context) throw new Error("Canvas is unavailable");
          const canvasWidth = Math.ceil(displayViewport.width * outputScale);
          const canvasHeight = Math.ceil(displayViewport.height * outputScale);
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
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
            viewport: displayViewport,
            transform: [outputScale, 0, 0, outputScale, 0, 0],
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
          setError("تعذر عرض الملف بهذا المحرك. جرّب وضع PDFium.");
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
  }, [compatibilityMode, fileUrl, sizeRevision, zoom]);

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

  return (
    <div className="relative">
      <div className="flex h-9 items-center justify-center gap-0.5 border-b border-[#e9e9e7] bg-white/90 dark:border-[#303030] dark:bg-[#202020]" dir="ltr">
        <button type="button" onClick={() => setZoomIndex((value) => Math.max(0, value - 1))} disabled={zoomIndex === 0} className={toolButton} aria-label="تصغير"><Minus className="h-3.5 w-3.5" /></button>
        <span className="w-10 text-center text-[10px] tabular-nums text-[#787774] dark:text-[#a7a7a7]">{zoom}%</span>
        <button type="button" onClick={() => setZoomIndex((value) => Math.min(ZOOM_LEVELS.length - 1, value + 1))} disabled={zoomIndex === ZOOM_LEVELS.length - 1} className={toolButton} aria-label="تكبير"><Plus className="h-3.5 w-3.5" /></button>
        <span className="mx-2 text-[10px] text-[#9b9a97]" dir="rtl">
          {compatibilityMode ? "خطوط بديلة" : "Canvas عالي الدقة"}
        </span>
      </div>

      <div ref={scrollerRef} className="relative h-[calc(100dvh-12.75rem)] min-h-[540px] overflow-auto bg-[#f7f7f5] py-5 dark:bg-[#191919] sm:py-7">
        {loading && (
          <div className="absolute inset-x-0 top-1/3 z-10 text-center">
            <span className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-[11px] text-[#787774] shadow-sm dark:bg-[#252525] dark:text-[#b8b8b8]">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#d3d3d1] border-t-[#787774]" />
              جارٍ تجهيز الصفحات بدقة {Math.min(4, Math.max(2, typeof window === "undefined" ? 2 : window.devicePixelRatio || 1)).toFixed(1)}×…
            </span>
          </div>
        )}
        {error && <div className="mx-auto mt-24 max-w-sm px-5 text-center text-sm text-[#787774] dark:text-[#b8b8b8]">{error}</div>}
        <div ref={pagesRef} className="mx-auto flex w-max min-w-full flex-col items-center gap-6 px-3" />
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
    </div>
  );
}

export function PdfExamViewer({
  fileUrl,
  downloadUrl,
  sourceUrl,
  fileName,
  title,
}: PdfExamViewerProps) {
  const viewerRef = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<ReaderMode>("pdfium");

  async function enterFullscreen() {
    try {
      await viewerRef.current?.requestFullscreen();
    } catch {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
    }
  }

  const modeButton = (value: ReaderMode) =>
    `h-7 rounded-md px-2 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2383e2] ${
      mode === value
        ? "bg-[#37352f] text-white dark:bg-[#e9e9e7] dark:text-[#191919]"
        : "text-[#787774] hover:bg-[#efefed] dark:text-[#b8b8b8] dark:hover:bg-[#333]"
    }`;

  return (
    <section ref={viewerRef} className="relative overflow-hidden bg-[#f7f7f5] dark:bg-[#191919]" aria-label={`قارئ PDF: ${title}`}>
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-1 border-y border-[#e9e9e7] bg-white/95 px-2 py-1.5 backdrop-blur-md dark:border-[#303030] dark:bg-[#202020]/95 sm:px-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#f1f1ef] text-xs font-semibold text-[#787774] dark:bg-[#333] dark:text-[#b8b8b8]">PDF</span>
          <div className="min-w-0">
            <p className="max-w-40 truncate text-[11px] font-medium text-[#37352f] dark:text-[#e9e9e7] sm:max-w-xs">{title}</p>
            <p className="text-[9px] text-[#9b9a97]">قارئ متعدد المحركات</p>
          </div>
        </div>

        <div className="flex items-center rounded-lg bg-[#f7f7f5] p-0.5 dark:bg-[#292929]" dir="rtl" aria-label="اختيار محرك القراءة">
          <button type="button" onClick={() => setMode("pdfium")} className={modeButton("pdfium")}>PDFium</button>
          <button type="button" onClick={() => setMode("pdfjs")} className={modeButton("pdfjs")}>PDF.js</button>
          <button type="button" onClick={() => setMode("compatibility")} className={modeButton("compatibility")}>توافق</button>
        </div>

        <div className="flex items-center gap-0.5" dir="ltr">
          <button type="button" onClick={enterFullscreen} className={toolButton} aria-label="ملء الشاشة" title="ملء الشاشة"><Maximize2 className="h-3.5 w-3.5" /></button>
          {sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className={toolButton} aria-label="المصدر الرسمي" title="المصدر الرسمي"><ExternalLink className="h-3.5 w-3.5" /></a>}
          <a href={downloadUrl || fileUrl} download={fileName} className={toolButton} aria-label="تحميل" title="تحميل"><Download className="h-3.5 w-3.5" /></a>
        </div>
      </div>

      <div className="h-[calc(100dvh-10.5rem)] min-h-[540px]">
        {mode === "pdfium" ? (
          <PdfiumReader fileUrl={fileUrl} onFailure={() => setMode("compatibility")} />
        ) : (
          <PdfJsReader fileUrl={fileUrl} compatibilityMode={mode === "compatibility"} />
        )}
      </div>
    </section>
  );
}
