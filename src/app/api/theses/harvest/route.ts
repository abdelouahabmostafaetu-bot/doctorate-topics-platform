import { NextResponse } from "next/server";
import { harvestAll } from "@/lib/theses/harvest";
import { REPOS } from "@/lib/theses/repos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!process.env.BOT_API_SECRET || secret !== process.env.BOT_API_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Browsers (and phone keyboards) often auto-capitalize the query string,
  // so match the repo key case-insensitively and also accept the slug.
  const raw = (url.searchParams.get("repo") || "").trim();
  let only: string | undefined = undefined;

  if (raw) {
    const wanted = raw.toLowerCase();
    const hit = REPOS.find(
      (r) => r.key.toLowerCase() === wanted || r.slug.toLowerCase() === wanted
    );
    if (!hit) {
      return NextResponse.json(
        {
          ok: false,
          error: `unknown repo "${raw}"`,
          available: REPOS.map((r) => ({
            key: r.key,
            slug: r.slug,
            nameAr: r.nameAr,
            enabled: r.enabled !== false,
          })),
        },
        { status: 400 }
      );
    }
    only = hit.key;
  }

  const lines: string[] = [];
  try {
    const res = await harvestAll(only, (s) => lines.push(s));
    return NextResponse.json({ ok: true, repo: only ?? "all", summary: res, log: lines });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e), log: lines },
      { status: 500 }
    );
  }
}
