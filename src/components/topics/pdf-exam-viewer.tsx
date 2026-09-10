"use client";

import { useMemo, useRef, useState } from "react";
import {
  Download,
  ExternalLink,
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
      className="bg-background"
      aria-label={`قارئ PDF: ${title}`}
    >
      <div className="flex min-h-11 items-center justify-between gap-2 border-y bg-background px-1.5 sm:px-2">
        <div className="min-w-0 px-1.5">
          <p className="truncate text-xs font-medium">{title}</p>
          <p
            dir="ltr"
            className="hidden truncate text-left text-[10px] text-muted-foreground sm:block"
          >
            {fileName}
          </p>
        </div>

        <div className="flex shrink-0 items-center" dir="ltr">
          <button
            type="button"
            onClick={() => setZoomIndex((value) => Math.max(0, value - 1))}
            disabled={zoomIndex === 0}
            className={iconButton}
            aria-label="تصغير"
            title="تصغير"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-10 text-center text-[10px] tabular-nums text-muted-foreground">
            {zoom}%
          </span>
          <button
            type="button"
            onClick={() =>
              setZoomIndex((value) =>
                Math.min(ZOOM_LEVELS.length - 1, value + 1),
              )
            }
            disabled={zoomIndex === ZOOM_LEVELS.length - 1}
            className={iconButton}
            aria-label="تكبير"
            title="تكبير"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoomIndex(2)}
            className={`${iconButton} hidden sm:inline-flex`}
            aria-label="إعادة الحجم"
            title="الحجم الأصلي"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <span className="mx-1 h-5 w-px bg-border" />
          <button
            type="button"
            onClick={enterFullscreen}
            className={iconButton}
            aria-label="ملء الشاشة"
            title="ملء الشاشة"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className={`${iconButton} hidden sm:inline-flex`}
              aria-label="المصدر الرسمي"
              title="المصدر الرسمي"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <a
            href={downloadUrl || fileUrl}
            download={fileName}
            className="ms-1 inline-flex h-8 items-center gap-1.5 bg-foreground px-2.5 text-[11px] font-medium text-background transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">تحميل</span>
          </a>
        </div>
      </div>

      <div className="relative h-[calc(100dvh-11rem)] min-h-[520px] bg-[#eeeeec] sm:h-[calc(100dvh-10rem)] dark:bg-[#171717]">
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
            فعّل JavaScript لقراءة الملف أو استخدم زر التحميل.
          </div>
        </noscript>
      </div>
    </section>
  );
}
