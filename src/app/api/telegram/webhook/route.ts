// نقطة استقبال تحديثات تيليجرام — البوت يعمل هنا داخل الموقع
// لا حاجة لتشغيل أي شيء على حاسوب شخصي
import type { NextRequest } from "next/server";
import { handleUpdate, type TgUpdate } from "@/lib/telegram/bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
	const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
	if (
		expected &&
		req.headers.get("x-telegram-bot-api-secret-token") !== expected
	) {
		return new Response("forbidden", { status: 403 });
	}

	let update: TgUpdate;
	try {
		update = (await req.json()) as TgUpdate;
	} catch {
		return new Response("ok");
	}

	// نرد على تيليجرام فورًا ثم نكمل المعالجة في الخلفية
	// (توليد PDF قد يستغرق دقائق)
	void handleUpdate(update).catch((err) => {
		console.error("telegram webhook error:", err);
	});

	return new Response("ok");
}

export async function GET() {
	return Response.json({ status: "telegram webhook ready" });
}
