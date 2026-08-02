// نقطة نهاية خاصة ببوت تيليجرام — تولّد PDF جماعي حسب نفس فلاتر الموقع
// محمية بمفتاح سري BOT_API_SECRET بدل جلسة تسجيل الدخول
// يدعم limit لتحديد عدد المواضيع المراد تحميلها
// تعيد رؤوسًا: X-Total-Topics / X-Matched-Topics / X-Total-Parts / X-Part
import type { NextRequest } from "next/server";
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
export const maxDuration = 300;

export async function GET(req: NextRequest) {
	const secret = process.env.BOT_API_SECRET;
	if (!secret || req.headers.get("x-bot-secret") !== secret) {
		return Response.json({ error: "unauthorized" }, { status: 401 });
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

	const part = Math.max(1, parseInt(sp.get("part") ?? "1", 10) || 1);
	const limitRaw = parseInt(sp.get("limit") ?? "", 10);
	const limit =
		Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : null;

	const matched = await prisma.topic.count({ where });
	if (matched === 0) {
		return Response.json({ error: "no-topics" }, { status: 404 });
	}

	// العدد الفعلي المطلوب تحميله (مقيّد بـ limit إن وُجد)
	const total = limit ? Math.min(limit, matched) : matched;
	const totalParts = partsCount(total);
	if (part > totalParts) {
		return Response.json(
			{ error: "invalid-part", totalParts },
			{ status: 404 },
		);
	}

	const skip = (part - 1) * MAX_BULK;
	const take = Math.max(0, Math.min(MAX_BULK, total - skip));
	if (take === 0) {
		return Response.json({ error: "no-topics-part" }, { status: 404 });
	}

	const topics = await prisma.topic.findMany({
		where,
		include: { university: true, specialty: true },
		orderBy: BULK_ORDER,
		skip,
		take,
	});
	if (topics.length === 0) {
		return Response.json({ error: "no-topics-part" }, { status: 404 });
	}

	const fileName =
		totalParts > 1
			? `recueil-doctorat-partie-${part}-de-${totalParts}-${topics.length}-sujets.pdf`
			: `recueil-doctorat-${topics.length}-sujets.pdf`;

	try {
		const html = buildExamHtml(topics, { toc: true });
		const pdf = await renderPdf(html);
		return new Response(Buffer.from(pdf), {
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": `attachment; filename="${fileName}"`,
				"X-Total-Topics": String(total),
				"X-Matched-Topics": String(matched),
				"X-Total-Parts": String(totalParts),
				"X-Part": String(part),
				"Cache-Control": "no-store",
			},
		});
	} catch (err) {
		console.error("PDF bot bulk error:", err);
		return Response.json({ error: "generation-failed" }, { status: 500 });
	}
}
