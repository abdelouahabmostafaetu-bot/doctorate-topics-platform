"use client";

// 📖 وضع القراءة — تركيز كامل: تمرين واحد فقط في الشاشة
// اختصارات لوحة المفاتيح:
//   ↓ / Space / PageDown : التمرين التالي
//   ↑ / PageUp           : التمرين السابق
//   ← / →                : الموضوع التالي / السابق (ضمن نفس الفلترة)
//   + / -                : تكبير / تصغير الخط
//   D                    : تبديل ليلي / نهاري
//   Esc                  : خروج
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MathContent } from "@/components/math-content";

export type ReadingProblem = {
  problemNumber: number;
  title: string | null;
  tags: string[];
  statement: string;
  solution: string | null;
  remark: string | null;
  hasSolution: boolean;
};

type Props = {
  topicTitle: string;
  infoLine: string;
  problems: ReadingProblem[];
  durationMinutes: number | null;
  prevHref: string | null;
  prevLabel: string | null;
  nextHref: string | null;
  nextLabel: string | null;
  autoOpen?: boolean;
};

const FONT_STEPS = [0.85, 1, 1.15, 1.3, 1.5];

function fmt(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? h + ":" + mm + ":" + ss : mm + ":" + ss;
}

/** يضيف reading=1 إلى الرابط حتى يبقى وضع القراءة مفتوحًا بعد الانتقال */
function withReading(href: string): string {
  return href + (href.includes("?") ? "&" : "?") + "reading=1";
}

