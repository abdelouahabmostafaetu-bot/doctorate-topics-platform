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

				const valid = await bcrypt.compare(password, user.passwordHash);
				if (!valid) return null;

				return {
					id: user.id,
					name: user.name,
					email: user.email,
					role: user.role,
					image: user.image ?? undefined,
				};
			},
		}),
	],
});
