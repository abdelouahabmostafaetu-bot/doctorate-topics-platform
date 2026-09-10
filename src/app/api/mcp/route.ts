import { NextRequest } from "next/server";
import { GET as importerGet, POST as importerPost } from "../mcp-import/route";

type Json = Record<string, unknown>;

function pdfUrl(value: unknown) {
  const match = String(value || "").match(/https?:\/\/\S+?\.pdf(?:\?\S*)?/i);
  return match?.[0] || "";
}

function legacyToImporter(args: Json): Json {
  const defaults = args.defaults && typeof args.defaults === "object" && !Array.isArray(args.defaults)
    ? args.defaults as Json
    : {};
  const exams = Array.isArray(args.exams) ? args.exams : [];
  return {
    attachToExisting: true,
    stopOnError: args.stopOnError === true,
    defaults: {
      university: defaults.university,
      universityAr: defaults.universityAr,
      specialty: defaults.specialty,
      specialtyAr: defaults.specialtyAr,
      examType: defaults.examType,
      status: defaults.status,
      durationMinutes: defaults.durationMinutes,
      coefficient: defaults.coefficient,
      generateReader: true,
    },
    exams: exams.map((raw) => {
      const item = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Json : {};
      const source = pdfUrl(item.sourceNote || defaults.sourceNote);
      return {
        university: item.university,
        universityAr: item.universityAr,
        specialty: item.specialty,
        specialtyAr: item.specialtyAr,
        year: item.year,
        examType: item.examType,
        examNumber: item.examNumber,
        title: item.title,
        status: item.status,
        durationMinutes: item.durationMinutes,
        coefficient: item.coefficient,
        pdfUrl: source,
        sourceUrl: source,
        generateReader: true,
      };
    }),
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as Json | null;
  if (!body) {
    return importerPost(new NextRequest(request.url, { method: "POST", headers: request.headers, body: "{" }));
  }
  const params = body.params && typeof body.params === "object" ? body.params as Json : {};
  if (body.method === "tools/call" && params.name === "add_exams_bulk") {
    body.params = { ...params, name: "import_exam_pdfs_bulk", arguments: legacyToImporter((params.arguments || {}) as Json) };
  }
  return importerPost(new NextRequest(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify(body),
  }));
}

export const GET = importerGet;
