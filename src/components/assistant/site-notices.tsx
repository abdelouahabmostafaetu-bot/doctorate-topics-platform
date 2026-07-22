"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// شريط إشعارات أعلى الموقع:
// - نصيحة جميلة كل 15 دقيقة (حتى لا يبدو الموقع مملًا)
// - تذكير بـ DocMath AI عند دخول تصفح المواضيع (مرة واحدة)
// - إشعار «ادعمنا» عند نفاد رسائل المساعد — يأخذ إلى صفحة قهوة دكتوراه
// - زر إخفاء دائم الظهور

const TIP_INTERVAL_MS = 15 * 60 * 1000;
const SUPPORT_EVENT = "docmath-support-notice";

const TIPS = [
  "\u{1F4A1} نصيحة: حل تمرينًا واحدًا كاملًا بتركيز خير من تصفح عشرة مواضيع!",
  "\u{1F3AF} جرّب موضوعًا عشوائيًا من صفحة المواضيع — المفاجأة أفضل تدريب ليوم المسابقة.",
  "\u{1F4DA} راجع مواضيع نفس الجامعة لثلاث سنوات متتالية — ستلاحظ نمطًا يتكرر.",
  "\u2728 DocMath AI في الصفحة الرئيسية يبحث لك عن المواضيع ويقترح تمارين — جرّبه!",
  "\u{1F9E0} 25 دقيقة تركيز ثم 5 دقائق راحة — طريقة Pomodoro تصنع المعجزات.",
  "\u{1F4DD} لخّص كل برهان تحله في ثلاثة أسطر من ذاكرتك — هذا هو الفهم الحقيقي.",
  "\u2615 فنجان قهوة واحد منك يُبقي هذه المنصة مجانية للجميع.",
  "\u{1F550} المراجعة المنتظمة قبل النوم تُثبّت المعلومة أفضل — جرّب مسألة واحدة الليلة!",
];

type Notice = { text: string; href?: string; cta?: string };

export function SiteNotices() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const pathname = usePathname();

  const showNextTip = useCallback(() => {
    try {
      const idx =
        Number(localStorage.getItem("dm-tip-idx") ?? "0") % TIPS.length;
      localStorage.setItem("dm-tip-idx", String(idx + 1));
      localStorage.setItem("dm-tip-last", String(Date.now()));
      setNotice({ text: TIPS[idx] });
    } catch {
      // ignore
    }
  }, []);

  // نصيحة أعلى الصفحة كل 15 دقيقة
  useEffect(() => {
    const check = () => {
      try {
        const last = Number(localStorage.getItem("dm-tip-last") ?? "0");
        if (Date.now() - last >= TIP_INTERVAL_MS) showNextTip();
      } catch {
        // ignore
      }
    };
    const first = setTimeout(check, 5_000);
    const id = setInterval(check, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [showNextTip]);

  // عند دخول تصفح المواضيع: تذكير بالمساعد (مرة واحدة لكل متصفح)
  useEffect(() => {
    if (!pathname || !pathname.startsWith("/topics")) return;
    try {
      if (localStorage.getItem("dm-ai-topics-notice")) return;
      localStorage.setItem("dm-ai-topics-notice", "1");
      setNotice({
        text: "\u2728 يمكنك استعمال DocMath AI في الصفحة الرئيسية ليبحث لك عن المواضيع دون عناء!",
        href: "/",
        cta: "Open DocMath AI",
      });
    } catch {
      // ignore
    }
  }, [pathname]);

  // عند نفاد رسائل المساعد: إشعار «ادعمنا» → صفحة قهوة دكتوراه
  useEffect(() => {
    const onSupport = () =>
      setNotice({
        text: "\u2615 نفدت رسائلك — ادعمنا لنضيف المزيد مستقبلًا!",
        href: "/coffee",
        cta: "قهوة دكتوراه",
      });
    window.addEventListener(SUPPORT_EVENT, onSupport);
    return () => window.removeEventListener(SUPPORT_EVENT, onSupport);
  }, []);

  if (!notice) return null;

  return (
    <div className="sticky top-0 z-40 flex items-center justify-center gap-3 bg-gradient-to-l from-[#9065b0] to-[#6d4a8f] px-4 py-2 text-sm text-white shadow-md">
      <span className="min-w-0 truncate">{notice.text}</span>
      {notice.href && (
        <Link
          href={notice.href}
          onClick={() => setNotice(null)}
          className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold transition hover:bg-white/30"
        >
          {notice.cta ?? "Open"}
        </Link>
      )}
      <button
        type="button"
        aria-label="إخفاء"
        onClick={() => setNotice(null)}
        className="shrink-0 rounded-full p-1 text-white/80 transition hover:bg-white/20 hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}
