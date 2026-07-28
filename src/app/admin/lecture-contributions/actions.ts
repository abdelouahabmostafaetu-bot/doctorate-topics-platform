"use server";

// فرز مساهمات الدروس — للمدير الأعلى فقط
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";

const TYPES = ["cours", "td", "tp", "resume", "book", "exam", "other"] as const;
type LType = (typeof TYPES)[number];

async function requireSuperAdmin(): Promise<string> {
	const session = await auth();
	if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
		throw new Error("هذه العملية للمدير الأعلى فقط.");
	}
	return session.user.id;
}

function refresh() {
	revalidatePath("/admin/lecture-contributions");
	revalidatePath("/contribute-lectures");
	revalidatePath("/lectures");
}

/** قبول مساهمة: منح نقاط للمساهم واختياريًا نشر الملف مباشرة كدرس في موديل */
export async function approveLectureContribution(formData: FormData) {
	const adminId = await requireSuperAdmin();
	const id = String(formData.get("id") || "");
	const points = Math.max(0, Math.min(1000, Number(formData.get("points")) || 0));
	const moduleId = String(formData.get("moduleId") || "");
	const typeRaw = String(formData.get("type") || "other");
	const type: LType = (TYPES as readonly string[]).includes(typeRaw)
		? (typeRaw as LType)
		: "other";
	if (!id) return;
	const contribution = await prisma.lectureContribution.findUnique({ where: { id } });
	if (!contribution || contribution.status !== "pending") return;

	await prisma.lectureContribution.update({
		where: { id },
		data: { status: "accepted", pointsAwarded: points, handledById: adminId },
	});
	if (points > 0) {
		await prisma.user
			.update({ where: { id: contribution.userId }, data: { points: { increment: points } } })
			.catch(() => null);
	}
	// نشر الملف مباشرة كدرس — الملف موجود أصلًا في R2، لا حاجة لإعادة رفعه
	if (moduleId) {
		const title =
			String(formData.get("title") || "").trim().slice(0, 150) ||
			contribution.fileName.slice(0, 150);
		await prisma.lectureResource.create({
			data: {
				title,
				type,
				moduleId,
				fileUrl: contribution.fileUrl,
				fileName: contribution.fileName,
				fileSizeBytes: contribution.fileSizeBytes,
				mimeType: contribution.mimeType ?? undefined,
				uploadedById: adminId,
			},
		});
	}
	refresh();
}

/** رفض مساهمة — يُحذف ملفها من التخزين حتى لا يستهلك المساحة */
export async function rejectLectureContribution(formData: FormData) {
	const adminId = await requireSuperAdmin();
	const id = String(formData.get("id") || "");
	const adminNote = String(formData.get("adminNote") || "").trim().slice(0, 300);
	if (!id) return;
	const contribution = await prisma.lectureContribution.findUnique({ where: { id } });
	if (!contribution || contribution.status !== "pending") return;
	await prisma.lectureContribution.update({
		where: { id },
		data: { status: "rejected", adminNote: adminNote || null, handledById: adminId },
	});
	await deleteFile(contribution.fileUrl);
	refresh();
}
