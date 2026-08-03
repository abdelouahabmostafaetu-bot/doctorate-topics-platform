import { NextResponse } from "next/server";
import { harvestAll } from "@/lib/theses/harvest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!process.env.BOT_API_SECRET || secret !== process.env.BOT_API_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const only = url.searchParams.get("repo") || undefined;
  const lines: string[] = [];
  try {
    const res = await harvestAll(only, (s) => lines.push(s));
    return NextResponse.json({ ok: true, summary: res, log: lines });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e), log: lines },
      { status: 500 }
    );
  }
}
