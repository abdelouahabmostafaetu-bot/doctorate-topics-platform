import { NextResponse } from "next/server";
import { handleUpdate, type TgUpdate } from "@/lib/sndl/bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
	const expected = process.env.SNDL_WEBHOOK_SECRET;
	if (expected) {
		const got = req.headers.get("x-telegram-bot-api-secret-token");
		if (got !== expected) {
			return NextResponse.json({ ok: false }, { status: 401 });
		}
	}

	let update: TgUpdate;
	try {
		update = (await req.json()) as TgUpdate;
	} catch {
		return NextResponse.json({ ok: true });
	}

	try {
		await handleUpdate(update);
	} catch {
		// تيليجرام يعيد المحاولة عند الخطأ — نردّ دائمًا بنجاح
	}
	return NextResponse.json({ ok: true });
}
