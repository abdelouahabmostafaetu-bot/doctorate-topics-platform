"use client";

// نبضة تواجد — ترسل إشارة كل دقيقة وعند التنقل بين الصفحات
// تحدّث "آخر ظهور" + الصفحة الحالية للمستخدم المسجّل
// تُستخدم لعرض "المتصلين الآن" ونشاط المستخدمين في لوحة الإدارة فقط

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const PING_INTERVAL_MS = 60_000;

export function PresenceHeartbeat() {
  const pathname = usePathname();

  useEffect(() => {
    let stopped = false;

    const ping = () => {
      if (stopped || document.visibilityState !== "visible") return;
      fetch("/api/presence", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: window.location.pathname,
          // نأخذ الجزء الأول من عنوان الصفحة (قبل اسم المنصة)
          title: document.title.split("—")[0].trim().slice(0, 200),
        }),
      }).catch(() => {});
    };

    ping();
    const intervalId = setInterval(ping, PING_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stopped = true;
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    // إعادة النبضة فورًا عند تغيّر المسار (تنقّل داخلي)
  }, [pathname]);

  return null;
}
