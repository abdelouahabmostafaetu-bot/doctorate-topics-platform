import { NextResponse } from "next/server";
import { ensureExamPdfFromUrl, getExamDownloadUrl, getExamReadUrl } from "@/lib/exam-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SOURCE = "https://uwaterloo.ca/pure-mathematics/sites/default/files/uploads/documents/2025-a-fields-galois.pdf";
const FILE_NAME = "waterloo-2025-fields-galois.pdf";
const BLOB_NAME = "exams/previews/waterloo-2025-fields-galois.pdf";

/** عملية ثابتة وآمنة لمعاينة واحدة: تنسخ Waterloo إلى Azure دون حجب تحميل الصفحة. */
export async function POST() {
  try {
    const stored = await ensureExamPdfFromUrl(SOURCE, BLOB_NAME, FILE_NAME);
    const [readUrl, downloadUrl] = await Promise.all([
      getExamReadUrl(stored.url),
      getExamDownloadUrl(stored.url, FILE_NAME),
    ]);
    return NextResponse.json({ ok: true, readUrl, downloadUrl, sizeBytes: stored.sizeBytes }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Azure preview seed failed:", error);
    return NextResponse.json({ ok: false, error: "Azure import unavailable; the reader remains on the working fallback." }, { status: 502 });
  }
}
