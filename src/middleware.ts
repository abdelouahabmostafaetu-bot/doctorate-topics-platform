import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// نستخدم الإعداد الآمن للـ Edge فقط (بدون Prisma) لحماية المسارات
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // يحمي كل ما تحت /admin
  matcher: ["/admin/:path*"],
};
