import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";
import Google from "next-auth/providers/google";

// صفحات حساسة لا يفتحها إلا المدير الأعلى، حتى عند إدخال الرابط مباشرة.
const SUPER_ADMIN_ONLY_PATHS = [
  "/admin/topics/new",
  "/admin/coffee",
  "/admin/duplicates",
  "/admin/contributions",
  "/admin/lecture-contributions",
  "/admin/reports",
  "/admin/monitoring",
  "/admin/status",
  "/admin/changelog",
  "/admin/library",
  "/admin/universities",
] as const;

function isSuperAdminOnlyPath(pathname: string) {
  return SUPER_ADMIN_ONLY_PATHS.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
}

function isPublicAuthPath(pathname: string) {
  return (
    pathname === "/signin" ||
    pathname.startsWith("/signin/") ||
    pathname === "/signup" ||
    pathname.startsWith("/signup/") ||
    pathname === "/api/auth" ||
    pathname.startsWith("/api/auth/") ||
    // واجهة MCP: لا تُحوَّل إلى صفحة الدخول — لها مصادقتها الخاصة
    // (Authorization: Bearer <MCP_SECRET>) داخل src/app/api/mcp/route.ts
    pathname === "/api/mcp" ||
    pathname.startsWith("/api/mcp/")
  );
}

// إعداد آمن للـ Edge (بدون Prisma) — يُستخدم في middleware وأيضًا داخل auth.ts
export const authConfig = {
  pages: {
    signIn: "/signin",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    // نضيف المعرّف والدور إلى الرمز (token) عند تسجيل الدخول
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "USER";
      }
      return token;
    },
    // ننقل المعرّف والدور من الرمز إلى الجلسة (session) لاستخدامها في الصفحات
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "USER" | "ADMIN" | "SUPER_ADMIN";
        session.user.blocked = Boolean(token.blocked);
      }
      return session;
    },
    // حماية مسارات /admin عبر middleware
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);
      const role = auth?.user?.role;

      // المستخدم المحظور يُمنع من كل الصفحات ما عدا صفحة الدخول
      if (auth?.user?.blocked && !nextUrl.pathname.startsWith("/signin")) {
        return false;
      }

      // الموقع يتطلب تسجيل الدخول قبل استعمال أي صفحة أو وظيفة.
      // صفحات الدخول والتسجيل وcallback الخاص بـ NextAuth وواجهة MCP تبقى عامة.
      if (!isLoggedIn && !isPublicAuthPath(nextUrl.pathname)) {
        const callbackUrl = `${nextUrl.pathname}${nextUrl.search}`;
        const signInUrl = new URL("/signin", nextUrl);
        signInUrl.searchParams.set("callbackUrl", callbackUrl);
        signInUrl.searchParams.set("reason", "auth-required");
        return NextResponse.redirect(signInUrl);
      }

      if (nextUrl.pathname.startsWith("/admin")) {
        if (!isLoggedIn || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
          return false;
        }
        if (isSuperAdminOnlyPath(nextUrl.pathname) && role !== "SUPER_ADMIN") {
          return false;
        }
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
