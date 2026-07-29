import { NextResponse, after } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// تحميل ملف محاضرة: يوجّه فوراً إلى الرابط المباشر (Azure / R2)
// ثم يُحدّث العدّاد والنشاط بعد إرسال الرد عبر after()
// — فلا ينتظر الطالب قاعدة البيانات قبل بدء التحميل، والخادم لا يمرر الملف نفسه.
export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const session = await auth();
	if (!session?.user?.id) {
		// التحميل للأعضاء فقط — نفس قاعدة المنصة
		return NextResponse.redirect(new URL("/signin", request.url));
	}

	const resource = await prisma.lectureResource
		.findUnique({
			where: { id },
			select: { id: true, fileUrl: true, title: true, fileName: true },
		})
		.catch(() => null);

	if (!resource) {
		return NextResponse.json({ error: "الملف غير موجود." }, { status: 404 });
	}

	const userId = session.user.id;
	const pathname = new URL(request.url).pathname;

	// يُنفّذ بعد إرسال الرد فلا يؤخّر التحميل
	after(async () => {
		await Promise.allSettled([
			prisma.lectureResource.update({
				where: { id: resource.id },
				data: { downloadsCount: { increment: 1 } },
			}),
			prisma.userActivity.create({
				data: {
					userId,
					action: "download",
					path: pathname,
					label: `${resource.title} (${resource.fileName})`,
				},
			}),
		]);
	});

	return NextResponse.redirect(resource.fileUrl, {
		status: 307,
		headers: { "Cache-Control": "no-store" },
	});
}
