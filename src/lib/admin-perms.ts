// صلاحيات الأدمين — يمنحها المدير الأعلى (SUPER_ADMIN) لكل أدمين على حدة
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const ADMIN_PERMS = [
	{ key: "lectures", label: "إضافة المحاضرات والدروس", icon: "📚" },
	{ key: "online", label: "رؤية عدد الأشخاص النشطين", icon: "🟢" },
	{ key: "contributions", label: "مراجعة المساهمات وقبولها أو رفضها", icon: "🌱" },
] as const;

export type AdminPermKey = (typeof ADMIN_PERMS)[number]["key"];

/** يعيد صلاحيات المستخدم الحالي — المدير الأعلى يملك كل الصلاحيات */
export async function getMyAdminPerms(): Promise<{
	userId: string | null;
	role: string | null;
	perms: string[];
}> {
	const session = await auth();
	const userId = session?.user?.id ?? null;
	const role = session?.user?.role ?? null;
	if (!userId || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
		return { userId, role, perms: [] };
	}
	if (role === "SUPER_ADMIN") {
		return { userId, role, perms: ADMIN_PERMS.map((p) => p.key) };
	}
	const user = await prisma.user
		.findUnique({ where: { id: userId }, select: { adminPerms: true } })
		.catch(() => null);
	return { userId, role, perms: user?.adminPerms ?? [] };
}

/** يتحقق أن المستخدم الحالي أدمين ويملك الصلاحية المطلوبة، ويعيد معرّفه */
export async function requirePerm(perm: AdminPermKey): Promise<string> {
	const { userId, role, perms } = await getMyAdminPerms();
	if (
		!userId ||
		(role !== "ADMIN" && role !== "SUPER_ADMIN") ||
		!perms.includes(perm)
	) {
		throw new Error("ليست لديك صلاحية لهذه العملية.");
	}
	return userId;
}
