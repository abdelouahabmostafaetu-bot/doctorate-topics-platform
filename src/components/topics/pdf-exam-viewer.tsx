"use client";

import { useMemo, useRef, useState } from "react";
import {
  Download,
  ExternalLink,
  FileText,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";

type PdfExamViewerProps = {
  fileUrl: string;
  downloadUrl?: string;
  sourceUrl?: string;
  fileName: string;
  title: string;
};

const ZOOM_LEVELS = [75, 90, 100, 110, 125, 150, 175, 200];

export function PdfExamViewer({
  fileUrl,
  downloadUrl,
  sourceUrl,
  fileName,
  title,
}: PdfExamViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [zoomIndex, setZoomIndex] = useState(2);
  const zoom = ZOOM_LEVELS[zoomIndex];

  const viewerUrl = useMemo(() => {
    const cleanUrl = fileUrl.split("#")[0];
    return `${cleanUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH&zoom=${zoom}`;
  }, [fileUrl, zoom]);

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
      className="overflow-hidden rounded-xl border bg-[#f7f7f5] shadow-sm dark:bg-[#202020]"
      aria-label={`قارئ PDF: ${title}`}
    >
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-2 border-b bg-background px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
            <FileText className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold sm:text-sm">{title}</p>
            <p dir="ltr" className="truncate text-left text-[10px] text-muted-foreground sm:text-[11px]">
              {fileName}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1" dir="ltr">
          <div className="flex items-center rounded-lg border bg-background p-0.5" aria-label="أدوات التكبير">
            <button
              type="button"
              onClick={() => setZoomIndex((value) => Math.max(0, value - 1))}
              disabled={zoomIndex === 0}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-35"
              aria-label="تصغير"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-12 text-center text-[11px] font-medium tabular-nums">{zoom}%</span>
            <button
              type="button"
              onClick={() => setZoomIndex((value) => Math.min(ZOOM_LEVELS.length - 1, value + 1))}
              disabled={zoomIndex === ZOOM_LEVELS.length - 1}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-35"
              aria-label="تكبير"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoomIndex(2)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="إعادة التكبير إلى 100 بالمئة"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={enterFullscreen}
            className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="ملء الشاشة"
            title="ملء الشاشة"
          >
            <Maximize2 className="h-4 w-4" />
          </button>

          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              title="فتح المصدر الرسمي"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">المصدر</span>
            </a>
          )}

          <a
            href={downloadUrl || fileUrl}
            download={fileName}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition hover:opacity-90"
          >
            <Download className="h-3.5 w-3.5" />
            تحميل
          </a>
        </div>
      </div>

      <div className="relative h-[68dvh] min-h-[480px] bg-[#e8e8e6] sm:h-[74dvh] sm:min-h-[620px] dark:bg-[#161616]">
        <iframe
          key={viewerUrl}
          src={viewerUrl}
          title={title}
          className="h-full w-full border-0"
          loading="eager"
          allowFullScreen
        />
        <noscript>
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm">
            فعّل JavaScript لعرض الملف أو استخدم زر التحميل.
          </div>
        </noscript>
      </div>
    </section>
  );
}
