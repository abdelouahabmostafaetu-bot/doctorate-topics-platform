import { NextResponse } from "next/server";
import { closeSndlBrowser, sndlLoginDiagnostics } from "@/lib/sndl/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
	const url = new URL(req.url);
	const secret = url.searchParams.get("secret");
	const expected = process.env.BOT_API_SECRET;
	if (!expected || secret !== expected) {
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	}

	const env = {
		SNDL_USER: process.env.SNDL_USER ? `${process.env.SNDL_USER.length} حرفًا` : "مفقود",
		SNDL_PASS: process.env.SNDL_PASS ? `${process.env.SNDL_PASS.length} حرفًا` : "مفقود",
		SNDL_BOT_TOKEN: process.env.SNDL_BOT_TOKEN ? "موجود" : "مفقود",
		SNDL_OWNER_ID: process.env.SNDL_OWNER_ID || "مفقود",
	};

	await closeSndlBrowser();
	try {
		const diag = await sndlLoginDiagnostics();
		return NextResponse.json({ env, diag });
	} catch (err) {
		return NextResponse.json(
			{ env, error: err instanceof Error ? err.message : String(err) },
			{ status: 500 },
		);
	}
}
