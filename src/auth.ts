import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { usernameToEmail } from "@/lib/username";
import { authConfig } from "./auth.config";

// الإعداد الكامل (مع قاعدة البيانات) — يُستخدم في التطبيق، لا في middleware
// ملاحظة: مزوّد Credentials هنا وليس في auth.config.ts لأنه يحتاج Prisma وbcrypt (لا يعملان في Edge middleware)
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    ...authConfig.providers,
    // تسجيل الدخول باسم المستخدم وكلمة المرور
    Credentials({
      name: "اسم المستخدم وكلمة المرور",
      credentials: {
        username: { label: "اسم المستخدم" },
        password: { label: "كلمة المرور", type: "password" },
      },
      async authorize(credentials) {
        const username = String(credentials?.username ?? "").trim();
        const password = String(credentials?.password ?? "");
        if (!username || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email: usernameToEmail(username) },
        });
        if (!user?.passwordHash) return null;

        const passwordOk = await bcrypt.compare(password, user.passwordHash);
        if (!passwordOk) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
});
