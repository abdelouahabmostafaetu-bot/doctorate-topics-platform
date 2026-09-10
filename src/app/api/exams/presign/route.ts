import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteExamFile, getExamUploadTarget, isExamAzureUrl } from "@/lib/exam-storage";
import { deleteFile } from "@/lib/storage";

export const runtime = "nodejs";
const MAX_BYTES = 500 * 1024 * 1024;
type Kind = "exam_pdf" | "solution_pdf";
const validKind = (value: unknown): value is Kind => value === "exam_pdf" || value === "solution_pdf";
async function allowed() {
  const role = (await auth())?.user?.role;
  return role === "ADMIN" || role === "SUPER_ADMIN";
}
export async function POST(request: Request) {
  if (!(await allowed())) return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
  const body = await request.json().catch(() => null) as { topicId?: string; kind?: Kind; fileName?: string; contentType?: string; sizeBytes?: number } | null;
  if (!body?.topicId || !validKind(body.kind)) return NextResponse.json({ error: "بيانات غير صالحة." }, { status: 400 });
  const size = Number(body.sizeBytes) || 0;
  const fileName = String(body.fileName || "exam.pdf");
  if (size <= 0 || size > MAX_BYTES) return NextResponse.json({ error: "الحد الأقصى 500 م.ب." }, { status: 400 });
  if (!fileName.toLowerCase().endsWith(".pdf")) return NextResponse.json({ error: "PDF فقط." }, { status: 400 });
  if (!await prisma.topic.findUnique({ where: { id: body.topicId }, select: { id: true } })) return NextResponse.json({ error: "الموضوع غير موجود." }, { status: 404 });
  const safe = fileName.replace(/\.pdf$/i, "").replace(/[^A-Za-z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 80) || "exam";
  const target = await getExamUploadTarget(`topics/${body.topicId}/${body.kind}-${Date.now()}-${safe}.pdf`);
  return NextResponse.json({ ...target, fileName });
}
export async function PATCH(request: Request) {
  if (!(await allowed())) return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
  const body = await request.json().catch(() => null) as { topicId?: string; kind?: Kind; url?: string; fileName?: string; sizeBytes?: number } | null;
  if (!body?.topicId || !validKind(body.kind) || !body.url || !isExamAzureUrl(body.url)) return NextResponse.json({ error: "بيانات غير صالحة." }, { status: 400 });
  const topic = await prisma.topic.findUnique({ where: { id: body.topicId } });
  if (!topic) return NextResponse.json({ error: "الموضوع غير موجود." }, { status: 404 });
  if (!new URL(body.url).pathname.includes(`/topics/${body.topicId}/${body.kind}-`)) return NextResponse.json({ error: "مسار غير صالح." }, { status: 400 });
  const old = topic.files.find((file) => file.kind === body.kind);
  const files = topic.files.filter((file) => file.kind !== body.kind);
  files.push({ kind: body.kind, url: body.url, fileName: String(body.fileName || "exam.pdf"), sizeBytes: Number(body.sizeBytes) || 0, uploadedAt: new Date() });
  await prisma.topic.update({ where: { id: topic.id }, data: { files: { set: files } } });
  if (old?.url && old.url !== body.url) {
    if (isExamAzureUrl(old.url)) await deleteExamFile(old.url); else await deleteFile(old.url);
  }
  revalidatePath(`/admin/topics/${topic.id}`);
  revalidatePath(`/topics/${topic.slug}`);
  return NextResponse.json({ ok: true });
}
