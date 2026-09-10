import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rasterizeExamPdf } from "@/lib/exam-page-images";
import { isExamAzureUrl } from "@/lib/exam-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function POST(request: Request) {
  const role = (await auth())?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const body = await request.json().catch(() => null) as { topicId?: string; force?: boolean } | null;
  if (!body?.topicId) return NextResponse.json({ error: "topicId مطلوب" }, { status: 400 });
  const topic = await prisma.topic.findUnique({ where: { id: body.topicId }, select: { files: true } });
  const file = topic?.files.find((item) => item.kind === "exam_pdf");
  if (!file || !isExamAzureUrl(file.url)) return NextResponse.json({ error: "ملف Azure غير موجود" }, { status: 404 });
  try {
    const manifest = await rasterizeExamPdf(file.url, body.force === true);
    return NextResponse.json({ ok: true, pageCount: manifest.pageCount });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر تجهيز الصفحات" }, { status: 500 });
  }
}
