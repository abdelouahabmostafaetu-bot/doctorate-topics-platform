import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // رفع الحد الافتراضي لجسم الطلب للسماح برفع ملفات PDF (الأسبوع 6)
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
