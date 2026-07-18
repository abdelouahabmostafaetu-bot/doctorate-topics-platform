import type { MetadataRoute } from "next";

// ملف تعريف تطبيق الويب — يتيح تثبيت الموقع كتطبيق على الهاتف
// ويحسّن ظهوره في نتائج البحث على الأجهزة المحمولة
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DocMath DZ — مواضيع دكتوراه الرياضيات",
    short_name: "DocMath DZ",
    description:
      "أرشيف مجاني لمواضيع مسابقات الالتحاق بالدكتوراه في الرياضيات بالجزائر",
    start_url: "/",
    display: "standalone",
    dir: "rtl",
    lang: "ar",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    icons: [
      { src: "/icon.png", sizes: "any", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
