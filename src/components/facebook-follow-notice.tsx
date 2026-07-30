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
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md overflow-hidden rounded-2xl border border-blue-200/80 bg-white shadow-2xl shadow-slate-900/20 dark:border-blue-400/20 dark:bg-slate-900 sm:left-5 sm:right-auto sm:mx-0"
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
          <p className="font-bold text-slate-900 dark:text-white">
            تابع DocMath DZ على فيسبوك
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            تابع صفحتنا لتصلك أحدث مواضيع الدكتوراه، الإعلانات والتحديثات.
          </p>
          <a
            href={FACEBOOK_PAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
            className="mt-3 inline-flex items-center rounded-full bg-[#1877F2] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#166fe5] focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            متابعة الصفحة
          </a>
        </div>

        <button
          type="button"
          aria-label="إغلاق إشعار فيسبوك"
          onClick={dismiss}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          ✕
        </button>
      </div>
    </aside>
  );
}
