"use client";

// بطاقة «📝 ملاحظاتي» في الصفحة الرئيسية — تظهر للمدير الأعلى فقط
// الصفحة الرئيسية مخزّنة (ISR)، لذا نفحص الجلسة من المتصفح (نفس نمط AdminLecturesButton)
import Link from "next/link";
import { useEffect, useState } from "react";

type Summary = {
  isSuper: boolean;
  notebooks?: number | null;
  notes?: number | null;
  recent?: Array<{ title: string; updatedAt: string | null }>;
};

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("ar-DZ", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function MyNotesHomeCard() {
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/mynotes/summary", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { isSuper: false }))
      .then((d: Summary) => {
        if (active) setData(d);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!data?.isSuper) return null;

  return (
    <section className="mt-10">
      <Link
        href="/admin/notes"
        className="group relative block overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-l from-primary/10 via-card to-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/15 sm:p-6"
      >
        {/* زخرفة خلفية ناعمة */}
        <span
          aria-hidden
          className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl transition-transform duration-500 group-hover:scale-125"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-12 left-1/3 h-32 w-32 rounded-full bg-primary/5 blur-2xl"
        />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          {/* التعريف + الإحصائيات */}
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl shadow-inner transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-6">
              📝
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold sm:text-lg">ملاحظاتي</h2>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">
                  🛡️ خاص بالمدير الأعلى
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                دفاترك وملاحظات مراجعتك — دخول سريع للدراسة
              </p>
              {typeof data.notes === "number" && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-primary/20 bg-background/60 px-2 py-0.5 text-[10px] font-medium text-foreground">
                    📚 {data.notebooks ?? 0} دفتر
                  </span>
                  <span className="rounded-full border border-primary/20 bg-background/60 px-2 py-0.5 text-[10px] font-medium text-foreground">
                    🗒️ {data.notes ?? 0} ملاحظة
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* آخر الملاحظات (تُخفى على الشاشات الصغيرة) */}
          {(data.recent?.length ?? 0) > 0 && (
            <ul className="hidden min-w-0 max-w-xs flex-1 space-y-1 md:block">
              {data.recent!.map((n, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 text-[11px]"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                    <span dir="auto" className="truncate text-foreground/80">
                      {n.title}
                    </span>
                  </span>
                  <span className="shrink-0 text-[9px] text-muted-foreground">
                    {fmtDate(n.updatedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* زر الدخول */}
          <span className="flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm transition-all duration-300 group-hover:gap-3 group-hover:shadow-lg group-hover:shadow-primary/25">
            فتح ملاحظاتي
            <span className="transition-transform duration-300 group-hover:-translate-x-0.5">
              ←
            </span>
          </span>
        </div>
      </Link>
    </section>
  );
}
