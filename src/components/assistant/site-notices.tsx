"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

// شريط إشعارات أعلى الموقع:
// - نصائح يتحكم فيها الأدمن من /admin/tips (تدور كل 15 دقيقة)
// - إشعار «ادعمنا» عند نفاد رسائل المساعد
// - زر إخفاء

const TIP_INTERVAL_MS = 15 * 60 * 1000;
const SUPPORT_EVENT = "docmath-support-notice";

type Tip = { text: string; href?: string | null; cta?: string | null };
type Notice = { text: string; href?: string; cta?: string };

function isMathoraPromotion(tip: Tip) {
  return (
    tip.text.toLowerCase().includes("mathora") ||
    tip.cta?.toLowerCase().includes("mathora") === true
  );
}

// نؤجّل طلب النصائح إلى أن يهدأ المتصفح حتى لا يزاحم أول رسم للصفحة
function whenIdle(fn: () => void): () => void {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  };
  if (typeof w.requestIdleCallback === "function") {
    const handle = w.requestIdleCallback(fn, { timeout: 3_000 });
    return () => w.cancelIdleCallback?.(handle);
  }
  const timer = setTimeout(fn, 1_500);
  return () => clearTimeout(timer);
}

export function SiteNotices() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        // بدون no-store: نحترم ترويسة التخزين التي يرسلها /api/tips
        // (s-maxage=60, stale-while-revalidate=300) فلا نضرب قاعدة البيانات مع كل زيارة
        const res = await fetch("/api/tips");
        if (!res.ok) return;
        const data = (await res.json()) as { tips?: Tip[] };
        if (!cancelled && Array.isArray(data.tips)) {
          setTips(data.tips.filter((tip) => !isMathoraPromotion(tip)));
        }
      } catch {
        // ignore
      }
    };

    const cancelIdle = whenIdle(() => void load());
    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, []);

  const showNextTip = useCallback(() => {
    if (tips.length === 0) return;
    try {
      const idx =
        Number(localStorage.getItem("dm-tip-idx") ?? "0") % tips.length;
      localStorage.setItem("dm-tip-idx", String(idx + 1));
      localStorage.setItem("dm-tip-last", String(Date.now()));
      const tip = tips[idx];
      setNotice({
        text: tip.text,
        href: tip.href || undefined,
        cta: tip.cta || undefined,
      });
    } catch {
      // ignore
    }
  }, [tips]);

  useEffect(() => {
    if (tips.length === 0) return;
    const check = () => {
      try {
        const last = Number(localStorage.getItem("dm-tip-last") ?? "0");
        if (Date.now() - last >= TIP_INTERVAL_MS) showNextTip();
      } catch {
        // ignore
      }
    };
    const first = setTimeout(check, 4_000);
    // مؤقّت محلّي بالكامل (localStorage فقط) — لا يرسل أي طلب إلى الخادم
    const id = setInterval(check, 5 * 60 * 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [tips, showNextTip]);

  useEffect(() => {
    const onSupport = () =>
      setNotice({
        text: "☕ نفدت رسائلك — ادعمنا لنضيف المزيد مستقبلًا!",
        href: "/coffee",
        cta: "قهوة دكتوراه",
      });
    window.addEventListener(SUPPORT_EVENT, onSupport);
    return () => window.removeEventListener(SUPPORT_EVENT, onSupport);
  }, []);

  if (!notice) return null;

  return (
    <div className="sticky top-0 z-40 flex items-center justify-center gap-3 border-b border-black/5 bg-gradient-to-l from-[#d4d4d8] via-[#e4e4e7] to-[#f4f4f5] px-4 py-2 text-sm text-[#3f3f46] shadow-sm dark:border-white/5 dark:from-[#27272a] dark:via-[#3f3f46] dark:to-[#52525b] dark:text-[#f4f4f5]">
      <span className="min-w-0 truncate">{notice.text}</span>
      {notice.href && (
        <Link
          href={notice.href}
          onClick={() => setNotice(null)}
          className="shrink-0 rounded-full bg-black/10 px-3 py-1 text-xs font-semibold transition hover:bg-black/15 dark:bg-white/15 dark:hover:bg-white/25"
        >
          {notice.cta ?? "Open"}
        </Link>
      )}
      <button
        type="button"
        aria-label="إخفاء"
        onClick={() => setNotice(null)}
        className="shrink-0 rounded-full p-1 opacity-70 transition hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/15"
      >
        ✕
      </button>
    </div>
  );
}
