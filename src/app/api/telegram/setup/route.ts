// تسجيل / فحص / حذف الـ webhook لدى تيليجرام
//
//   التسجيل : /api/telegram/setup?secret=BOT_API_SECRET
//   الفحص   : /api/telegram/setup?secret=...&action=info
//   الحذف   : /api/telegram/setup?secret=...&action=delete
import type { NextRequest } from "next/server";
import { TELEGRAM_HOST } from "@/lib/telegram/bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
	const appSecret = process.env.BOT_API_SECRET;
	const token = process.env.TELEGRAM_BOT_TOKEN;
	const sp = req.nextUrl.searchParams;

	if (!appSecret || sp.get("secret") !== appSecret) {
		return Response.json({ error: "unauthorized" }, { status: 401 });
	}
	if (!token) {
		return Response.json(
			{ error: "TELEGRAM_BOT_TOKEN missing" },
			{ status: 500 },
		);
	}

	const api = TELEGRAM_HOST + "/bot" + token;
	const action = sp.get("action") || "set";

	if (action === "info") {
		const res = await fetch(api + "/getWebhookInfo");
		return Response.json(await res.json());
	}

	if (action === "delete") {
		const res = await fetch(api + "/deleteWebhook?drop_pending_updates=true");
		return Response.json(await res.json());
	}

	const origin = sp.get("origin") || req.nextUrl.origin;
	const url = origin.replace(/\/$/, "") + "/api/telegram/webhook";
	const body: Record<string, unknown> = {
		url,
		drop_pending_updates: true,
		allowed_updates: ["message", "callback_query"],
	};
	const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
	if (webhookSecret) body.secret_token = webhookSecret;

	const res = await fetch(api + "/setWebhook", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	const result = await res.json();
	return Response.json({ webhookUrl: url, telegram: result });
}
