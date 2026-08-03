import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy between the browser (InstantSearch) and Meilisearch.
 *
 * Why a proxy instead of a public search key: the browser never sees any
 * Meilisearch credential, and MEILI_HOST can stay on a private network.
 * Only read paths are forwarded, so the master key cannot be used to write.
 */
const ALLOWED = [
  "multi-search",
  "indexes/theses/search",
  "indexes/theses/facet-search",
];

function target(path: string[]): string | null {
  const joined = path.join("/");
  if (!ALLOWED.includes(joined)) return null;
  const host = process.env.MEILI_HOST;
  if (!host) return null;
  return host.replace(/\/+$/, "") + "/" + joined;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path } = await ctx.params;
  const url = target(path);
  const key = process.env.MEILI_MASTER_KEY;

  if (!url || !key) {
    return NextResponse.json(
      { error: "search-not-configured" },
      { status: 503 }
    );
  }

  const body = await req.text();

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + key,
      },
      body,
      cache: "no-store",
    });

    const text = await r.text();
    return new NextResponse(text, {
      status: r.status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "upstream-failed" },
      { status: 502 }
    );
  }
}
