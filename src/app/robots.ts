import type { MetadataRoute } from "next";

// توجيهات محركات البحث
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api/",
          "/account",
          "/signin",
          "/signup",
          "/download/",
        ],
      },
    ],
    sitemap: "https://www.docmathdz.dev/sitemap.xml",
  };
}
