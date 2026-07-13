"use client";

// ⏱ مؤقّت حل الموضوع — شريط صغير أنيق يظهر أعلى الصفحة عند التشغيل
import { useEffect, useRef, useState } from "react";

function fmt(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? h + ":" + mm + ":" + ss : mm + ":" + ss;
}

export function SolveTimer() {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      interval.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => {
      if (interval.current) clearInterval(interval.current);
      interval.current = null;
    };
  }, [running]);

  if (!open) {
    return (
      <button
        type="button"
        title="ابدأ مؤقّت حل الموضوع — كأنك في المسابقة الحقيقية"
        onClick={() => {
          setOpen(true);
          setRunning(true);
        }}
        className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
      >
        ⏱ مؤقّت
      </button>
    );
  }

  return (
    <>
      {/* شارة صغيرة في مكان الزر تدل على أن المؤقت يعمل */}
      <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 px-3 py-1 text-xs font-medium text-primary">
        ⏱ <span dir="ltr" className="tabular-nums">{fmt(seconds)}</span>
      </span>

      {/* الشريط العائم الجميل أعلى الصفحة */}
      <div className="fixed left-1/2 top-3 z-50 -translate-x-1/2">
        <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-background/95 px-4 py-1.5 shadow-lg backdrop-blur">
          <span className="text-sm">⏱</span>
          <span
            dir="ltr"
            className="min-w-14 text-center font-mono text-sm font-bold tabular-nums"
          >
            {fmt(seconds)}
          </span>
          <button
            type="button"
            title={running ? "إيقاف مؤقت" : "استئناف"}
            onClick={() => setRunning((r) => !r)}
            className="px-1 text-sm transition hover:scale-110"
          >
            {running ? "⏸" : "▶️"}
          </button>
          <button
            type="button"
            title="تصفير"
            onClick={() => setSeconds(0)}
            className="px-1 text-sm transition hover:scale-110"
          >
            🔄
          </button>
          <button
            type="button"
            title="إغلاق المؤقت"
            onClick={() => {
              setOpen(false);
              setRunning(false);
              setSeconds(0);
            }}
            className="px-1 text-xs text-muted-foreground transition hover:text-destructive"
          >
            ✕
          </button>
        </div>
      </div>
    </>
  );
}
