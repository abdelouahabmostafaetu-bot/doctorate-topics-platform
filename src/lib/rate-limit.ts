// حد المحاولات (Rate Limiting) في الذاكرة — يحمي صفحات الدخول والتسجيل من الروبوتات
// ملاحظة: العداد لكل نسخة (instance) من الخادم ويُصفَّر عند إعادة التشغيل،
// وهذا كافٍ لصد الهجمات الآلية الشائعة على خطة Azure ذات النسخة الواحدة.

import { headers } from "next/headers";

type Bucket = { count: number; resetAt: number };

// globalThis حتى لا يُعاد إنشاء المخزن مع إعادة التحميل السريع في وضع التطوير
const globalStore = globalThis as unknown as {
  __rateLimitStore?: Map<string, Bucket>;
};
const store = (globalStore.__rateLimitStore ??= new Map<string, Bucket>());

// تنظيف دوري للخانات المنتهية حتى لا تتراكم في الذاكرة
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

/** هل تجاوز هذا المفتاح الحد المسموح؟ */
export function isRateLimited(
  key: string,
  limit: number,
): { limited: boolean; retryAfterSec: number } {
  const now = Date.now();
  sweep(now);
  const bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now)
    return { limited: false, retryAfterSec: 0 };
  return {
    limited: bucket.count >= limit,
    retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

/** سجّل محاولة (فاشلة غالبًا) على هذا المفتاح */
export function recordHit(key: string, windowMs: number): void {
  const now = Date.now();
  const bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
  } else {
    bucket.count += 1;
  }
}

/** امسح عداد المحاولات بعد نجاح (مثل دخول صحيح) */
export function clearHits(key: string): void {
  store.delete(key);
}

/** عنوان IP الحقيقي للزائر — Cloudflare يمرّره عبر cf-connecting-ip */
export async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    return (
      h.get("cf-connecting-ip") ??
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown"
    );
  } catch {
    return "unknown";
  }
}

/** هل هذا الخطأ هو إعادة توجيه Next.js (دخول ناجح)؟ أخطاء NEXT_REDIRECT تحمل digest خاصًا */
export function isRedirectError(error: unknown): boolean {
  const digest = (error as { digest?: unknown })?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}
