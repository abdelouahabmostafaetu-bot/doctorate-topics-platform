"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink, Maximize2, Minus, Plus } from "lucide-react";

type Page = { page: number; width: number; height: number; url: string };
type Props = { title: string; fileName: string; downloadUrl: string; sourceUrl?: string; pages: Page[] };
const ZOOMS = [75, 90, 100, 115, 130, 150];
const button = "inline-flex h-8 w-8 items-center justify-center rounded-md text-[#6b6b6b] transition hover:bg-[#efefed] hover:text-[#222] disabled:opacity-25 dark:text-[#aaa] dark:hover:bg-[#333] dark:hover:text-white";

function LazyPage({ page, zoom, onVisible }: { page: Page; zoom: number; onVisible: (page: number) => void }) {
  const ref = useRef<HTMLElement>(null);
  const [load, setLoad] = useState(page.page <= 2);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setLoad(true); onVisible(page.page); }
    }, { rootMargin: "1000px 0px", threshold: 0.15 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [onVisible, page.page]);
  const width = Math.round(page.width * zoom / 100);
  const height = Math.round(page.height * zoom / 100);
  return (
    <figure ref={ref} data-page={page.page} className="m-0 flex max-w-none flex-col items-center gap-2" style={{ width, maxWidth: "none" }}>
      <div className="overflow-hidden rounded-[3px] bg-white shadow-[0_1px_2px_rgba(15,15,15,.08),0_8px_28px_rgba(15,15,15,.12)]" style={{ width, height }}>
        {load && <img src={page.url} alt={`صفحة ${page.page}`} width={width} height={height} loading={page.page <= 2 ? "eager" : "lazy"} decoding="async" className="block h-full w-full select-none object-contain" draggable={false} />}
      </div>
      <figcaption className="text-[10px] tabular-nums text-[#9b9a97]">صفحة {page.page}</figcaption>
    </figure>
  );
}

export function ScribdExamViewer({ title, fileName, downloadUrl, sourceUrl, pages }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const [zoomIndex, setZoomIndex] = useState(2);
  const [currentPage, setCurrentPage] = useState(1);
  const zoom = ZOOMS[zoomIndex];
  async function fullscreen() { try { await rootRef.current?.requestFullscreen(); } catch { window.open(downloadUrl, "_blank", "noopener,noreferrer"); } }
  return (
    <section ref={rootRef} className="overflow-hidden bg-[#f7f7f5] dark:bg-[#191919]" aria-label={`قارئ صفحات: ${title}`}>
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-y border-[#e9e9e7] bg-white/95 px-2 py-1.5 backdrop-blur dark:border-[#303030] dark:bg-[#202020]/95 sm:px-3">
        <div className="flex min-w-0 items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded bg-[#f1f1ef] text-[10px] font-bold text-[#787774] dark:bg-[#333]">DOC</span><div className="min-w-0"><p className="max-w-48 truncate text-[11px] font-medium sm:max-w-sm">{title}</p><p className="text-[9px] text-[#9b9a97]">عرض صفحات سريع · {pages.length} صفحة</p></div></div>
        <div className="flex items-center rounded-lg bg-[#f7f7f5] p-0.5 dark:bg-[#292929]" dir="ltr"><button className={button} onClick={() => setZoomIndex((v) => Math.max(0, v - 1))} disabled={zoomIndex === 0}><Minus className="h-4 w-4" /></button><span className="w-11 text-center text-[10px] tabular-nums text-[#787774]">{zoom}%</span><button className={button} onClick={() => setZoomIndex((v) => Math.min(ZOOMS.length - 1, v + 1))} disabled={zoomIndex === ZOOMS.length - 1}><Plus className="h-4 w-4" /></button></div>
        <div className="flex" dir="ltr"><span className="my-auto mr-1 text-[10px] tabular-nums text-[#787774]">{currentPage}/{pages.length}</span><button className={button} onClick={fullscreen} title="ملء الشاشة"><Maximize2 className="h-4 w-4" /></button>{sourceUrl && <a className={button} href={sourceUrl} target="_blank" rel="noopener noreferrer nofollow" title="المصدر"><ExternalLink className="h-4 w-4" /></a>}<a className={button} href={downloadUrl} download={fileName} title="تحميل PDF"><Download className="h-4 w-4" /></a></div>
      </div>
      <div className="h-[calc(100dvh-10.5rem)] min-h-[560px] overflow-auto overscroll-contain bg-[#e9e9e7] px-3 py-5 dark:bg-[#151515] sm:px-6 sm:py-8">
        <div className="mx-auto flex w-max min-w-full flex-col items-center gap-6">
          {pages.map((page) => <LazyPage key={page.page} page={page} zoom={zoom} onVisible={setCurrentPage} />)}
        </div>
      </div>
    </section>
  );
}
