"use server";

// إجراءات إدارة الجامعات — للمشرفين فقط (التحقق في الخادم دائمًا)
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin(): Promise<string> {
	const session = await auth();
	const role = session?.user?.role;
	if (!session?.user?.id || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
		throw new Error("هذه العملية للمشرفين فقط.");
	}
	return session.user.id;
}

function refresh() {
	revalidatePath("/admin/universities");
	revalidatePath("/lectures");
	revalidatePath("/search");
	revalidatePath("/");
}

/**
 * دمج جامعة في أخرى:
 * ينقل كل الامتحانات (المواضيع) + الموديلات من الجامعة المصدر
 * إلى الجامعة الهدف، ثم يحذف الجامعة المصدر نهائيًا.
 */
export async function mergeUniversities(formData: FormData) {
	await requireAdmin();
	const fromId = String(formData.get("fromId") || "");
	const toId = String(formData.get("toId") || "");
	const confirm = String(formData.get("confirm") || "");

	if (!fromId || !toId) return;
	if (fromId === toId) return; // لا يمكن الدمج في نفس الجامعة
	if (confirm !== "on") return; // يجب تأكيد العملية

	const [from, to] = await Promise.all([
		prisma.university.findUnique({ where: { id: fromId } }),
		prisma.university.findUnique({ where: { id: toId } }),
	]);
	if (!from || !to) return;

	// 1) نقل كل الامتحانات (المواضيع)
	await prisma.topic.updateMany({
		where: { universityId: fromId },
		data: { universityId: toId },
	});

	// 2) نقل كل موديلات المحاضرات
	await prisma.module.updateMany({
		where: { universityId: fromId },
		data: { universityId: toId },
	});

	// 3) تحديث المساهمات المرتبطة (إن وجدت) — لا تفشل العملية إن تعذر
	await prisma.contribution
		.updateMany({
			where: { universityId: fromId },
			data: { universityId: toId, universityName: to.nameAr || to.name },
		})
		.catch(() => null);

	// 4) حذف الجامعة المصدر بعد إفراغها
	await prisma.university.delete({ where: { id: fromId } });

	refresh();
}

/**
 * حفظ/تحديث شعار الجامعة (رابط صورة).
 * اترك الحقل فارغًا لإزالة الشعار والعودة للأيقونة الافتراضية.
 */
export async function setUniversityLogo(formData: FormData) {
	await requireAdmin();
	const id = String(formData.get("id") || "");
	const logoUrl = String(formData.get("logoUrl") || "").trim();
	if (!id) return;
	if (logoUrl && !/^https?:\/\//i.test(logoUrl)) return; // يجب أن يكون رابطًا صحيحًا
	await prisma.university.update({
		where: { id },
		data: { logoUrl: logoUrl || null },
	});
	refresh();
}
