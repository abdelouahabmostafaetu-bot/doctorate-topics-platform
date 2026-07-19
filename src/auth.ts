import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";
import { usernameToEmail, USERNAME_REGEX } from "@/lib/username";

// الإعداد الكامل (مع قاعدة البيانات) — يُستخدم في التطبيق، لا في middleware
// مزوّد Credentials يوضع هنا (وليس في auth.config.ts) لأنه يحتاج Prisma وbcrypt
// وهما غير متوافقين مع Edge Runtime الذي يعمل فيه الـ middleware
export const { handlers, auth, signIn, signOut } = NextAuth({
	...authConfig,
	adapter: PrismaAdapter(prisma),
	session: { strategy: "jwt" },
	callbacks: {
		...authConfig.callbacks,
		// منع المحظورين من تسجيل الدخول (يشمل Google وكل المزوّدين)
		async signIn({ user }) {
			const email = user?.email;
			if (!email) return true;
			try {
				const dbUser = await prisma.user.findUnique({
					where: { email },
					select: { blocked: true },
				});
				if (dbUser?.blocked) return false;
			} catch {
				// عند خطأ عابر في الفحص نسمح بالمرور — لا نعطّل الدخول كله
			}
			return true;
		},
		// نضيف المعرّف والدور وحالة الحظر للرمز، مع إعادة فحص دورية
		// من قاعدة البيانات حتى يسري الحظر على الجلسات المفتوحة خلال دقائق
		async jwt({ token, user }) {
			if (user) {
				token.id = user.id;
				token.role = (user as { role?: "USER" | "ADMIN" | "SUPER_ADMIN" }).role ?? "USER";
				token.blocked = (user as { blocked?: boolean }).blocked ?? false;
				token.blockedCheckedAt = Date.now();
				return token;
			}
			const checkedAt =
	typeof token.blockedCheckedAt === "number" ? token.blockedCheckedAt : 0;
			if (token.id && Date.now() - checkedAt > 5 * 60_000) {
				try {
					const dbUser = await prisma.user.findUnique({
						where: { id: token.id as string },
						select: { blocked: true, role: true },
					});
					if (dbUser) {
						token.blocked = dbUser.blocked;
						token.role = dbUser.role;
					}
					token.blockedCheckedAt = Date.now();
				} catch {
					// تجاهل الخطأ العابر — سيُعاد الفحص لاحقًا
				}
			}
			return token;
		},
	},
	providers: [
		...authConfig.providers,
		Credentials({
			name: "اسم المستخدم وكلمة المرور",
			credentials: {
				username: { label: "اسم المستخدم" },
				password: { label: "كلمة المرور", type: "password" },
			},
			async authorize(credentials) {
				const username = String(credentials?.username ?? "").trim();
				const password = String(credentials?.password ?? "");
				if (!USERNAME_REGEX.test(username) || !password) return null;

				// اسم المستخدم مخزّن كبريد داخلي فريد: username@users.local
				const user = await prisma.user.findUnique({
					where: { email: usernameToEmail(username) },
				});
				if (!user?.passwordHash) return null;

				// حساب محظور — يُمنع من تسجيل الدخول
				if (user.blocked) return null;

				const valid = await bcrypt.compare(password, user.passwordHash);
				if (!valid) return null;

				return {
					id: user.id,
					name: user.name,
					email: user.email,
					role: user.role,
					image: user.image ?? undefined,
					blocked: user.blocked,
				};
			},
		}),
	],
});
