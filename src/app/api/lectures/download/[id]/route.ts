import { NextResponse, after } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getLectureDownloadUrl } from "@/lib/lecture-storage";

export const runtime = "nodejs";

// تحميل ملف محاضرة:
//   • يوجّه فوراً إلى رابط موقّع يحمل Content-Disposition: attachment
//     فينزّل المتصفح الملف مباشرة بدل عرض PDF داخل الصفحة.
//   • العدّاد والنشاط يُحدّثان بعد إرسال الرد عبر after() — لا تأخير على الطالب.
//   • الملف نفسه لا يمر عبر الخادم أبداً.
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

	const target = await getLectureDownloadUrl(
		resource.fileUrl,
		resource.fileName || `${resource.title}.pdf`,
	);

	return NextResponse.redirect(target, {
		status: 307,
		headers: { "Cache-Control": "no-store" },
	});
}
