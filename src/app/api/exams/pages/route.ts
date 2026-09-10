import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signedExamPageManifest } from "@/lib/exam-page-images";
import { getExamDownloadUrl, isExamAzureUrl } from "@/lib/exam-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug") || "";
  const topic = await prisma.topic.findUnique({ where: { slug }, select: { status: true, files: true } });
  if (!topic || topic.status !== "published") return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  const file = topic.files.find((item) => item.kind === "exam_pdf");
  if (!file || !isExamAzureUrl(file.url)) return NextResponse.json({ error: "لا توجد نسخة صور" }, { status: 404 });
  const manifest = await signedExamPageManifest(file.url);
  if (!manifest) return NextResponse.json({ error: "لم تُجهز الصفحات بعد" }, { status: 404 });
  return NextResponse.json({ ...manifest, fileName: file.fileName, downloadUrl: await getExamDownloadUrl(file.url, file.fileName) }, { headers: { "Cache-Control": "private, no-store" } });
}
