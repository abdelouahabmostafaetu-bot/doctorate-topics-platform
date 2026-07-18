import type { MetadataRoute } from "next";

// ملف تعريف تطبيق الويب (PWA) — يتيح تثبيت الموقع كتطبيق حقيقي
// على الهاتف والحاسوب بنفس شكل الموقع تمامًا وبدون شريط المتصفح
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "DocMath DZ — مواضيع دكتوراه الرياضيات",
    short_name: "DocMath DZ",
    description:
      "أرشيف مجاني لمواضيع مسابقات الالتحاق بالدكتوراه في الرياضيات بالجزائر — نصوص التمارين بعرض رياضي واضح مع بحث وتصفية.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    dir: "rtl",
    lang: "ar",
    categories: ["education", "books"],
    background_color: "#ffffff",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/icon.png",
        sizes: "256x256",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcuts: [
      {
        name: "تصفّح المواضيع",
        url: "/search",
        description: "بحث وتصفية مواضيع الدكتوراه",
      },
      {
        name: "مراجعتي",
        url: "/revision",
        description: "لوحة تقدمك في المراجعة",
      },
      {
        name: "ساهم معنا",
        url: "/contribute",
        description: "أضف موضوعًا أو حلاً",
      },
    ],
  };
}
