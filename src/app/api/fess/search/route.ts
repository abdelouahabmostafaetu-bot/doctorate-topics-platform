import { NextResponse, type NextRequest } from "next/server";
import { searchFessPdfs } from "@/lib/fess";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") || "").slice(0, 180);
  const start = Number(request.nextUrl.searchParams.get("start")) || 0;
  const size = Number(request.nextUrl.searchParams.get("size")) || 30;
  const result = await searchFessPdfs({ query: q, start, size });
  return NextResponse.json(result, {
    status: result.available ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}