export function ReadingMode({
  topicTitle,
  infoLine,
  problems,
  durationMinutes,
  prevHref,
  prevLabel,
  nextHref,
  nextLabel,
  autoOpen = false,
}: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [dark, setDark] = useState(false);
  const [fontIdx, setFontIdx] = useState(1);
  const [showSolution, setShowSolution] = useState(false);
  // إشعار اقتراح إضافة AI Side Panel — يظهر حتى يغلقه المستخدم نهائياً بزر ✕
  const [extNotice, setExtNotice] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("rm-ext-notice") !== "1") setExtNotice(true);
    } catch {
      // تجاهل
    }
  }, []);

  function dismissExtNotice() {
    setExtNotice(false);
    try {
      localStorage.setItem("rm-ext-notice", "1");
    } catch {
      // تجاهل
    }
  }

  // ⏱ المؤقت
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);
  const [showRemaining, setShowRemaining] = useState(false);

  const secondsRef = useRef(0);
  const runningRef = useRef(true);
  const contentRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);
  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  // استرجاع التفضيلات المحفوظة (الوضع الليلي + حجم الخط)
  useEffect(() => {
    try {
      const savedDark = localStorage.getItem("rm-dark");
      if (savedDark != null) setDark(savedDark === "1");
      else setDark(document.documentElement.classList.contains("dark"));
      const savedFont = parseInt(localStorage.getItem("rm-font") ?? "1", 10);
      if (
        !Number.isNaN(savedFont) &&
        savedFont >= 0 &&
        savedFont < FONT_STEPS.length
      ) {
        setFontIdx(savedFont);
      }
    } catch {
      // تجاهل أخطاء التخزين المحلي
    }
  }, []);

  /** الدخول إلى وضع القراءة — restore=true عند القدوم من موضوع آخر (يُكمل المؤقت) */
  function enter(restore: boolean) {
    let sec = 0;
    let run = true;
    if (restore) {
      try {
        sec = parseInt(sessionStorage.getItem("rm-sec") ?? "0", 10) || 0;
        run = sessionStorage.getItem("rm-run") !== "0";
      } catch {
        // تجاهل
      }
    }
    setSeconds(sec);
    setRunning(run);
    setIndex(0);
    setShowSolution(false);
    setOpen(true);
    // إخفاء قوائم المتصفح — قراءة بملء الشاشة (قد يتجاهله المتصفح إن لم يكن بنقرة مباشرة)
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  /** الخروج من وضع القراءة */
  function close() {
    setOpen(false);
    setRunning(false);
    try {
      sessionStorage.removeItem("rm-sec");
      sessionStorage.removeItem("rm-run");
    } catch {
      // تجاهل
    }
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    // إزالة reading=1 من الرابط حتى لا يعود الوضع عند تحديث الصفحة
    try {
      const u = new URL(window.location.href);
      if (u.searchParams.has("reading")) {
        u.searchParams.delete("reading");
        window.history.replaceState(null, "", u.toString());
      }
    } catch {
      // تجاهل
    }
  }

  /** الانتقال إلى موضوع آخر دون الخروج من وضع القراءة (المؤقت يستمر) */
  function goTopic(href: string) {
    try {
      sessionStorage.setItem("rm-sec", String(secondsRef.current));
      sessionStorage.setItem("rm-run", runningRef.current ? "1" : "0");
    } catch {
      // تجاهل
    }
    router.push(withReading(href));
  }

  function toggleDark() {
    setDark((d) => {
      try {
        localStorage.setItem("rm-dark", d ? "0" : "1");
      } catch {
        // تجاهل
      }
      return !d;
    });
  }

  function changeFont(delta: number) {
    setFontIdx((i) => {
      const next = Math.min(FONT_STEPS.length - 1, Math.max(0, i + delta));
      try {
        localStorage.setItem("rm-font", String(next));
      } catch {
        // تجاهل
      }
      return next;
    });
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  }

  // فتح تلقائي عند القدوم من موضوع آخر (reading=1 في الرابط)
  useEffect(() => {
    if (autoOpen && problems.length > 0) enter(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

  // منع تمرير الصفحة الخلفية أثناء وضع القراءة
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // عدّاد المؤقت
  useEffect(() => {
    if (!open || !running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [open, running]);

  // إعادة التمرير للأعلى + إخفاء الحل عند تغيير التمرين
  useEffect(() => {
    setShowSolution(false);
    contentRef.current?.scrollTo({ top: 0 });
  }, [index]);

  // اختصارات لوحة المفاتيح
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, problems.length - 1));
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        setIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Home") {
        e.preventDefault();
        setIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setIndex(problems.length - 1);
      } else if (e.key === "ArrowLeft") {
        // في واجهة RTL: اليسار = الموضوع التالي
        if (nextHref) {
          e.preventDefault();
          goTopic(nextHref);
        }
      } else if (e.key === "ArrowRight") {
        // في واجهة RTL: اليمين = الموضوع السابق
        if (prevHref) {
          e.preventDefault();
          goTopic(prevHref);
        }
      } else if (e.key === "+" || e.key === "=") {
        changeFont(1);
      } else if (e.key === "-") {
        changeFont(-1);
      } else if (e.key.toLowerCase() === "d") {
        toggleDark();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, problems.length, nextHref, prevHref]);

  if (problems.length === 0) return null;

  // لوحة الألوان الخاصة بوضع القراءة (مستقلة عن وضع الموقع)
  const pal = dark
    ? {
        root: "bg-[#0b1220] text-slate-100",
        soft: "text-slate-400",
        pill: "border-slate-700 bg-slate-900/85",
        btn: "border-slate-700 text-slate-300 hover:border-sky-400 hover:text-sky-300",
        accent: "text-sky-300",
        track: "bg-slate-800",
        bar: "bg-sky-400",
        divider: "from-slate-700",
        solution: "border-sky-400/40",
      }
    : {
        root: "bg-[#faf7f1] text-slate-900",
        soft: "text-slate-500",
        pill: "border-slate-200 bg-white/90",
        btn: "border-slate-300 text-slate-600 hover:border-blue-600 hover:text-blue-700",
        accent: "text-blue-700",
        track: "bg-slate-200",
        bar: "bg-blue-600",
        divider: "from-slate-300",
        solution: "border-blue-600/40",
      };

  const p = problems[Math.min(index, problems.length - 1)];
  const isLast = index === problems.length - 1;
  const durationSec = durationMinutes ? durationMinutes * 60 : null;
  const remaining = durationSec != null ? durationSec - seconds : null;
  const overtime = remaining != null && remaining < 0;

  const roundBtn =
    "flex items-center justify-center rounded-full border shadow-sm backdrop-blur transition hover:scale-105 " +
    pal.btn;

  return (
    <>
      {/* زر الدخول — بجانب أزرار الموضوع */}
      <button
        type="button"
        title="وضع القراءة — تمرين واحد في الشاشة بتركيز كامل (Esc للخروج)"
        onClick={() => enter(false)}
        className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
      >
        📖 وضع القراءة
      </button>

      {open && (
        <div
          dir="rtl"
          className={"fixed inset-0 z-[100] flex flex-col " + pal.root}
        >
          {/* إشعار بسيط: اقتراح تثبيت إضافة AI Side Panel (يُغلق نهائياً بزر ✕) */}
          {extNotice && (
            <div className="fixed bottom-5 left-5 z-[120] flex max-w-sm items-start gap-2 rounded-xl border border-zinc-400/30 bg-zinc-900/95 px-4 py-3 text-white shadow-2xl backdrop-blur">
              <div className="min-w-0 text-[12px] leading-6">
                <p className="font-semibold">
                  💡 هل تريد مساعدة الذكاء الاصطناعي أثناء الحل؟
                </p>
                <p className="opacity-90">
                  ثبّت إضافة{" "}
                  <a
                    href="https://chromewebstore.google.com/detail/ai-side-panel/icapcpllhdnnpcmfdcgpnbgchfenmjmg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline underline-offset-2 hover:opacity-80"
                  >
                    AI Side Panel
                  </a>{" "}
                  المجانية — تفتح ChatGPT أو Gemini بجانب التمرين في نفس
                  النافذة دون مغادرة الصفحة (متوفرة لـ Chrome وأيضاً{" "}
                  <a
                    href="https://microsoftedge.microsoft.com/addons/detail/ai-side-panel/okldldohcpoeldjackkdakhoflphiipn"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline underline-offset-2 hover:opacity-80"
                  >
                    Edge
                  </a>
                  ).
                </p>
              </div>
              <button
                type="button"
                onClick={dismissExtNotice}
                title="إغلاق هذا الإشعار نهائياً"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm opacity-70 transition hover:bg-white/15 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          )}
          {/* ===== الشريط العلوي ===== */}
          <header className="flex items-center gap-2 px-3 py-2 sm:px-5">
            {/* يمين: عنوان الموضوع + عداد التمارين */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-bold sm:text-sm">
                {topicTitle}
              </p>
              <p className={"truncate text-[10px] " + pal.soft}>
                التمرين {index + 1} من {problems.length}
                <span className="hidden sm:inline"> · {infoLine}</span>
              </p>
            </div>

            {/* الوسط: المؤقت الجميل */}
            <div
              className={
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 shadow-md " +
                pal.pill
              }
            >
              <span className="text-sm">⏱</span>
              <button
                type="button"
                dir="ltr"
                title={
                  durationSec != null
                    ? "اضغط للتبديل بين الوقت المنقضي والمتبقي من مدة المسابقة"
                    : "الوقت المنقضي"
                }
                onClick={() =>
                  durationSec != null && setShowRemaining((r) => !r)
                }
                className={
                  "min-w-14 text-center font-mono text-sm font-bold tabular-nums " +
                  (showRemaining && overtime ? "text-red-500" : "")
                }
              >
                {showRemaining && remaining != null
                  ? (overtime ? "-" : "") + fmt(Math.abs(remaining))
                  : fmt(seconds)}
              </button>
              {showRemaining && durationSec != null && (
                <span className={"text-[9px] " + pal.soft}>
                  {overtime ? "تجاوزت" : "متبقٍ"}
                </span>
              )}
              <button
                type="button"
                title={running ? "إيقاف مؤقت" : "استئناف"}
                onClick={() => setRunning((r) => !r)}
                className="px-0.5 text-sm transition hover:scale-110"
              >
                {running ? "⏸" : "▶️"}
              </button>
              <button
                type="button"
                title="تصفير المؤقت"
                onClick={() => setSeconds(0)}
                className="px-0.5 text-sm transition hover:scale-110"
              >
                🔄
              </button>
            </div>

            {/* يسار: أدوات + خروج (X في أقصى اليسار) */}
            <div className="flex flex-1 items-center justify-end gap-1.5">
              <button
                type="button"
                title="تصغير الخط (-)"
                onClick={() => changeFont(-1)}
                className={
                  roundBtn + " hidden h-8 w-8 text-[10px] font-bold sm:flex"
                }
              >
                A-
              </button>
              <button
                type="button"
                title="تكبير الخط (+)"
                onClick={() => changeFont(1)}
                className={
                  roundBtn + " hidden h-8 w-8 text-sm font-bold sm:flex"
                }
              >
                A+
              </button>
              <button
                type="button"
                title="ليلي / نهاري (D)"
                onClick={toggleDark}
                className={roundBtn + " h-8 w-8 text-sm"}
              >
                {dark ? "☀️" : "🌙"}
              </button>
              <button
                type="button"
                title="ملء الشاشة"
                onClick={toggleFullscreen}
                className={roundBtn + " hidden h-8 w-8 text-sm sm:flex"}
              >
                ⛶
              </button>
              <button
                type="button"
                title="خروج من وضع القراءة (Esc)"
                onClick={close}
                className={
                  roundBtn +
                  " h-8 w-8 text-sm hover:!border-red-500 hover:!text-red-500"
                }
              >
                ✕
              </button>
            </div>
          </header>

          {/* شريط التقدم */}
          <div className={"h-1 w-full " + pal.track}>
            <div
              className={"h-full transition-all duration-300 " + pal.bar}
              style={{ width: ((index + 1) / problems.length) * 100 + "%" }}
            />
          </div>

          {/* ===== محتوى التمرين ===== */}
          <main ref={contentRef} className="flex-1 overflow-y-auto">
            <div
              key={index}
              className="mx-auto w-full max-w-3xl px-5 pb-44 pt-8 duration-300 animate-in fade-in slide-in-from-bottom-2"
              style={{ fontSize: FONT_STEPS[fontIdx] + "rem" }}
            >
              <div className="flex items-center gap-3">
                <h2 className="shrink-0 text-base font-bold">
                  التمرين {p.problemNumber}
                </h2>
                <span
                  className={
                    "h-px flex-1 bg-gradient-to-l to-transparent " + pal.divider
                  }
                />
              </div>

              {p.title && (
                <p
                  dir="ltr"
                  className={"mt-1 text-left text-xs font-medium " + pal.soft}
                >
                  {p.title}
                </p>
              )}

              {p.tags.length > 0 && (
                <div
                  dir="ltr"
                  className="mt-1.5 flex flex-wrap justify-start gap-x-2 gap-y-0.5"
                >
                  {p.tags.map((tag) => (
                    <span key={tag} className={"text-[10px] " + pal.soft}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <MathContent className="!text-[1em]" content={p.statement} />
              </div>

              {p.remark && (
                <div className="mt-4 border-s-2 border-amber-400 ps-3">
                  <MathContent className="!text-[1em]" content={p.remark} />
                </div>
              )}

              {p.hasSolution && p.solution && (
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => setShowSolution((s) => !s)}
                    className={
                      "rounded-full border px-4 py-1.5 text-xs font-semibold transition " +
                      pal.btn
                    }
                  >
                    {showSolution ? "إخفاء الحل ▲" : "💡 عرض الحل"}
                  </button>
                  {showSolution && (
                    <div className={"mt-3 border-s-2 ps-3 " + pal.solution}>
                      <MathContent
                        className="!text-[1em]"
                        content={p.solution}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>

          {/* ===== أدوات التنقل السفلية ===== */}
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center gap-2">
            {!isLast ? (
              <>
                <p className={"text-[10px] " + pal.soft}>
                  التمرين التالي: {problems[index + 1].problemNumber}
                </p>
                <div className="pointer-events-auto flex items-center gap-3">
                  {index > 0 && (
                    <button
                      type="button"
                      title="التمرين السابق (↑)"
                      onClick={() => setIndex((i) => Math.max(i - 1, 0))}
                      className={roundBtn + " h-9 w-9 text-sm " + pal.pill}
                    >
                      ↑
                    </button>
                  )}
                  <button
                    type="button"
                    title="التمرين التالي (↓)"
                    onClick={() =>
                      setIndex((i) => Math.min(i + 1, problems.length - 1))
                    }
                    className={
                      roundBtn +
                      " h-12 w-12 text-xl font-bold " +
                      pal.pill +
                      " " +
                      pal.accent
                    }
                  >
                    ↓
                  </button>
                </div>
              </>
            ) : (
              <div className="pointer-events-auto flex flex-col items-center gap-2 px-4">
                <p className={"text-[11px] font-semibold " + pal.accent}>
                  🎉 انتهيت من هذا الموضوع
                </p>
                <div className="flex items-center gap-2">
                  {index > 0 && (
                    <button
                      type="button"
                      title="التمرين السابق (↑)"
                      onClick={() => setIndex((i) => Math.max(i - 1, 0))}
                      className={roundBtn + " h-9 w-9 text-sm " + pal.pill}
                    >
                      ↑
                    </button>
                  )}
                  {prevHref && (
                    <button
                      type="button"
                      title={
                        "الموضوع السابق" + (prevLabel ? ": " + prevLabel : "")
                      }
                      onClick={() => goTopic(prevHref)}
                      className={
                        roundBtn +
                        " gap-1.5 px-3 py-1.5 text-[11px] " +
                        pal.pill
                      }
                    >
                      <span>→</span>
                      <span className="max-w-32 truncate">الموضوع السابق</span>
                    </button>
                  )}
                  {nextHref && (
                    <button
                      type="button"
                      title={
                        "الموضوع التالي" + (nextLabel ? ": " + nextLabel : "")
                      }
                      onClick={() => goTopic(nextHref)}
                      className={
                        roundBtn +
                        " gap-1.5 px-3 py-1.5 text-[11px] font-semibold " +
                        pal.pill +
                        " " +
                        pal.accent
                      }
                    >
                      <span className="max-w-32 truncate">الموضوع التالي</span>
                      <span>←</span>
                    </button>
                  )}
                  {!prevHref && !nextHref && (
                    <p className={"text-[10px] " + pal.soft}>
                      لا توجد مواضيع أخرى ضمن هذه الفلترة
                    </p>
                  )}
                </div>
              </div>
            )}
            {/* تلميح الاختصارات — يظهر في الحاسوب فقط */}
            <p className={"hidden text-[9px] sm:block " + pal.soft}>
              ↓ التالي · ↑ السابق · ← موضوع آخر · D ليلي/نهاري · Esc خروج
            </p>
          </div>

          {/* ===== سهما الانتقال بين المواضيع — يظهران عند آخر تمرين (حاسوب) ===== */}
          {isLast && prevHref && (
            <button
              type="button"
              title={
                "الموضوع السابق" + (prevLabel ? ": " + prevLabel : "") + " (→)"
              }
              onClick={() => goTopic(prevHref)}
              className={
                "absolute right-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 text-xl lg:flex " +
                roundBtn +
                " " +
                pal.pill
              }
            >
              →
            </button>
          )}
          {isLast && nextHref && (
            <button
              type="button"
              title={
                "الموضوع التالي" + (nextLabel ? ": " + nextLabel : "") + " (←)"
              }
              onClick={() => goTopic(nextHref)}
              className={
                "absolute left-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 text-xl lg:flex " +
                roundBtn +
                " " +
                pal.pill
              }
            >
              ←
            </button>
          )}
        </div>
      )}
    </>
  );
}
