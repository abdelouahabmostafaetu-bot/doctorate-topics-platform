"use client";

// عنصر Cloudflare Turnstile — تحقق شبه غير مرئي من أن الزائر إنسان
// لا يظهر شيء إن لم تُضبط NEXT_PUBLIC_TURNSTILE_SITE_KEY (الميزة معطلة حينها).
// عند وضعه داخل <form> يضيف Turnstile تلقائيًا حقلًا مخفيًا باسم cf-turnstile-token.

import Script from "next/script";

export function TurnstileWidget() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
      />
      <div
        className="cf-turnstile"
        data-sitekey={siteKey}
        data-theme="auto"
        data-language="ar"
      />
    </>
  );
}
