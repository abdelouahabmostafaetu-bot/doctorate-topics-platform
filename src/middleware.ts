import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

// نستخدم الإعداد الآمن للـ Edge فقط (بدون Prisma) — حماية /admin تبقى عبر authorized()
const { auth } = NextAuth(authConfig);

// ===== طبقة 1: صد مسارات فحص الثغرات الآلي (script kiddies) =====
// هذه المسارات لا وجود لها في موقعنا إطلاقًا — أي طلب لها هو فحص خبيث
const BLOCKED_PATTERNS: RegExp[] = [
  /^\/wp-/i, // ووردبريس: wp-admin، wp-login، wp-content...
  /\.php$/i, // أي ملف PHP
  /^\/\.env/i, // محاولة قراءة متغيرات البيئة
  /^\/\.git/i, // محاولة قراءة مستودع git
  /^\/\.aws/i,
  /^\/phpmyadmin/i,
  /^\/cgi-bin/i,
  /^\/xmlrpc/i,
  /\.(sql|bak|old|backup|tar|gz|rar|7z)$/i, // محاولات سحب نسخ احتياطية
];

// ===== طبقة 2: تقييد معدل الطلبات (rate limiting) =====
// محدد بسيط في الذاكرة — طبقة أولى سريعة ضد الإغراق وتخمين كلمات المرور
type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();

function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  // تنظيف خفيف عند التضخم حتى لا تكبر الذاكرة
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) {
      if (now > b.reset) buckets.delete(k);
    }
  }
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

function tooMany(retryAfterSec: number): NextResponse {
  return new NextResponse("Too Many Requests", {
    status: 429,
    headers: { "Retry-After": String(retryAfterSec) },
  });
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // 1) مسارات الفحص الآلي ← 404 فوري دون لمس الخادم أو قاعدة البيانات
  if (BLOCKED_PATTERNS.some((re) => re.test(pathname))) {
    return new NextResponse(null, { status: 404 });
  }

  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  // 2) حدود معدل الطلبات حسب حساسية المسار
  if (pathname.startsWith("/api/auth")) {
    // تسجيل الدخول: صد محاولات تخمين كلمات المرور
    if (!rateLimit(`auth:${ip}`, 30, 60_000)) return tooMany(60);
  } else if (
    pathname.startsWith("/api/pdf") ||
    pathname.startsWith("/api/offline-export")
  ) {
    // توليد PDF مكلف جدًا على الخادم — حد صارم
    if (!rateLimit(`pdf:${ip}`, 10, 60_000)) return tooMany(120);
  } else if (pathname.startsWith("/api/")) {
    if (!rateLimit(`api:${ip}`, 120, 60_000)) return tooMany(60);
  }

  return NextResponse.next();
});

export const config = {
  // كل المسارات ما عدا ملفات Next الثابتة والأصول العامة
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|css|js|woff2?)$).*)",
  ],
};
