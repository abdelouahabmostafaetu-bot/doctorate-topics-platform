// توليد PDF جماعي حسب فلاتر البحث (بدون حلول، مع غلاف وفهرس) — للأعضاء فقط
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildExamHtml } from "@/lib/pdf/exam-template";
import { renderPdf } from "@/lib/pdf/generate";
import { buildBulkWhere, BULK_ORDER, MAX_BULK } from "@/lib/pdf/bulk-filters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
	const session = await auth();
	if (!session?.user?.id) {
		return Response.json(
			{ error: "التحميل متاح للأعضاء المسجلين فقط" },
			{ status: 401 },
		);
	}

	const sp = req.nextUrl.searchParams;
	const where = buildBulkWhere({
		q: sp.get("q") ?? undefined,
		university: sp.get("university") ?? undefined,
		specialty: sp.get("specialty") ?? undefined,
		year: sp.get("year") ?? undefined,
		examType: sp.get("examType") ?? undefined,
		difficulty: sp.get("difficulty") ?? undefined,
	});

	const topics = await prisma.topic.findMany({
		where,
		include: { university: true, specialty: true },
		orderBy: BULK_ORDER,
		take: MAX_BULK,
	});
	if (topics.length === 0) {
		return Response.json(
			{ error: "لا توجد مواضيع مطابقة للفلاتر" },
			{ status: 404 },
		);
	}

	try {
		const html = buildExamHtml(topics, { toc: true });
		const pdf = await renderPdf(html);
		return new Response(Buffer.from(pdf), {
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition":
					'attachment; filename="recueil-doctorat-' +
					topics.length +
					'-sujets.pdf"',
				"Cache-Control": "no-store",
			},
		});
	} catch (err) {
		console.error("PDF bulk error:", err);
		return Response.json(
			{ error: "تعذّر إنشاء الملف — أعد المحاولة" },
			{ status: 500 },
		);
	}
}
