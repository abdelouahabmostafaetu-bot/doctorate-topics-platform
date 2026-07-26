import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// تحميل كتاب من المكتبة — يزيد العداد ثم يحوّل إلى رابط الملف (R2 أو Drive...)
export async function GET(_req: Request, { params }: Ctx) {
	const { id } = await params;
	const book = await prisma.libraryBook
		.update({
			where: { id },
			data: { downloadsCount: { increment: 1 } },
		})
		.catch(() => null);
	if (!book?.downloadUrl) {
		return NextResponse.json({ error: "الكتاب غير موجود." }, { status: 404 });
	}
	return NextResponse.redirect(book.downloadUrl);
}
