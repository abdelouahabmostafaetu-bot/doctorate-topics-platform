"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, ExternalLink, Maximize2, Minus, Plus } from "lucide-react";

type Props = {
  fileUrl: string;
  downloadUrl?: string;
  sourceUrl?: string;
  fileName: string;
  title: string;
};
type Mode = "native" | "canvas";
type Viewport = { width: number; height: number };
type PdfPage = {
  getViewport: (options: { scale: number }) => Viewport;
  render: (options: { canvasContext: CanvasRenderingContext2D; viewport: Viewport; transform?: number[] }) => { promise: Promise<void> };
};
type PdfDocument = { numPages: number; getPage: (page: number) => Promise<PdfPage>; destroy: () => Promise<void> };
type PdfModule = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (source: { url: string; cMapUrl: string; cMapPacked: boolean; standardFontDataUrl: string; wasmUrl: string }) => { promise: Promise<PdfDocument> };
};

const PDFJS_VERSION = "4.10.38";
const CDN = "https" + "://cdnjs.cloudflare.com/ajax/libs/pdf.js/" + PDFJS_VERSION;
const ASSETS = "https" + "://unpkg.com/pdfjs-dist@" + PDFJS_VERSION;
const ZOOMS = [80, 100, 120, 140, 170, 200];
const iconButton = "inline-flex h-8 w-8 items-center justify-center rounded-md text-[#6b6b6b] transition hover:bg-[#efefed] hover:text-[#222] disabled:opacity-25 dark:text-[#aaa] dark:hover:bg-[#333] dark:hover:text-white";

