import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";
import { usernameToEmail, USERNAME_REGEX } from "@/lib/username";
import { privateRedis, verifyPrivateFactors } from "@/lib/private-access/verify";

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
		async signIn({ user, account }) {
            if (process.env.PRIVATE_SITE_MODE === "true") {
                return account?.provider === "private-owner" &&
                    !!process.env.PRIVATE_ACCESS_EPOCH &&
                    user?.email?.toLowerCase() === process.env.PRIVATE_ADMIN_EMAIL?.toLowerCase() &&
                    (user as {role?: string}).role === "SUPER_ADMIN" &&
                    !(user as {blocked?: boolean}).blocked;
            }
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
		async jwt({ token, user, account }) {
            if (user) {
                token.privateAccessEpoch = account?.provider === "private-owner" &&
                    process.env.PRIVATE_SITE_MODE === "true" ? process.env.PRIVATE_ACCESS_EPOCH : undefined;
				token.id = user.id;
				token.role = (user as { role?: "USER" | "ADMIN" | "SUPER_ADMIN" }).role ?? "USER";
				token.blocked = (user as { blocked?: boolean }).blocked ?? false;
				token.blockedCheckedAt = Date.now();
				return token;
			}
            // In private mode, reject legacy JWTs even on NextAuth session endpoints.
            if (process.env.PRIVATE_SITE_MODE === "true" &&
                (!process.env.PRIVATE_ACCESS_EPOCH ||
                 token.privateAccessEpoch !== process.env.PRIVATE_ACCESS_EPOCH ||
                 token.email?.toLowerCase() !== process.env.PRIVATE_ADMIN_EMAIL?.toLowerCase() ||
                 token.role !== "SUPER_ADMIN" || token.blocked)) return null;
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
            id: "private-owner",
            name: "دخول المدير الخاص",
            credentials: { password: {type: "password"}, code: {type: "text"} },
            async authorize(credentials, request) {
                if (process.env.PRIVATE_SITE_MODE !== "true") return null;
                const email = process.env.PRIVATE_ADMIN_EMAIL?.toLowerCase();
                const passwordHash = process.env.PRIVATE_ADMIN_PASSWORD_HASH;
                const totpSecret = process.env.PRIVATE_ADMIN_TOTP_SECRET;
                const replayKey = process.env.PRIVATE_REPLAY_KEY;
                const redis = privateRedis();
                if (!email || !passwordHash || !totpSecret || !replayKey || !redis || !process.env.PRIVATE_ACCESS_EPOCH) return null;
                const ip = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
                const ok = await verifyPrivateFactors({password: String(credentials?.password || ""),
                    code: String(credentials?.code || ""), clientKey: ip, passwordHash, totpSecret, replayKey, redis});
                if (!ok) return null;
                try {
                    const user = await prisma.user.findUnique({where: {email}});
                    if (!user || user.blocked || user.role !== "SUPER_ADMIN") return null;
                    return {id: user.id, email: user.email, name: user.name, role: user.role,
                        image: user.image ?? undefined, blocked: user.blocked};
                } catch { return null; }
            }
        }),
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
