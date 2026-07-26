"use server";

// إجراءات إدارة المكتبة — للأدمين فقط (التحقق في الخادم دائمًا)
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { deleteFile } from "@/lib/storage";

async function requireAdmin(): Promise<string> {
	const session = await auth();
	const role = session?.user?.role;
	if (!session?.user?.id || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
		throw new Error("Admins only.");
	}
	return session.user.id;
}

function refresh() {
	revalidatePath("/admin/library");
	revalidatePath("/library");
}

/** ينشئ slug فريدًا — يدعم الأسماء العربية عبر لاحقة زمنية عند الحاجة */
async function uniqueSpecialtySlug(name: string): Promise<string> {
	const base = slugify(name) || "specialty";
	const exists = await prisma.librarySpecialty.findUnique({
		where: { slug: base },
	});
	return exists ? `${base}-${Date.now().toString(36)}` : base;
}

/** يحفظ كتابًا جديدًا — مع اختيار تخصص موجود أو كتابة تخصص جديد */
export async function saveBook(input: {
	title: string;
	author: string;
	summary?: string;
	coverUrl?: string;
	downloadUrl: string;
	specialtyId?: string;
	newSpecialtyName?: string;
}) {
	await requireAdmin();
	const title = String(input.title || "").trim().slice(0, 200);
	const author = String(input.author || "").trim().slice(0, 120);
	const summary = String(input.summary || "").trim().slice(0, 600);
	const coverUrl = String(input.coverUrl || "").trim().slice(0, 1000);
	const downloadUrl = String(input.downloadUrl || "").trim().slice(0, 1000);
	const newName = String(input.newSpecialtyName || "").trim().slice(0, 80);

	if (!title || !author || !downloadUrl) {
		throw new Error("Title, author and download link are required.");
	}
	if (!/^https?:\/\//i.test(downloadUrl)) {
		throw new Error("Download link must be a valid URL.");
	}
	if (coverUrl && !/^https?:\/\//i.test(coverUrl)) {
		throw new Error("Cover image link must be a valid URL.");
	}

	let specialtyId = String(input.specialtyId || "");
	if (!specialtyId) {
		if (!newName) throw new Error("Choose a specialty or type a new one.");
		// لا ننشئ تخصصًا مكررًا بنفس الاسم
		const existing = await prisma.librarySpecialty.findFirst({
			where: { name: newName },
		});
		const specialty =
			existing ??
			(await prisma.librarySpecialty.create({
				data: { name: newName, slug: await uniqueSpecialtySlug(newName) },
			}));
		specialtyId = specialty.id;
	}

	await prisma.libraryBook.create({
		data: { title, author, summary, coverUrl, downloadUrl, specialtyId },
	});
	refresh();
}

/** يحذف كتابًا — ويحذف ملفاته من R2 إن كانت مرفوعة عندنا */
export async function deleteBook(formData: FormData) {
	await requireAdmin();
	const id = String(formData.get("id") || "");
	if (!id) return;
	const book = await prisma.libraryBook
		.delete({ where: { id } })
		.catch(() => null);
	if (book) {
		// deleteFile يتجاهل بهدوء الروابط الخارجية (Drive...) ويحذف فقط ملفات R2
		if (book.coverUrl) await deleteFile(book.coverUrl);
		await deleteFile(book.downloadUrl);
	}
	refresh();
}

/** يحذف تخصصًا فارغًا فقط (بدون كتب) */
export async function deleteSpecialty(formData: FormData) {
	await requireAdmin();
	const id = String(formData.get("id") || "");
	if (!id) return;
	const count = await prisma.libraryBook.count({ where: { specialtyId: id } });
	if (count > 0) return; // لا نحذف تخصصًا فيه كتب
	await prisma.librarySpecialty.delete({ where: { id } }).catch(() => null);
	refresh();
}
