import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

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
      // المستخدم المحظور يُمنع من كل الصفحات ما عدا صفحة الدخول
      if (auth?.user?.blocked && !nextUrl.pathname.startsWith("/signin")) {
        return false;
      }
      const role = auth?.user?.role;
      if (nextUrl.pathname.startsWith("/admin")) {
        return isLoggedIn && (role === "ADMIN" || role === "SUPER_ADMIN");
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
