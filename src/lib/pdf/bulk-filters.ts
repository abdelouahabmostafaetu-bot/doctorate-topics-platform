// بناء شرط Prisma موحّد للتحميل الجماعي — نفس فلاتر صفحة البحث
import type { Prisma } from "@prisma/client";

// الحد الأقصى للمواضيع في ملف واحد (لضمان إتمام التوليد خلال مهلة الخادم)
export const MAX_BULK = 150;

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
