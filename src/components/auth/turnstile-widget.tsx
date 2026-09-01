"use client";

// عنصر Cloudflare Turnstile — تحقق شبه غير مرئي من أن الزائر إنسان
// لا يظهر شيء إن لم تُضبط NEXT_PUBLIC_TURNSTILE_SITE_KEY (الميزة معطلة حينها).
// العرض صريح عبر useEffect — العرض الضمني (cf-turnstile) لا يعمل عند التنقل
// الداخلي (SPA) لأن السكربت يفحص الصفحة مرة واحدة عند تحميله فقط.

import Script from "next/script";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
  }
}

export function TurnstileWidget() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderedRef = useRef(false);

  useEffect(() => {
    if (!siteKey) return;

    let cancelled = false;
    const tryRender = () => {
      if (cancelled || renderedRef.current || !containerRef.current) return;
      if (window.turnstile) {
        window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          language: "ar",
        });
        renderedRef.current = true;
      } else {
        // السكربت لم يُحمَّل بعد (تنقّل داخلي) — أعد المحاولة بعد قليل
        window.setTimeout(tryRender, 300);
      }
    };
    tryRender();

    return () => {
      cancelled = true;
    };
  }, [siteKey]);

  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
      />
      <div ref={containerRef} />
    </>
  );
}
