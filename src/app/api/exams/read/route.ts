import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getExamDownloadUrl, getExamReadUrl, isExamAzureUrl } from "@/lib/exam-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug") || "";
  const topic = await prisma.topic.findUnique({ where: { slug }, select: { status: true, files: true } });
  if (!topic || topic.status !== "published") return NextResponse.json({ error: "غير موجود." }, { status: 404 });
  const file = topic.files.find((item) => item.kind === "exam_pdf");
  if (!file || !isExamAzureUrl(file.url)) return NextResponse.json({ error: "لا يوجد ملف Azure." }, { status: 404 });
  return NextResponse.json({
    readUrl: await getExamReadUrl(file.url),
    downloadUrl: await getExamDownloadUrl(file.url, file.fileName),
    fileName: file.fileName,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
