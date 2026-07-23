// توليد PDF جماعي حسب فلاتر البحث (بدون حلول، مع غلاف وفهرس) — للأعضاء فقط
// يدعم التقسيم إلى أجزاء (?part=N) لتحميل "كل" المواضيع المطابقة مهما كان عددها
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildExamHtml } from "@/lib/pdf/exam-template";
import { renderPdf } from "@/lib/pdf/generate";
import {
	buildBulkWhere,
	BULK_ORDER,
	MAX_BULK,
	partsCount,
} from "@/lib/pdf/bulk-filters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// مهلة أطول للرزم الكبيرة (Vercel Fluid Compute يسمح حتى 300 ثانية)
export const maxDuration = 300;

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

	// رقم الجزء المطلوب (1 افتراضيًا) — كل جزء يحوي MAX_BULK موضوعًا كحد أقصى
	const part = Math.max(1, parseInt(sp.get("part") ?? "1", 10) || 1);

	const total = await prisma.topic.count({ where });
	if (total === 0) {
		return Response.json(
			{ error: "لا توجد مواضيع مطابقة للفلاتر" },
			{ status: 404 },
		);
	}
	const totalParts = partsCount(total);
	if (part > totalParts) {
		return Response.json(
			{ error: "رقم الجزء غير صحيح — عدد الأجزاء المتاحة: " + totalParts },
			{ status: 404 },
		);
	}

	const topics = await prisma.topic.findMany({
		where,
		include: { university: true, specialty: true },
		orderBy: BULK_ORDER,
		skip: (part - 1) * MAX_BULK,
		take: MAX_BULK,
	});
	if (topics.length === 0) {
		return Response.json(
			{ error: "لا توجد مواضيع في هذا الجزء" },
			{ status: 404 },
		);
	}

	const fileName =
		totalParts > 1
			? "recueil-doctorat-partie-" +
				part +
				"-de-" +
				totalParts +
				"-" +
				topics.length +
				"-sujets.pdf"
			: "recueil-doctorat-" + topics.length + "-sujets.pdf";

	try {
		const html = buildExamHtml(topics, { toc: true });
		const pdf = await renderPdf(html);
		return new Response(Buffer.from(pdf), {
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": 'attachment; filename="' + fileName + '"',
				"X-Total-Topics": String(total),
				"X-Total-Parts": String(totalParts),
				"X-Part": String(part),
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
