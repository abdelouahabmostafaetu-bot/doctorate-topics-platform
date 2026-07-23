"use server";

// إجراءات إدارة المحاضرات — للمشرفين فقط (التحقق في الخادم دائمًا)
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePerm } from "@/lib/admin-perms";
import { slugify } from "@/lib/slugify";
import { deleteFile } from "@/lib/storage";

async function requireAdmin(): Promise<string> {
	// يتطلب صلاحية "المحاضرات" الممنوحة من المدير الأعلى
	return requirePerm("lectures");
}

function refresh() {
	revalidatePath("/admin/lectures");
	revalidatePath("/lectures");
}

const LEVELS = ["L1", "L2", "L3", "M1", "M2"] as const;
type Level = (typeof LEVELS)[number];

export async function createModule(formData: FormData) {
	await requireAdmin();
	const name = String(formData.get("name") || "").trim();
	const levelRaw = String(formData.get("level") || "L1");
	const level: Level = (LEVELS as readonly string[]).includes(levelRaw)
		? (levelRaw as Level)
		: "L1";
	const semester = Number(formData.get("semester")) === 2 ? 2 : 1;
	const universityId = String(formData.get("universityId") || "");
	const lectureSpecialtyIdRaw = String(formData.get("lectureSpecialtyId") || "");
	const coefficient = Number(formData.get("coefficient")) || null;
	const isMaster = level === "M1" || level === "M2";
	if (!name || !universityId) return;
	if (isMaster && !lectureSpecialtyIdRaw) return; // الماستر يتطلب تخصصًا
	await prisma.module.create({
		data: {
			name: name.slice(0, 120),
			slug: slugify(name) || "module",
			level,
			semester,
			universityId,
			lectureSpecialtyId: lectureSpecialtyIdRaw || null,
			coefficient,
		},
	});
	refresh();
}

export async function deleteModule(formData: FormData) {
	await requireAdmin();
	const id = String(formData.get("id") || "");
	if (!id) return;
	// حذف ملفات الموديل من التخزين أولًا حتى لا تبقى ملفات يتيمة تستهلك المساحة
	const resources = await prisma.lectureResource.findMany({
		where: { moduleId: id },
		select: { fileUrl: true },
	});
	for (const r of resources) await deleteFile(r.fileUrl);
	await prisma.lectureResource.deleteMany({ where: { moduleId: id } });
	await prisma.module.delete({ where: { id } }).catch(() => null);
	refresh();
}

export async function deleteResource(formData: FormData) {
	await requireAdmin();
	const id = String(formData.get("id") || "");
	if (!id) return;
	const resource = await prisma.lectureResource
		.delete({ where: { id } })
		.catch(() => null);
	if (resource) await deleteFile(resource.fileUrl);
	refresh();
}

const TYPES = ["cours", "td", "tp", "resume", "book", "exam", "other"] as const;
type LType = (typeof TYPES)[number];

export async function saveLectureResource(input: {
	title: string;
	type: string;
	moduleId: string;
	fileUrl: string;
	fileName: string;
	fileSizeBytes: number;
	mimeType?: string;
}) {
	const userId = await requireAdmin();
	const title = String(input.title || "").trim().slice(0, 150);
	const type: LType = (TYPES as readonly string[]).includes(input.type)
		? (input.type as LType)
		: "other";
	if (!title || !input.moduleId || !input.fileUrl || !input.fileName) {
		throw new Error("بيانات الملف ناقصة.");
	}
	await prisma.lectureResource.create({
		data: {
			title,
			type,
			moduleId: input.moduleId,
			fileUrl: input.fileUrl,
			fileName: input.fileName.slice(0, 200),
			fileSizeBytes: Math.max(0, Math.round(input.fileSizeBytes)),
			mimeType: input.mimeType?.slice(0, 100),
			uploadedById: userId,
		},
	});
	refresh();
}

// ===== تخصصات المحاضرات (مستقلة عن تخصصات المواضيع) =====

export async function createLectureSpecialty(formData: FormData) {
	await requireAdmin();
	const name = String(formData.get("name") || "").trim().slice(0, 80);
	const levelRaw = String(formData.get("level") || "L3");
	const level: Level = (LEVELS as readonly string[]).includes(levelRaw)
		? (levelRaw as Level)
		: "L3";
	const universityId = String(formData.get("universityId") || "");
	if (!name || !universityId) return;
	let slug = slugify(name) || "specialty";
	const exists = await prisma.lectureSpecialty.findUnique({ where: { slug } });
	if (exists) slug = `${slug}-${Date.now().toString(36)}`;
	await prisma.lectureSpecialty.create({
		data: { name, slug, level, universityId },
	});
	refresh();
}

export async function deleteLectureSpecialty(formData: FormData) {
	await requireAdmin();
	const id = String(formData.get("id") || "");
	if (!id) return;
	// لا نحذف تخصصًا لا يزال يحتوي موديلات
	const count = await prisma.module.count({
		where: { lectureSpecialtyId: id },
	});
	if (count > 0) return;
	await prisma.lectureSpecialty.delete({ where: { id } }).catch(() => null);
	refresh();
}
