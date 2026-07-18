// عامل الخدمة — DocMath DZ
// اليوم: يجعل التطبيق قابلاً للتثبيت ويسرّع الأصول الثابتة
// مستقبلاً: الأساس جاهز للعمل بدون إنترنت (الصفحات المُزارة تُحفظ تلقائيًا)

const VERSION = "v1";
const STATIC_CACHE = "docmath-static-" + VERSION;
const PAGES_CACHE = "docmath-pages-" + VERSION;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("docmath-") && !k.endsWith(VERSION))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // لا نتدخل أبدًا في الـ API أو لوحة الإدارة أو المصادقة
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/signin") ||
    url.pathname.startsWith("/signup") ||
    url.pathname.startsWith("/account")
  ) {
    return;
  }

  // صفحات التنقل: الشبكة أولاً ← الكاش ← صفحة عدم الاتصال
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(PAGES_CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((hit) => hit || caches.match(OFFLINE_URL)),
        ),
    );
    return;
  }

  // الأصول الثابتة (JS/CSS/خطوط/صور): الكاش أولاً مع تحديث في الخلفية
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    /\.(png|jpg|jpeg|webp|svg|gif|ico|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        const refresh = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || refresh;
      }),
    );
  }
});
