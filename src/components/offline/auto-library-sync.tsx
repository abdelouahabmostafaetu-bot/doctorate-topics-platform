"use client";

// مزامنة تلقائية لمكتبة المواضيع:
// بمجرد فتح التطبيق المثبت (APK أو PWA) تُحمّل كل المواضيع
// تلقائيًا في الخلفية إلى جهاز المستخدم — بدون أي زر.
// ثم تُحدّث تلقائيًا كل 24 ساعة عند توفر الإنترنت.

import { useEffect } from "react";
import { loadLibrary, saveLibrary } from "@/lib/offline-library";

// نحدّث المكتبة تلقائيًا إذا مر أكثر من يوم على آخر نسخة
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
// لا نحاول أكثر من مرة في نفس الجلسة
const SESSION_FLAG = "docmath-lib-synced";

function isInstalledApp(): boolean {
  // PWA أو TWA بعد التحقق من assetlinks
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iPhone
  if ((navigator as unknown as { standalone?: boolean }).standalone === true) {
    return true;
  }
  // تطبيق أندرويد (TWA) — أول فتح قبل التحقق
  if (document.referrer.startsWith("android-app://")) return true;
  return false;
}

export function AutoLibrarySync() {
  useEffect(() => {
    if (!("indexedDB" in window)) return;
    if (!navigator.onLine) return;
    if (!isInstalledApp()) return;

    try {
      if (sessionStorage.getItem(SESSION_FLAG)) return;
      sessionStorage.setItem(SESSION_FLAG, "1");
    } catch {
      // تجاهل — نواصل المحاولة
    }

    (async () => {
      try {
        const existing = await loadLibrary();
        const fresh =
          existing &&
          Date.now() - new Date(existing.savedAt).getTime() < MAX_AGE_MS;
        if (fresh) return;

        const res = await fetch("/api/offline-export");
        const data = await res.json();
        if (!res.ok || !data.ok) return;

        await saveLibrary({
          savedAt: new Date().toISOString(),
          count: data.count,
          topics: data.topics,
        });
      } catch {
        // صامت — سنحاول في الفتحة القادمة
      }
    })();
  }, []);

  return null;
}
