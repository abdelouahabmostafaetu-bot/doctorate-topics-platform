import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// تحميل ملف محاضرة: يسجل العداد ثم يعيد التوجيه للرابط المباشر على R2/CDN
// — الخادم لا يمرر الملف نفسه، فلا ضغط ولا timeout مهما كبر الملف.
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
	try {
		const resource = await prisma.lectureResource.update({
			where: { id },
			data: { downloadsCount: { increment: 1 } },
		});
		// نسجل نشاط "تحميل" ليظهر في لوحة الإدارة (نشاط المستخدمين)
		await prisma.userActivity
			.create({
				data: {
					userId: session.user.id,
					action: "download",
					path: new URL(request.url).pathname,
					label: `${resource.title} (${resource.fileName})`,
				},
			})
			.catch(() => {});
		return NextResponse.redirect(resource.fileUrl);
	} catch {
		return NextResponse.json({ error: "الملف غير موجود." }, { status: 404 });
	}
}