function NativeReader({ fileUrl, title }: { fileUrl: string; title: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative h-[calc(100dvh-10.5rem)] min-h-[560px] bg-[#f7f7f5] dark:bg-[#191919]">
      {!loaded && <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#f7f7f5] text-xs text-[#787774] dark:bg-[#191919]"><span className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 shadow-sm dark:bg-[#252525]"><span className="h-3 w-3 animate-spin rounded-full border-2 border-[#d3d3d1] border-t-[#2383e2]" />فتح الملف…</span></div>}
      <iframe
        src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
        title={`قارئ ${title}`}
        onLoad={() => setLoaded(true)}
        className="h-full w-full border-0 bg-white"
        loading="eager"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

function CanvasReader({ fileUrl }: { fileUrl: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const documentRef = useRef<PdfDocument | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [zoomIndex, setZoomIndex] = useState(1);
  const [width, setWidth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const zoom = ZOOMS[zoomIndex];

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const update = () => setWidth(host.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(false); setPage(1);
    import(/* webpackIgnore: true */ CDN + "/pdf.min.mjs")
      .then(async (pdfjs) => {
        const module = pdfjs as PdfModule;
        module.GlobalWorkerOptions.workerSrc = CDN + "/pdf.worker.min.mjs";
        const doc = await module.getDocument({ url: fileUrl, cMapUrl: ASSETS + "/cmaps/", cMapPacked: true, standardFontDataUrl: ASSETS + "/standard_fonts/", wasmUrl: ASSETS + "/wasm/" }).promise;
        if (cancelled) { await doc.destroy(); return; }
        documentRef.current = doc; setPages(doc.numPages);
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; const doc = documentRef.current; documentRef.current = null; if (doc) void doc.destroy(); };
  }, [fileUrl]);

  useEffect(() => {
    const doc = documentRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas || width < 200) return;
    let cancelled = false;
    setLoading(true);
    doc.getPage(page).then(async (pdfPage) => {
      if (cancelled) return;
      const natural = pdfPage.getViewport({ scale: 1 });
      const displayScale = (Math.min(width - 24, 980) / natural.width) * (zoom / 100);
      const viewport = pdfPage.getViewport({ scale: displayScale });
      const outputScale = Math.min(3.5, Math.max(2, window.devicePixelRatio || 1));
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("canvas unavailable");
      canvas.width = Math.ceil(viewport.width * outputScale);
      canvas.height = Math.ceil(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      await pdfPage.render({ canvasContext: context, viewport, transform: [outputScale, 0, 0, outputScale, 0, 0] }).promise;
    }).catch(() => !cancelled && setError(true)).finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [page, width, zoom]);

  return (
    <div ref={hostRef} className="relative h-[calc(100dvh-10.5rem)] min-h-[560px] overflow-auto bg-[#f7f7f5] dark:bg-[#191919]">
      <div className="sticky top-0 z-20 flex h-10 items-center justify-center gap-1 border-b border-[#e9e9e7] bg-white/95 backdrop-blur dark:border-[#303030] dark:bg-[#202020]/95" dir="ltr">
        <button className={iconButton} onClick={() => setPage((v) => Math.max(1, v - 1))} disabled={page <= 1} aria-label="السابق"><ChevronLeft className="h-4 w-4" /></button>
        <span className="min-w-16 text-center text-[11px] tabular-nums text-[#787774]">{page} / {pages || "—"}</span>
        <button className={iconButton} onClick={() => setPage((v) => Math.min(pages, v + 1))} disabled={!pages || page >= pages} aria-label="التالي"><ChevronRight className="h-4 w-4" /></button>
        <span className="mx-2 h-4 w-px bg-[#e9e9e7] dark:bg-[#3a3a3a]" />
        <button className={iconButton} onClick={() => setZoomIndex((v) => Math.max(0, v - 1))} disabled={zoomIndex === 0} aria-label="تصغير"><Minus className="h-4 w-4" /></button>
        <span className="w-10 text-center text-[10px] tabular-nums text-[#787774]">{zoom}%</span>
        <button className={iconButton} onClick={() => setZoomIndex((v) => Math.min(ZOOMS.length - 1, v + 1))} disabled={zoomIndex === ZOOMS.length - 1} aria-label="تكبير"><Plus className="h-4 w-4" /></button>
      </div>
      {loading && <div className="absolute inset-x-0 top-24 z-10 text-center text-xs text-[#787774]">جارٍ تجهيز الصفحة…</div>}
      {error ? <div className="mx-auto mt-28 max-w-sm px-4 text-center text-sm text-[#787774]">تعذر تشغيل العرض الدقيق. استخدم وضع القراءة السريعة.</div> : <div className="flex min-h-full justify-center p-3 sm:p-6"><canvas ref={canvasRef} className="h-max max-w-none rounded-[3px] bg-white shadow-[0_2px_16px_rgba(15,15,15,.12)]" /></div>}
    </div>
  );
}

export function PdfExamViewer({ fileUrl, downloadUrl, sourceUrl, fileName, title }: Props) {
  const viewerRef = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<Mode>("native");
  const modeClass = (value: Mode) => `h-7 rounded-md px-2.5 text-[10px] font-medium transition ${mode === value ? "bg-[#37352f] text-white dark:bg-[#e9e9e7] dark:text-[#191919]" : "text-[#787774] hover:bg-[#efefed] dark:hover:bg-[#333]"}`;
  async function fullscreen() {
    try { await viewerRef.current?.requestFullscreen(); }
    catch { window.open(fileUrl, "_blank", "noopener,noreferrer"); }
  }
  return (
    <section ref={viewerRef} className="overflow-hidden bg-[#f7f7f5] dark:bg-[#191919]" aria-label={`قارئ PDF: ${title}`}>
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 border-y border-[#e9e9e7] bg-white/95 px-2 py-1.5 backdrop-blur dark:border-[#303030] dark:bg-[#202020]/95 sm:px-3">
        <div className="flex min-w-0 items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#f1f1ef] text-[10px] font-bold text-[#787774] dark:bg-[#333]">PDF</span><div className="min-w-0"><p className="max-w-44 truncate text-[11px] font-medium text-[#37352f] dark:text-[#e9e9e7] sm:max-w-sm">{title}</p><p className="text-[9px] text-[#9b9a97]">قارئ ثابت وسريع</p></div></div>
        <div className="flex rounded-lg bg-[#f7f7f5] p-0.5 dark:bg-[#292929]" dir="rtl"><button type="button" onClick={() => setMode("native")} className={modeClass("native")}>سريع</button><button type="button" onClick={() => setMode("canvas")} className={modeClass("canvas")}>دقة عالية</button></div>
        <div className="flex items-center" dir="ltr"><button type="button" onClick={fullscreen} className={iconButton} title="ملء الشاشة"><Maximize2 className="h-4 w-4" /></button>{sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className={iconButton} title="المصدر"><ExternalLink className="h-4 w-4" /></a>}<a href={downloadUrl || fileUrl} download={fileName} className={iconButton} title="تحميل"><Download className="h-4 w-4" /></a></div>
      </div>
      {mode === "native" ? <NativeReader fileUrl={fileUrl} title={title} /> : <CanvasReader fileUrl={fileUrl} />}
    </section>
  );
}
