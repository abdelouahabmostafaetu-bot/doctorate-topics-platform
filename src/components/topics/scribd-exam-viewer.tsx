"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, ExternalLink, Maximize2, Minus, Plus, RotateCcw } from "lucide-react";

type Page = { page: number; width: number; height: number; url: string };
type Props = { title: string; fileName: string; downloadUrl: string; sourceUrl?: string; pages: Page[] };
type PinchState = { distance: number; zoom: number; logicalX: number; logicalY: number; localX: number; localY: number };
const MIN_ZOOM = 50;
const MAX_ZOOM = 250;
const button = "inline-flex h-8 w-8 items-center justify-center rounded-md text-[#6b6b6b] transition hover:bg-[#efefed] hover:text-[#222] disabled:opacity-25 dark:text-[#aaa] dark:hover:bg-[#333] dark:hover:text-white";
const clamp = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
const touchDistance = (touches: TouchList) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
const touchCenter = (touches: TouchList) => ({ x: (touches[0].clientX + touches[1].clientX) / 2, y: (touches[0].clientY + touches[1].clientY) / 2 });

function LazyPage({ page, zoom, availableWidth, scrollRoot, onVisible }: { page: Page; zoom: number; availableWidth: number; scrollRoot: HTMLDivElement | null; onVisible: (page: number) => void }) {
  const ref = useRef<HTMLElement>(null);
  const [load, setLoad] = useState(page.page <= 2);
  useEffect(() => {
    const node = ref.current;
    if (!node || !scrollRoot) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setLoad(true); onVisible(page.page); }
    }, { root: scrollRoot, rootMargin: "1200px 0px", threshold: [0.12, 0.45] });
    observer.observe(node);
    return () => observer.disconnect();
  }, [onVisible, page.page, scrollRoot]);
  const fittedWidth = Math.min(page.width, Math.max(280, availableWidth - 24));
  const width = Math.max(180, Math.round(fittedWidth * zoom / 100));
  const height = Math.round(width * page.height / page.width);
  return (
    <figure ref={ref} data-page={page.page} className="m-0 flex shrink-0 flex-col items-center gap-2" style={{ width }}>
      <div className="overflow-hidden rounded-[3px] bg-white shadow-[0_1px_2px_rgba(15,15,15,.08),0_8px_28px_rgba(15,15,15,.12)]" style={{ width, height }}>
        {load && <img src={page.url} alt={`صفحة ${page.page}`} width={width} height={height} loading={page.page <= 2 ? "eager" : "lazy"} fetchPriority={page.page === 1 ? "high" : "auto"} decoding="async" className="block h-full w-full select-none object-contain" draggable={false} />}
      </div>
      <figcaption className="select-none text-[10px] tabular-nums text-[#9b9a97]">صفحة {page.page}</figcaption>
    </figure>
  );
}

