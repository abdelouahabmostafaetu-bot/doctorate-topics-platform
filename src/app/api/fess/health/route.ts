import { NextResponse } from "next/server";
import { getFessConfig, searchFessPdfs } from "@/lib/fess";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getFessConfig();
  const result = await searchFessPdfs({ size: 1 });
  return NextResponse.json(
    {
      enabled: config.enabled,
      configured: Boolean(config.baseUrl),
      available: result.available,
      indexedPdfCount: result.total,
      checkedAt: new Date().toISOString(),
    },
    {
      status: result.available ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}