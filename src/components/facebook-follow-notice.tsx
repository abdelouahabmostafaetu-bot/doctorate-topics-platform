"use client";

import { useEffect, useState } from "react";

const FACEBOOK_PAGE_URL =
  "https://web.facebook.com/profile.php?id=61592661001175";
const DISMISSED_KEY = "docmath-facebook-follow-dismissed";

export function FacebookFollowNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISSED_KEY)) return;
    } catch {
      // Show the notice when storage is unavailable.
    }

    const timer = window.setTimeout(() => setVisible(true), 4_000);
    return () => window.clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Ignore storage errors.
    }
  };

  if (!visible) return null;

  return (
    <aside
      dir="rtl"
      role="region"
      aria-label="تابع DocMath DZ على فيسبوك"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/25 sm:left-5 sm:right-auto sm:mx-0"
    >
      <div className="h-1 bg-gradient-to-l from-[#1877F2] via-[#2f8bff] to-[#d4af37]" />
      <div className="flex items-start gap-3 p-4">
        <div
          aria-hidden="true"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#1877F2] text-2xl font-bold text-white shadow-sm"
        >
          f
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-bold text-foreground">
            تابع DocMath DZ على فيسبوك
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            تابع صفحتنا لتصلك أحدث مواضيع الدكتوراه، الإعلانات والتحديثات.
          </p>
          <a
            href={FACEBOOK_PAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
            className="mt-3 inline-flex items-center rounded-full bg-[#1877F2] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#166fe5] focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:ring-offset-2 focus:ring-offset-background"
          >
            متابعة الصفحة
          </a>
        </div>

        <button
          type="button"
          aria-label="إغلاق إشعار فيسبوك"
          onClick={dismiss}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          ✕
        </button>
      </div>
    </aside>
  );
}
