import { NextResponse } from "next/server";
import { ensureExamPdfFromUrl, getExamDownloadUrl, getExamReadUrl } from "@/lib/exam-storage";
import { rasterizeExamPdf, signedExamPageManifest } from "@/lib/exam-page-images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
const SOURCE = "https://uwaterloo.ca/pure-mathematics/sites/default/files/uploads/documents/2025-a-fields-galois.pdf";
const FILE_NAME = "waterloo-2025-fields-galois.pdf";
const BLOB_NAME = "exams/previews/waterloo-2025-fields-galois.pdf";

export async function POST() {
  try {
    const stored = await ensureExamPdfFromUrl(SOURCE, BLOB_NAME, FILE_NAME);
    await rasterizeExamPdf(stored.url);
    const [images, readUrl, downloadUrl] = await Promise.all([
      signedExamPageManifest(stored.url),
      getExamReadUrl(stored.url),
      getExamDownloadUrl(stored.url, FILE_NAME),
    ]);
    return NextResponse.json({ ok: true, readUrl, downloadUrl, sizeBytes: stored.sizeBytes, images }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Azure preview generation failed:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "تعذر تجهيز المعاينة" }, { status: 502 });
  }
}
