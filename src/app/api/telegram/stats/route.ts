import { NextResponse } from "next/server";
import { botStats } from "@/lib/telegram/bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/telegram/stats?secret=BOT_API_SECRET
// يرجع إحصائيات استخدام بوت تيليجرام
export async function GET(req: Request) {
	const url = new URL(req.url);
	const secret = url.searchParams.get("secret");
	if (!secret || secret !== process.env.BOT_API_SECRET) {
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	}
	try {
		const stats = await botStats();
		return NextResponse.json(stats);
	} catch (err) {
		console.error("bot stats error:", err);
		return NextResponse.json({ error: "failed" }, { status: 500 });
	}
}
