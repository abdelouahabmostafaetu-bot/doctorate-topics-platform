import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { findUniversityExamAsset } from "@/lib/university-exam-asset";
import { ensureExamPdfFromUrl, getExamDownloadUrl } from "@/lib/exam-storage";
import { rasterizeExamPdf, signedExamPageManifest } from "@/lib/exam-page-images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
// Share first-time preparation among concurrent requests in this server process.
const pending = new Map<string, Promise<string>>();

export async function POST(request: NextRequest) {
  const role = (await auth())?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
  const origin = request.headers.get("origin");
  if (origin && ![request.nextUrl.origin, "https://www.docmathdz.dev", "https://docmathdz.dev"].includes(origin)) return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
  const query = request.nextUrl.searchParams;
  const { source, collection, asset } = findUniversityExamAsset(query.get("source") || "", query.get("collection") || "", query.get("asset") || "");
  if (!source || !collection || !asset) return NextResponse.json({ error: "ملف الاختبار غير موجود." }, { status: 404 });
  const fingerprint = createHash("sha256").update(asset.url).digest("hex").slice(0, 20);
  const fileName = `${source.slug}-${collection.id}-${asset.year}-${fingerprint}.pdf`;
  const blobName = `exams/university/${source.slug}/${fileName}`;
  try {
    let job = pending.get(blobName);
    if (!job) {
      job = (async () => {
        const stored = await ensureExamPdfFromUrl(asset.url, blobName, fileName);
        await rasterizeExamPdf(stored.url);
        return stored.url;
      })();
      pending.set(blobName, job);
    }
    let pdfUrl: string;
    try { pdfUrl = await job; } finally { if (pending.get(blobName) === job) pending.delete(blobName); }
    const [manifest, downloadUrl] = await Promise.all([signedExamPageManifest(pdfUrl), getExamDownloadUrl(pdfUrl, fileName)]);
    if (!manifest?.pages.length) throw new Error("Missing page manifest");
    return NextResponse.json({ pages: manifest.pages, downloadUrl, fileName }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("University exam reader preparation failed:", error);
    return NextResponse.json({ error: "تعذر تجهيز صفحات الاختبار. أعد المحاولة أو افتح المصدر الرسمي." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
