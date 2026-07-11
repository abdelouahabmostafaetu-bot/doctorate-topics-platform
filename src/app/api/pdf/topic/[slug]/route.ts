// توليد PDF لموضوع واحد (بدون حلول) — للأعضاء المسجلين فقط
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildExamHtml } from "@/lib/pdf/exam-template";
import { renderPdf } from "@/lib/pdf/generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ slug: string }> },
) {
	const session = await auth();
	if (!session?.user?.id) {
		return Response.json(
			{ error: "التحميل متاح للأعضاء المسجلين فقط" },
			{ status: 401 },
		);
	}

	const { slug } = await params;
	const topic = await prisma.topic.findUnique({
		where: { slug },
		include: { university: true, specialty: true },
	});
	if (!topic || topic.status !== "published") {
		return Response.json({ error: "الموضوع غير موجود" }, { status: 404 });
	}

	try {
		const html = buildExamHtml([topic], { toc: false });
		const pdf = await renderPdf(html);

		// إحصاء التحميلات (بدون إفشال الطلب إن فشل التحديث)
		await prisma.topic
			.update({
				where: { id: topic.id },
				data: { downloadCount: { increment: 1 } },
			})
			.catch(() => null);

		return new Response(Buffer.from(pdf), {
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition":
					'attachment; filename="sujet-doctorat-' + slug + '.pdf"',
				"Cache-Control": "no-store",
			},
		});
	} catch (err) {
		console.error("PDF topic error:", err);
		return Response.json(
			{ error: "تعذّر إنشاء الملف — أعد المحاولة" },
			{ status: 500 },
		);
	}
}
