import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "DocMath DZ — مواضيع دكتوراه الرياضيات",
    short_name: "DocMath DZ",
    description:
      "أرشيف مجاني لمواضيع مسابقات الالتحاق بالدكتوراه في الرياضيات بالجزائر والعالم.",
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
      { src: "/icon.png", sizes: "256x256", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcuts: [
      {
        name: "تصفّح المواضيع",
        url: "/search",
        description: "بحث وتصفية مواضيع الدكتوراه في الجزائر",
      },
      {
        name: "آفاق",
        url: "/world",
        description: "مواضيع الدكتوراه من دول مختلفة",
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
