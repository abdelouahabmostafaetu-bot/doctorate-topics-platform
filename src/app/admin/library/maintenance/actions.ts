"use server";

// إجراءات الصيانة — للمشرف الأعلى وحده.
// كل دالة تتحقّق من الدور في الخادم مرة أخرى، ولا تعتمد على إخفاء الواجهة.

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";

async function requireSuperAdmin(): Promise<void> {
	const session = await auth();
	if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
		throw new Error("Super admins only.");
	}
}

function refresh() {
	revalidatePath("/admin/library");
	revalidatePath("/admin/library/maintenance");
	revalidatePath("/library");
}

/** يحذف ملفات الكتاب من التخزين — deleteFile يتجاهل الروابط الخارجية بهدوء */
async function dropFiles(book: { coverUrl: string; downloadUrl: string }) {
	if (book.coverUrl) await deleteFile(book.coverUrl).catch(() => null);
	if (book.downloadUrl) await deleteFile(book.downloadUrl).catch(() => null);
}

/** حذف دفعة من الكتب المحددة */
export async function deleteBooks(formData: FormData) {
	await requireSuperAdmin();
	const ids = formData.getAll("bookId").map((v) => String(v)).filter(Boolean);
	if (!ids.length) return;

	const books = await prisma.libraryBook.findMany({
		where: { id: { in: ids } },
		select: { id: true, coverUrl: true, downloadUrl: true },
	});
	await prisma.libraryBook.deleteMany({ where: { id: { in: ids } } });
	for (const book of books) await dropFiles(book);
	refresh();
}

/**
 * دمج أبواب: تُنقل كتب الأبواب المصدر إلى الهدف ثم تُحذف المصادر الفارغة.
 * لا يُحذف أي كتاب — الدمج نقل لا إتلاف.
 */
export async function mergeSpecialties(formData: FormData) {
	await requireSuperAdmin();
	const targetId = String(formData.get("targetId") || "");
	const sourceIds = formData
		.getAll("sourceId")
		.map((v) => String(v))
		.filter((id) => id && id !== targetId);
	if (!targetId || !sourceIds.length) return;

	const target = await prisma.librarySpecialty.findUnique({ where: { id: targetId } });
	if (!target) return;

	await prisma.libraryBook.updateMany({
		where: { specialtyId: { in: sourceIds } },
		data: { specialtyId: targetId },
	});
	await prisma.librarySpecialty.deleteMany({ where: { id: { in: sourceIds } } });
	refresh();
}

/** كنس كل الأبواب التي لا تحوي كتابًا واحدًا */
export async function deleteEmptySpecialties() {
	await requireSuperAdmin();
	const specialties = await prisma.librarySpecialty.findMany({
		include: { _count: { select: { books: true } } },
	});
	const emptyIds = specialties.filter((s) => s._count.books === 0).map((s) => s.id);
	if (!emptyIds.length) return;
	await prisma.librarySpecialty.deleteMany({ where: { id: { in: emptyIds } } });
	refresh();
}

/**
 * إفراغ باب بالكامل: حذف كتبه وملفاتها ثم حذف الباب نفسه.
 * لا تراجع عنها، لذلك تشترط كتابة كلمة DELETE باليد.
 */
export async function purgeSpecialty(formData: FormData) {
	await requireSuperAdmin();
	const id = String(formData.get("specialtyId") || "");
	const confirm = String(formData.get("confirm") || "").trim();
	if (!id || confirm !== "DELETE") return;

	const books = await prisma.libraryBook.findMany({
		where: { specialtyId: id },
		select: { coverUrl: true, downloadUrl: true },
	});
	await prisma.libraryBook.deleteMany({ where: { specialtyId: id } });
	await prisma.librarySpecialty.delete({ where: { id } }).catch(() => null);
	for (const book of books) await dropFiles(book);
	refresh();
}
