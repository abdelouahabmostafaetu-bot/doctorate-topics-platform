"use server";

// إدارة الأدمن وصلاحياتهم — للمدير الأعلى (SUPER_ADMIN) فقط
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_PERMS } from "@/lib/admin-perms";

async function requireSuperAdmin(): Promise<string> {
	const session = await auth();
	if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
		throw new Error("هذه العملية للمدير الأعلى فقط.");
	}
	return session.user.id;
}

function readPerms(formData: FormData): string[] {
	const valid = ADMIN_PERMS.map((p) => p.key as string);
	return formData
		.getAll("perms")
		.map(String)
		.filter((p) => valid.includes(p));
}

function refresh() {
	revalidatePath("/admin/admins");
	revalidatePath("/admin");
}

/** ترقية عضو إلى أدمين مع تحديد صلاحياته */
export async function promoteToAdmin(formData: FormData) {
	await requireSuperAdmin();
	const userId = String(formData.get("userId") || "");
	if (!userId) return;
	const target = await prisma.user.findUnique({
		where: { id: userId },
		select: { role: true },
	});
	if (!target || target.role === "SUPER_ADMIN") return;
	await prisma.user.update({
		where: { id: userId },
		data: { role: "ADMIN", adminPerms: readPerms(formData) },
	});
	refresh();
}

/** تحديث صلاحيات أدمين موجود */
export async function updateAdminPerms(formData: FormData) {
	await requireSuperAdmin();
	const userId = String(formData.get("userId") || "");
	if (!userId) return;
	const target = await prisma.user.findUnique({
		where: { id: userId },
		select: { role: true },
	});
	if (!target || target.role !== "ADMIN") return; // لا يمكن تعديل المدير الأعلى
	await prisma.user.update({
		where: { id: userId },
		data: { adminPerms: readPerms(formData) },
	});
	refresh();
}

/** إزالة صفة الأدمين وإرجاع العضو مستخدمًا عاديًا */
export async function demoteAdmin(formData: FormData) {
	await requireSuperAdmin();
	const userId = String(formData.get("userId") || "");
	if (!userId) return;
	const target = await prisma.user.findUnique({
		where: { id: userId },
		select: { role: true },
	});
	if (!target || target.role !== "ADMIN") return; // لا يمكن إزالة المدير الأعلى
	await prisma.user.update({
		where: { id: userId },
		data: { role: "USER", adminPerms: [] },
	});
	refresh();
}
