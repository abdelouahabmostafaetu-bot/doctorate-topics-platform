// بناء شرط Prisma موحّد للتحميل الجماعي — نفس فلاتر صفحة البحث
import type { Prisma } from "@prisma/client";

// عدد المواضيع في كل جزء PDF واحد (لضمان إتمام التوليد خلال مهلة الخادم)
// ملاحظة: التحميل الجماعي يشمل الآن كل المواضيع المطابقة — تُقسَّم تلقائيًا
// إلى أجزاء بهذا الحجم وتُحمَّل بالتتابع (part=1, part=2, ...)
export const MAX_BULK = 150;

// تقدير مدة توليد ملف PDF بالثواني حسب عدد المواضيع
// (إقلاع المتصفح السحابي + زمن تصفيف لكل موضوع)
export function estimateSeconds(count: number): number {
	if (count <= 1) return 20;
	return Math.min(240, 15 + Math.ceil(count * 1.3));
}

// حساب عدد الأجزاء اللازمة لتحميل كل النتائج
export function partsCount(total: number): number {
	return Math.max(1, Math.ceil(total / MAX_BULK));
}

export type BulkParams = {
	q?: string;
	university?: string;
	specialty?: string;
	year?: string;
	examType?: string;
	difficulty?: string;
};

export function buildBulkWhere(p: BulkParams): Prisma.TopicWhereInput {
	const where: Prisma.TopicWhereInput = { status: "published" };
	const q = (p.q ?? "").trim();
	if (q) where.title = { contains: q, mode: "insensitive" };
	if (p.year && /^\d{4}$/.test(p.year)) where.year = parseInt(p.year, 10);
	if (p.examType === "general" || p.examType === "specialty") {
		where.examType = p.examType;
	}
	if (
		p.difficulty === "easy" ||
		p.difficulty === "medium" ||
		p.difficulty === "hard"
	) {
		where.problems = { some: { difficulty: { equals: p.difficulty } } };
	}
	if (p.university) where.university = { slug: p.university };
	if (p.specialty) where.specialty = { slug: p.specialty };
	return where;
}

export const BULK_ORDER: Prisma.TopicOrderByWithRelationInput[] = [
	{ year: "desc" },
	{ specialty: { name: "asc" } },
	{ university: { name: "asc" } },
	{ examNumber: "asc" },
];
