"use client";

// زر تثبيت التطبيق (PWA) — يتكيف مع الجهاز:
// - Android/حاسوب (Chrome/Edge): تثبيت فوري بضغطة واحدة
// - iPhone: يعرض خطوات الإضافة للشاشة الرئيسية
// - إذا كان مثبتًا بالفعل: يعرض ذلك

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppButton() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) setInstalled(true);

    setIsIos(/iPhone|iPad|iPod/i.test(window.navigator.userAgent));
    setReady(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
  }

  if (!ready) {
    return (
      <div
        className="h-10 w-full animate-pulse rounded-md bg-muted"
        aria-hidden
      />
    );
  }

  if (installed) {
    return (
      <p className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-center text-sm font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
        ✓ التطبيق مثبت على هذا الجهاز
      </p>
    );
  }

  if (installEvent) {
    return (
      <button
        type="button"
        onClick={install}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        ⬇️ تثبيت الآن — ضغطة واحدة
      </button>
    );
  }

  if (isIos) {
    return (
      <ol className="list-decimal space-y-1 rounded-md border bg-muted/40 p-4 pr-8 text-sm leading-6">
        <li>
          افتح هذه الصفحة في <strong>Safari</strong>
        </li>
        <li>
          اضغط زر المشاركة <strong>⇧</strong> أسفل الشاشة
        </li>
        <li>
          اختر <strong>«إضافة إلى الشاشة الرئيسية»</strong> ثم «إضافة»
        </li>
      </ol>
    );
  }

  return (
    <ol className="list-decimal space-y-1 rounded-md border bg-muted/40 p-4 pr-8 text-sm leading-6">
      <li>
        افتح الموقع في <strong>Chrome</strong> أو <strong>Edge</strong>
      </li>
      <li>
        من قائمة المتصفح <strong>⋮</strong> اختر{" "}
        <strong>«إضافة إلى الشاشة الرئيسية»</strong> أو{" "}
        <strong>«تثبيت التطبيق»</strong>
      </li>
      <li>على الحاسوب: أيقونة التثبيت ⊕ في شريط العنوان</li>
    </ol>
  );
}
