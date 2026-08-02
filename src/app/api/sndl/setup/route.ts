import { NextResponse } from "next/server";
import { TELEGRAM_HOST } from "@/lib/sndl/bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
	const url = new URL(req.url);
	const secret = url.searchParams.get("secret");
	if (!process.env.BOT_API_SECRET || secret !== process.env.BOT_API_SECRET) {
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	}

	const token = process.env.SNDL_BOT_TOKEN;
	if (!token) {
		return NextResponse.json({ error: "SNDL_BOT_TOKEN missing" }, { status: 500 });
	}
	const base = TELEGRAM_HOST + "/bot" + token;
	const action = url.searchParams.get("action") ?? "set";

	if (action === "info") {
		const r = await fetch(base + "/getWebhookInfo");
		return NextResponse.json(await r.json());
	}
	if (action === "delete") {
		const r = await fetch(base + "/deleteWebhook");
		return NextResponse.json(await r.json());
	}

	const origin =
		url.searchParams.get("origin") ??
		process.env.NEXT_PUBLIC_SITE_URL ??
		url.origin;
	const webhookUrl = origin.replace(/\/$/, "") + "/api/sndl/webhook";

	const body: Record<string, unknown> = {
		url: webhookUrl,
		allowed_updates: ["message"],
		drop_pending_updates: true,
	};
	if (process.env.SNDL_WEBHOOK_SECRET) {
		body.secret_token = process.env.SNDL_WEBHOOK_SECRET;
	}

	const r = await fetch(base + "/setWebhook", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
	return NextResponse.json({ webhookUrl, telegram: await r.json() });
}
