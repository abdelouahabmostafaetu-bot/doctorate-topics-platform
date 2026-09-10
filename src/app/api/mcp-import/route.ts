import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { durationFromExamType } from "@/lib/exam-duration";
import { allocateManualLegacyId, ensureSpecialty, ensureUniversity, uniqueTopicSlug } from "@/lib/topic-helpers";
import { copyExamPdfFromUrl, deleteExamFile, isExamAzureUrl } from "@/lib/exam-storage";
import { deleteFile } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const SITE = "https://www.docmathdz.dev";
const MAX_ITEMS = 20;
const INFO = { name: "docmathdz-azure-import", version: "1.0.0" };
type Json = Record<string, unknown>;
type Kind = "exam_pdf" | "solution_pdf";
const TOOL = {
  name: "import_exam_pdfs_bulk",
  description: "Copy up to 20 complete doctorate-exam PDFs directly from public university URLs to Azure, create draft file-only topics or attach to existing topics, and preserve official source URLs. No PDF text rewriting.",
  inputSchema: {
    type: "object",
    properties: {
      defaults: { type: "object", properties: {
        university: { type: "string" }, universityAr: { type: "string" }, specialty: { type: "string" }, specialtyAr: { type: "string" },
        examType: { type: "string", enum: ["general", "specialty"] }, status: { type: "string", enum: ["draft", "published"] },
        durationMinutes: { type: "integer" }, coefficient: { type: "integer" }, sourceUrl: { type: "string" },
      } },
      attachToExisting: { type: "boolean", description: "Default true: attach PDF to a matching exam instead of reporting duplicate" },
      stopOnError: { type: "boolean", description: "Default false" },
      exams: { type: "array", minItems: 1, maxItems: MAX_ITEMS, items: { type: "object", properties: {
        university: { type: "string" }, universityAr: { type: "string" }, specialty: { type: "string" }, specialtyAr: { type: "string" },
        year: { type: "integer" }, examType: { type: "string", enum: ["general", "specialty"] }, examNumber: { type: "integer" }, title: { type: "string" },
        status: { type: "string", enum: ["draft", "published"] }, durationMinutes: { type: "integer" }, coefficient: { type: "integer" },
        pdfUrl: { type: "string", description: "Public direct university PDF URL" }, solutionPdfUrl: { type: "string" }, sourceUrl: { type: "string" },
        fileName: { type: "string" }, solutionFileName: { type: "string" },
      }, required: ["year", "pdfUrl"] } },
    }, required: ["exams"],
  },
};
function auth(req: NextRequest) {
  const secret = (process.env.MCP_SECRET || "").trim();
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  return Boolean(secret) && (bearer === secret || req.nextUrl.searchParams.get("key") === secret);
}
function rpc(id: unknown, payload: Json, status = 200) { return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, ...payload }, { status }); }
function safeName(value: string, fallback: string) {
  const decoded = (() => { try { return decodeURIComponent(value); } catch { return value; } })();
  const name = decoded.split("/").pop()?.split("?")[0] || fallback;
  const base = name.replace(/\.pdf$/i, "").replace(/[^A-Za-z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 90) || fallback;
  return base + ".pdf";
}
async function university(name: string, nameAr?: string) {
  const clean = name.trim();
  return await prisma.university.findFirst({ where: { OR: [{ name: { equals: clean, mode: "insensitive" } }, { slug: slugify(clean) }, { nameAr: clean }] } }) || ensureUniversity({ name: clean, nameAr: nameAr || clean });
}
async function specialty(name: string, nameAr?: string) {
  const clean = name.trim();
  return await prisma.specialty.findFirst({ where: { OR: [{ name: { equals: clean, mode: "insensitive" } }, { slug: slugify(clean) }, { nameAr: clean }] } }) || ensureSpecialty({ name: clean, nameAr: nameAr || clean });
}
async function replaceFile(topicId: string, kind: Kind, sourceUrl: string, fileName: string) {
  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  if (!topic) throw new Error("topic disappeared during import");
  const blobName = `topics/${topicId}/${kind}-${Date.now()}-${safeName(fileName, kind)}`;
  const copied = await copyExamPdfFromUrl(sourceUrl, blobName, fileName);
  const old = topic.files.find((f) => f.kind === kind);
  try {
    const files = topic.files.filter((f) => f.kind !== kind);
    files.push({ kind, url: copied.url, fileName, sizeBytes: copied.sizeBytes, uploadedAt: new Date() });
    await prisma.topic.update({ where: { id: topicId }, data: { files: { set: files } } });
  } catch (error) {
    await deleteExamFile(copied.url);
    throw error;
  }
  if (old?.url && old.url !== copied.url) {
    if (isExamAzureUrl(old.url)) await deleteExamFile(old.url); else await deleteFile(old.url);
  }
  return copied;
}
async function importOne(raw: Json, attach: boolean) {
  const year = Number(raw.year);
  const examType = String(raw.examType || "specialty");
  const universityName = String(raw.university || "").trim();
  const specialtyName = String(raw.specialty || "").trim();
  const pdfUrl = String(raw.pdfUrl || "").trim();
  if (!Number.isInteger(year) || year < 1900 || year > 2100) throw new Error("invalid year");
  if (!universityName || !specialtyName || !pdfUrl) throw new Error("university, specialty and pdfUrl are required");
  if (examType !== "general" && examType !== "specialty") throw new Error("examType must be general or specialty");
  const [uni, spec] = await Promise.all([university(universityName, raw.universityAr ? String(raw.universityAr) : undefined), specialty(specialtyName, raw.specialtyAr ? String(raw.specialtyAr) : undefined)]);
  const examNumber = raw.examNumber == null ? null : Number(raw.examNumber);
  let topic = await prisma.topic.findFirst({ where: { universityId: uni.id, specialtyId: spec.id, year, examType, examNumber } });
  const existed = Boolean(topic);
  if (topic && !attach) throw new Error(`duplicate: ${SITE}/topics/${topic.slug}`);
  if (!topic) {
    const slug = await uniqueTopicSlug(`${uni.name}-${year}-${examType}-${examNumber ?? "01"}`);
    const parsedDuration = Number(raw.durationMinutes);
    topic = await prisma.topic.create({ data: {
      slug, title: String(raw.title || "").trim() || `مسابقة الدكتوراه ${year} — ${uni.nameAr}`,
      examType, year, examNumber, coefficient: raw.coefficient == null ? null : Number(raw.coefficient),
      durationMinutes: Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : durationFromExamType(examType),
      universityId: uni.id, specialtyId: spec.id, source: String(raw.sourceUrl || pdfUrl), problems: [], files: [],
      legacyId: await allocateManualLegacyId(), status: raw.status === "published" ? "published" : "draft",
    } });
  }
  try {
    const fileName = safeName(String(raw.fileName || new URL(pdfUrl).pathname), "exam");
    const exam = await replaceFile(topic.id, "exam_pdf", pdfUrl, fileName);
    let solution: { url: string; sizeBytes: number } | null = null;
    if (raw.solutionPdfUrl) {
      const solutionUrl = String(raw.solutionPdfUrl);
      const solutionName = safeName(String(raw.solutionFileName || new URL(solutionUrl).pathname), "solution");
      solution = await replaceFile(topic.id, "solution_pdf", solutionUrl, solutionName);
    }
    await prisma.topic.update({ where: { id: topic.id }, data: { source: String(raw.sourceUrl || pdfUrl) } });
    return { action: existed ? "attached" : "created", slug: topic.slug, url: `${SITE}/topics/${topic.slug}`, examPdf: exam, solutionPdf: solution };
  } catch (error) {
    if (!existed) await prisma.topic.delete({ where: { id: topic.id } }).catch(() => undefined);
    throw error;
  }
}
async function run(args: Json) {
  const list = args.exams;
  if (!Array.isArray(list) || !list.length || list.length > MAX_ITEMS) throw new Error(`exams must contain 1-${MAX_ITEMS} items`);
  const defaults = args.defaults && typeof args.defaults === "object" && !Array.isArray(args.defaults) ? args.defaults as Json : {};
  const attach = args.attachToExisting !== false;
  const added: Json[] = [], failed: Json[] = [];
  for (let index = 0; index < list.length; index++) {
    const item = { ...defaults, ...(list[index] as Json) };
    try { added.push({ index, ...await importOne(item, attach) }); }
    catch (error) { failed.push({ index, pdfUrl: item.pdfUrl || null, error: error instanceof Error ? error.message : String(error) }); if (args.stopOnError === true) break; }
  }
  revalidatePath("/"); revalidatePath("/search"); revalidatePath("/admin/topics");
  for (const item of added) revalidatePath(`/topics/${String(item.slug)}`);
  return JSON.stringify({ ok: failed.length === 0, requested: list.length, importedCount: added.length, failedCount: failed.length, added, failed }, null, 2);
}
export async function POST(req: NextRequest) {
  if (!auth(req)) return rpc(null, { error: { code: -32001, message: "Unauthorized" } }, 401);
  const body = await req.json().catch(() => null) as Json | null;
  if (!body) return rpc(null, { error: { code: -32700, message: "Parse error" } }, 400);
  const id = body.id, method = String(body.method || ""), params = (body.params || {}) as Json;
  if (method === "initialize") return rpc(id, { result: { protocolVersion: String(params.protocolVersion || "2025-03-26"), capabilities: { tools: { listChanged: false } }, serverInfo: INFO, instructions: "Use import_exam_pdfs_bulk to copy complete public university PDFs directly to Azure. Send at most 20 per call. Files are not rewritten." } });
  if (method === "ping") return rpc(id, { result: {} });
  if (method.startsWith("notifications/")) return new NextResponse(null, { status: 202 });
  if (method === "tools/list") return rpc(id, { result: { tools: [TOOL] } });
  if (method === "tools/call") {
    if (String(params.name || "") !== TOOL.name) return rpc(id, { result: { content: [{ type: "text", text: "ERROR: unknown tool" }], isError: true } });
    try { return rpc(id, { result: { content: [{ type: "text", text: await run((params.arguments || {}) as Json) }], isError: false } }); }
    catch (error) { return rpc(id, { result: { content: [{ type: "text", text: "ERROR: " + (error instanceof Error ? error.message : String(error)) }], isError: true } }); }
  }
  return rpc(id, { error: { code: -32601, message: "Method not found" } });
}
export async function GET(req: NextRequest) { return NextResponse.json({ ok: true, server: INFO, authorized: auth(req), endpoint: `${SITE}/api/mcp-import`, tools: [TOOL.name] }); }
