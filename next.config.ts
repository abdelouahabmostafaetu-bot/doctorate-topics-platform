import type { NextConfig } from "next";

// ترويسات أمنية تُطبق على كل الصفحات — طبقة حماية أولى
const securityHeaders = [
  {
    // إجبار HTTPS لمدة سنتين مع النطاقات الفرعية
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    // منع المتصفح من تخمين نوع المحتوى (يصد هجمات MIME sniffing)
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // منع تضمين الموقع داخل إطارات مواقع أخرى (يصد Clickjacking)
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    // إرسال الحد الأدنى من معلومات الإحالة للمواقع الخارجية
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // تعطيل أجهزة استشعار لا يستعملها الموقع إطلاقًا
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
];

const nextConfig: NextConfig = {
  // إخفاء بصمة الخادم (لا نعلن أننا Next.js لأدوات الفحص الآلي)
  poweredByHeader: false,
  compress: true,
  // رفع الحد الافتراضي لجسم الطلب للسماح برفع ملفات PDF (الأسبوع 6)
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
    // تحميل أخف لمكتبة الأيقونات (يستورد المستعمل فقط بدل الحزمة كاملة)
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // كاش طويل للأيقونات والصور الثابتة
        source: "/:path(icon.png|apple-icon.png|opengraph-image.png)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
