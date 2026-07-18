"use client";

// موفّر تطبيق الويب (PWA):
// 1) يسجل عامل الخدمة (في الإنتاج فقط)
// 2) يعرض لافتة أنيقة «ثبّت التطبيق» بنفس تصميم الموقع
// 3) على iPhone يعرض إرشادات الإضافة للشاشة الرئيسية

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "docmath-pwa-dismissed";
// نعيد عرض اللافتة بعد 14 يومًا من التجاهل
const DISMISS_DAYS = 14;

export function PwaProvider() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  // تسجيل عامل الخدمة
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // لا شيء — الموقع يعمل طبيعيًا بدونه
      });
    }
  }, []);

  // لافتة التثبيت
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (
        dismissed &&
        Date.now() - Number(dismissed) < DISMISS_DAYS * 24 * 60 * 60 * 1000
      ) {
        return;
      }
    } catch {
      // تجاهل
    }

    // إذا كان التطبيق مثبتًا ومفتوحًا بالفعل — لا نعرض شيئًا
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS لا يدعم beforeinstallprompt — نعرض تلميحًا يدويًا
    const isIos = /iPhone|iPad|iPod/i.test(window.navigator.userAgent);
    if (isIos) setShowIosHint(true);

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // تجاهل
    }
    setInstallEvent(null);
    setShowIosHint(false);
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      setInstallEvent(null);
      setShowIosHint(false);
    } else {
      dismiss();
    }
  }

  if (!installEvent && !showIosHint) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md rounded-2xl border bg-background/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-start gap-3">
        <span className="text-2xl">📱</span>
        <div className="flex-1 text-sm">
          <p className="font-semibold">ثبّت تطبيق DocMath DZ</p>
          {installEvent ? (
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              نفس الموقع تمامًا — بأيقونة على جهازك، فتح أسرع، وبدون شريط
              المتصفح.
            </p>
          ) : (
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              على iPhone: اضغط زر المشاركة ⇧ ثم «إضافة إلى الشاشة الرئيسية».
            </p>
          )}
          <div className="mt-2.5 flex items-center gap-4">
            {installEvent && (
              <button
                type="button"
                onClick={install}
                className="rounded-md bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90"
              >
                تثبيت الآن
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="text-xs text-muted-foreground transition hover:underline"
            >
              لاحقًا
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
