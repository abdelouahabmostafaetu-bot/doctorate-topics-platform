"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePerm } from "@/lib/admin-perms";
import { slugify } from "@/lib/slugify";
import { deleteFile } from "@/lib/storage";

async function requireAdmin(): Promise<string> {
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
	const name = String(formData.get("name") || "").trim().slice(0, 120);
	const levelRaw = String(formData.get("level") || "L1");
	const level: Level = (LEVELS as readonly string[]).includes(levelRaw) ? levelRaw as Level : "L1";
	const semester = Number(formData.get("semester")) === 2 ? 2 : 1;
	const universityId = String(formData.get("universityId") || "");
	const specialtyChoice = String(formData.get("lectureSpecialtyId") || "");
	const newSpecialtyName = String(formData.get("newSpecialtyName") || "").trim().slice(0, 80);
	const coefficient = Number(formData.get("coefficient")) || null;
	const isMaster = level === "M1" || level === "M2";
	if (!name || !universityId) return;

	let lectureSpecialtyId: string | null = null;
	if (specialtyChoice === "__new__") {
		if (!newSpecialtyName) return;
		let slug = slugify(`${newSpecialtyName}-${universityId}-${level}`) || "specialty";
		if (await prisma.lectureSpecialty.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
		const specialty = await prisma.lectureSpecialty.create({ data: { name: newSpecialtyName, slug, level, universityId } });
		lectureSpecialtyId = specialty.id;
	} else if (specialtyChoice) {
		const specialty = await prisma.lectureSpecialty.findFirst({ where: { id: specialtyChoice, universityId, level } });
		if (!specialty) return;
		lectureSpecialtyId = specialty.id;
	}
	if (isMaster && !lectureSpecialtyId) return;

	const duplicate = await prisma.module.findFirst({ where: { name, universityId, level, semester, lectureSpecialtyId } });
	if (duplicate) return;
	await prisma.module.create({
		data: { name, slug: slugify(name) || "module", level, semester, universityId, lectureSpecialtyId, coefficient },
	});
	refresh();
}

export async function deleteModule(formData: FormData) {
	await requireAdmin();
	const id = String(formData.get("id") || "");
	if (!id) return;
	const resources = await prisma.lectureResource.findMany({ where: { moduleId: id }, select: { fileUrl: true } });
	for (const resource of resources) await deleteFile(resource.fileUrl);
	await prisma.lectureResource.deleteMany({ where: { moduleId: id } });
	await prisma.module.delete({ where: { id } }).catch(() => null);
	refresh();
}

export async function deleteResource(formData: FormData) {
	await requireAdmin();
	const id = String(formData.get("id") || "");
	if (!id) return;
	const resource = await prisma.lectureResource.delete({ where: { id } }).catch(() => null);
	if (resource) await deleteFile(resource.fileUrl);
	refresh();
}

const TYPES = ["cours", "td", "tp", "resume", "book", "exam", "other"] as const;
type LType = (typeof TYPES)[number];

export async function saveLectureResource(input: { folderPath?: string; title: string; type: string; moduleId: string; fileUrl: string; fileName: string; fileSizeBytes: number; mimeType?: string }) {
	const userId = await requireAdmin();
	const title = String(input.title || "").trim().slice(0, 150);
	const type: LType = (TYPES as readonly string[]).includes(input.type) ? input.type as LType : "other";
	if (!title || !input.moduleId || !input.fileUrl || !input.fileName) throw new Error("بيانات الملف ناقصة.");
	const moduleExists = await prisma.module.findUnique({ where: { id: input.moduleId }, select: { id: true } });
	if (!moduleExists) throw new Error("الموديل المحدد غير موجود.");
	const folderPath = String(input.folderPath || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").slice(0, 300);
	await prisma.lectureResource.create({
		data: { title, type, folderPath, moduleId: input.moduleId, fileUrl: input.fileUrl, fileName: input.fileName.slice(0, 200), fileSizeBytes: Math.max(0, Math.round(input.fileSizeBytes)), mimeType: input.mimeType?.slice(0, 100), uploadedById: userId },
	});
	refresh();
}

export async function createLectureSpecialty(formData: FormData) {
	await requireAdmin();
	const name = String(formData.get("name") || "").trim().slice(0, 80);
	const levelRaw = String(formData.get("level") || "L3");
	const level: Level = (LEVELS as readonly string[]).includes(levelRaw) ? levelRaw as Level : "L3";
	const universityId = String(formData.get("universityId") || "");
	if (!name || !universityId) return;
	let slug = slugify(`${name}-${universityId}-${level}`) || "specialty";
	if (await prisma.lectureSpecialty.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
	await prisma.lectureSpecialty.create({ data: { name, slug, level, universityId } });
	refresh();
}

export async function deleteLectureSpecialty(formData: FormData) {
	await requireAdmin();
	const id = String(formData.get("id") || "");
	if (!id) return;
	if (await prisma.module.count({ where: { lectureSpecialtyId: id } })) return;
	await prisma.lectureSpecialty.delete({ where: { id } }).catch(() => null);
	refresh();
}
