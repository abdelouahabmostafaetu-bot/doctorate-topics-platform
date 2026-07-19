"use client";

// نبضة تواجد — ترسل إشارة كل دقيقة لتحديث "آخر ظهور" للمستخدم المسجّل
// تُستخدم لعرض "المتصلين الآن" في لوحة الإدارة فقط

import { useEffect } from "react";

const PING_INTERVAL_MS = 60_000;

export function PresenceHeartbeat() {
  useEffect(() => {
    let stopped = false;

    const ping = () => {
      if (stopped || document.visibilityState !== "visible") return;
      fetch("/api/presence", { method: "POST", keepalive: true }).catch(
        () => {},
      );
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
  }, []);

  return null;
}
