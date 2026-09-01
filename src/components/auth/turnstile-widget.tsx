"use client";

// عنصر Cloudflare Turnstile — تحقق شبه غير مرئي من أن الزائر إنسان
// لا يظهر شيء إن لم تُضبط NEXT_PUBLIC_TURNSTILE_SITE_KEY (الميزة معطلة حينها).
// العرض صريح عبر useEffect — العرض الضمني لا يعمل عند التنقل الداخلي (SPA).
// يُعلم النموذج بالرمز عبر onTokenChange حتى يبقى زر الإرسال معطّلًا حتى
// يصدر الرمز — وإلا أرسل المستخدم النموذج قبل جاهزية التحقق ففشل بلا سبب.

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
  }
}

export function TurnstileWidget({
  onTokenChange,
}: {
  onTokenChange: (token: string | null) => void;
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderedRef = useRef(false);
  const [blocked, setBlocked] = useState(false);

  // أحدث callback في ref حتى لا يُعاد تشغيل التأثير عند تغيّره مع كل تصيير
  const cbRef = useRef(onTokenChange);
  cbRef.current = onTokenChange;

  useEffect(() => {
    if (!siteKey) return;

    let cancelled = false;
    // إن لم يُحمّل السكربت خلال 6 ثوانٍ فهو محجوب غالبًا (مانع إعلانات أو Brave Shields)
    const blockTimer = window.setTimeout(() => {
      if (!cancelled && !window.turnstile) setBlocked(true);
    }, 6000);

    const tryRender = () => {
      if (cancelled || renderedRef.current || !containerRef.current) return;
      if (window.turnstile) {
        window.clearTimeout(blockTimer);
        window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          language: "ar",
          callback: (token: string) => cbRef.current(token),
          "expired-callback": () => cbRef.current(null),
          "error-callback": () => cbRef.current(null),
        });
        renderedRef.current = true;
      } else {
        // السكربت لم يُحمَّل بعد — أعد المحاولة بعد قليل
        window.setTimeout(tryRender, 300);
      }
    };
    tryRender();

    return () => {
      cancelled = true;
      window.clearTimeout(blockTimer);
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
      {blocked && (
        <p className="text-center text-xs text-destructive">
          متصفحك يحجب فحص مكافحة الروبوتات (مانع الإعلانات أو Brave Shields) —
          عطّله لموقع docmathdz.dev ثم أعد تحميل الصفحة
        </p>
      )}
    </>
  );
}