export function ScribdExamViewer({ title, fileName, downloadUrl, sourceUrl, pages }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef<PinchState | null>(null);
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [availableWidth, setAvailableWidth] = useState(900);
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);
  const showPage = useCallback((value: number) => setCurrentPage(value), []);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    setScrollRoot(node);
    const updateWidth = () => setAvailableWidth(node.clientWidth);
    updateWidth();
    const resize = new ResizeObserver(updateWidth);
    resize.observe(node);

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      const center = touchCenter(event.touches);
      const rect = node.getBoundingClientRect();
      const localX = center.x - rect.left;
      const localY = center.y - rect.top;
      const scale = zoom / 100;
      pinchRef.current = {
        distance: touchDistance(event.touches), zoom,
        logicalX: (node.scrollLeft + localX) / scale,
        logicalY: (node.scrollTop + localY) / scale,
        localX, localY,
      };
    };
    const onTouchMove = (event: TouchEvent) => {
      const start = pinchRef.current;
      if (!start || event.touches.length !== 2) return;
      event.preventDefault();
      const nextZoom = clamp(Math.round(start.zoom * touchDistance(event.touches) / start.distance));
      const center = touchCenter(event.touches);
      const rect = node.getBoundingClientRect();
      const localX = center.x - rect.left;
      const localY = center.y - rect.top;
      setZoom(nextZoom);
      requestAnimationFrame(() => {
        const scale = nextZoom / 100;
        node.scrollLeft = Math.max(0, start.logicalX * scale - localX);
        node.scrollTop = Math.max(0, start.logicalY * scale - localY);
      });
    };
    const onTouchEnd = (event: TouchEvent) => { if (event.touches.length < 2) pinchRef.current = null; };
    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchmove", onTouchMove, { passive: false });
    node.addEventListener("touchend", onTouchEnd, { passive: true });
    node.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      resize.disconnect();
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", onTouchEnd);
      node.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [zoom]);

  const changeZoom = (next: number) => {
    const node = scrollerRef.current;
    const oldScale = zoom / 100;
    const nextZoom = clamp(next);
    const nextScale = nextZoom / 100;
    if (node) {
      const centerX = node.scrollLeft + node.clientWidth / 2;
      const centerY = node.scrollTop + node.clientHeight / 2;
      setZoom(nextZoom);
      requestAnimationFrame(() => {
        node.scrollLeft = centerX / oldScale * nextScale - node.clientWidth / 2;
        node.scrollTop = centerY / oldScale * nextScale - node.clientHeight / 2;
      });
    } else setZoom(nextZoom);
  };
  async function fullscreen() { try { await rootRef.current?.requestFullscreen(); } catch { window.open(downloadUrl, "_blank", "noopener,noreferrer"); } }

  return (
    <section ref={rootRef} className="overflow-hidden bg-[#f7f7f5] dark:bg-[#191919]" aria-label={`القارئ المحسن: ${title}`}>
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-y border-[#e9e9e7] bg-white/95 px-2 py-1.5 backdrop-blur dark:border-[#303030] dark:bg-[#202020]/95 sm:px-3">
        <div className="flex min-w-0 items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded bg-[#f1f1ef] text-[10px] font-bold text-[#787774] dark:bg-[#333]">DOC</span><div className="min-w-0"><p className="max-w-48 truncate text-[11px] font-medium sm:max-w-sm">{title}</p><p className="text-[9px] text-[#9b9a97]">العرض المحسن · اسحب بإصبعين للتكبير</p></div></div>
        <div className="flex items-center rounded-lg bg-[#f7f7f5] p-0.5 dark:bg-[#292929]" dir="ltr"><button className={button} onClick={() => changeZoom(zoom - 15)} disabled={zoom <= MIN_ZOOM} aria-label="تصغير"><Minus className="h-4 w-4" /></button><button className="h-8 min-w-12 rounded-md px-1 text-[10px] tabular-nums text-[#787774] hover:bg-[#efefed]" onClick={() => changeZoom(100)} title="إعادة الضبط">{zoom}%</button><button className={button} onClick={() => changeZoom(zoom + 15)} disabled={zoom >= MAX_ZOOM} aria-label="تكبير"><Plus className="h-4 w-4" /></button><button className={button} onClick={() => changeZoom(100)} disabled={zoom === 100} aria-label="إعادة ضبط التكبير"><RotateCcw className="h-3.5 w-3.5" /></button></div>
        <div className="flex" dir="ltr"><span className="my-auto mr-1 text-[10px] tabular-nums text-[#787774]">{currentPage}/{pages.length}</span><button className={button} onClick={fullscreen} title="ملء الشاشة"><Maximize2 className="h-4 w-4" /></button>{sourceUrl && <a className={button} href={sourceUrl} target="_blank" rel="noopener noreferrer nofollow" title="المصدر"><ExternalLink className="h-4 w-4" /></a>}<a className={button} href={downloadUrl} download={fileName} title="تحميل PDF"><Download className="h-4 w-4" /></a></div>
      </div>
      <div ref={scrollerRef} style={{ touchAction: "pan-x pan-y" }} className="h-[calc(100dvh-10.5rem)] min-h-[560px] overflow-auto overscroll-contain bg-[#e9e9e7] px-3 py-5 dark:bg-[#151515] sm:px-6 sm:py-8">
        <div className="mx-auto flex w-max min-w-full flex-col items-center gap-6">
          {pages.map((page) => <LazyPage key={page.page} page={page} zoom={zoom} availableWidth={availableWidth} scrollRoot={scrollRoot} onVisible={showPage} />)}
        </div>
      </div>
    </section>
  );
}
