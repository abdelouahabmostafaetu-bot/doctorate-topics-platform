// إحصاء عدد المواضيع المطابقة للفلاتر — يستخدمها بوت تيليجرام
// لعرض العدد المتاح قبل السؤال عن عدد المواضيع المراد تحميلها
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildBulkWhere } from "@/lib/pdf/bulk-filters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

	const total = await prisma.topic.count({ where });
	return Response.json(
		{ total },
		{ headers: { "Cache-Control": "no-store" } },
	);
}
