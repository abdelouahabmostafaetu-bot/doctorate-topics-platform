import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { durationFromExamType } from "@/lib/exam-duration";
import { deleteFile } from "@/lib/storage";
import {
  allocateManualLegacyId,
  ensureSpecialty,
  ensureUniversity,
  parseProblems,
  uniqueTopicSlug,
} from "@/lib/topic-helpers";

/**
 * MCP Server (Streamable HTTP, stateless JSON-RPC 2.0)
 * ----------------------------------------------------
 * يسمح لأي ذكاء اصطناعي خارجي (Claude / Cursor / ChatGPT ...) بإضافة
 * امتحانات إلى الموقع عبر بروتوكول MCP.
 *
 * الرابط:   https://www.docmathdz.dev/api/mcp
 * الحماية:  Authorization: Bearer <MCP_SECRET>  أو  ?key=<MCP_SECRET>
 * المتغير:  MCP_SECRET في .env / Vercel
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SERVER_INFO = { name: "docmathdz-exams", version: "1.0.0" };
const PROTOCOL_VERSION = "2025-03-26";
const SITE = "https://www.docmathdz.dev";

/* ------------------------------------------------------------------ */
/* دليل الصيغة — يُعاد للنموذج عبر أداة get_exam_format                 */
/* ------------------------------------------------------------------ */

const FORMAT_GUIDE = [
  "# Exam writing format for docmathdz.dev",
  "",
  "## Math syntax (STRICT - GitLab flavored)",
  "- Inline math: $`x^2 + y^2 = r^2`$   (dollar + backtick ... backtick + dollar)",
  "- Display math: a fenced code block with language `math`:",
  "  ```math",
  "  \\int_0^1 f(x)\\,dx = F(1) - F(0)",
  "  ```",
  "- NEVER use $$...$$, \\[...\\], \\(...\\) or single $...$ without backticks.",
  "- Text language: French for math content (as in Algerian doctorate exams), Arabic allowed in remarks.",
  "",
  "## Problem object structure (JSON)",
  "{",
  '  "problemNumber": 1,            // integer, order in the exam',
  '  "title": "Exercice 1",         // short title',
  '  "difficulty": "medium",        // easy | medium | hard',
  '  "tags": ["algèbre", "groupes"], // short topic tags',
  '  "statement": "...",            // FULL problem text with math syntax above',
  '  "solution": "...",             // optional, null if unknown',
  '  "remark": null                  // optional note',
  "}",
  "",
  "## Exam (topic) fields for add_exam",
  "- university: string (e.g. 'Blida 1') — created automatically if new",
  "- specialty: string (e.g. 'Mathématiques') — created automatically if new",
  "- year: integer (e.g. 2025)",
  "- examType: 'general' (مسابقة عامة) or 'specialty' (مسابقة تخصص)",
  "- examNumber: optional integer if the university had several exams that year",
  "- coefficient / durationMinutes: optional integers",
  "- status: 'draft' (default, recommended — admin reviews later) or 'published'",
  "- problems: array of problem objects (at least 1, statement required)",
  "",
  "## Recommended workflow",
  "1. call list_universities and list_specialties to reuse existing names",
  "2. call check_exam_exists to avoid duplicates",
  "3. call add_exam with the full JSON",
  "",
  "## Editing / deleting",
  "- list_exams: search by university/specialty/year/status/keyword",
  "- get_exam: fetch the full exam with problems (ALWAYS call before editing)",
  "- update_exam: change exam fields and/or REPLACE the whole problems array",
  "- add_problem / update_problem / delete_problem: edit a single problem by problemNumber",
  "- delete_exam: permanent, requires confirm=true",
].join("\n");

/* ------------------------------------------------------------------ */
/* الأدوات                                                             */
/* ------------------------------------------------------------------ */

const TOOLS = [
  {
    name: "get_exam_format",
    description:
      "Returns the strict writing format (math syntax + JSON structure) required before adding any exam. Call this first.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_universities",
    description: "List all universities (id, name, nameAr, slug) available on the site.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_specialties",
    description: "List all specialties (id, name, nameAr, slug) available on the site.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "check_exam_exists",
    description:
      "Check if an exam already exists for a university + year (and optional examType) before adding, to avoid duplicates.",
    inputSchema: {
      type: "object",
      properties: {
        university: { type: "string", description: "University name or slug" },
        year: { type: "integer" },
        examType: { type: "string", enum: ["general", "specialty"] },
      },
      required: ["university", "year"],
    },
  },
  {
    name: "add_exam",
    description:
      "Add a doctorate exam (topic) with its problems. Math MUST follow get_exam_format syntax. Defaults to status=draft for admin review.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Optional title; auto-generated if omitted" },
        university: { type: "string", description: "University latin name, e.g. 'Blida 1'" },
        universityAr: { type: "string", description: "Optional Arabic name for a NEW university" },
        specialty: { type: "string", description: "Specialty latin name, e.g. 'Mathématiques'" },
        specialtyAr: { type: "string", description: "Optional Arabic name for a NEW specialty" },
        year: { type: "integer", description: "Exam year, e.g. 2025" },
        examType: { type: "string", enum: ["general", "specialty"] },
        examNumber: { type: "integer", description: "Optional exam number within the year" },
        coefficient: { type: "integer" },
        durationMinutes: { type: "integer" },
        status: { type: "string", enum: ["draft", "published"], description: "Default draft" },
        sourceNote: { type: "string", description: "Optional note about where the exam came from" },
        problems: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            properties: {
              problemNumber: { type: "integer" },
              title: { type: "string" },
              difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
              tags: { type: "array", items: { type: "string" } },
              statement: { type: "string", description: "Required. Full problem text" },
              solution: { type: "string", description: "Optional solution" },
              remark: { type: "string" },
            },
            required: ["statement"],
          },
        },
      },
      required: ["university", "specialty", "year", "examType", "problems"],
    },
  },
  {
    name: "list_exams",
    description:
      "Search/list exams with optional filters (university, specialty, year, examType, status, keyword in title). Returns slugs used by get_exam/update_exam/delete_exam.",
    inputSchema: {
      type: "object",
      properties: {
        university: { type: "string" },
        specialty: { type: "string" },
        year: { type: "integer" },
        examType: { type: "string", enum: ["general", "specialty"] },
        status: { type: "string", enum: ["published", "draft", "needs_completion"] },
        keyword: { type: "string", description: "Substring of the title" },
        limit: { type: "integer", description: "Max results, default 20, max 500" },
        offset: { type: "integer", description: "Skip this many results (pagination)" },
      },
    },
  },
  {
    name: "get_exam",
    description:
      "Fetch one exam with ALL its problems (statements + solutions). Always call this before editing.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Exam slug (preferred) or id" },
      },
      required: ["topic"],
    },
  },
  {
    name: "update_exam",
    description:
      "Update exam fields (title, year, examType, examNumber, coefficient, durationMinutes, status, university, specialty) and/or REPLACE the whole problems array. To edit a single problem prefer update_problem.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Exam slug or id" },
        title: { type: "string" },
        year: { type: "integer" },
        examType: { type: "string", enum: ["general", "specialty"] },
        examNumber: { type: ["integer", "null"] },
        coefficient: { type: ["integer", "null"] },
        durationMinutes: { type: "integer" },
        status: { type: "string", enum: ["published", "draft", "needs_completion"] },
        university: { type: "string" },
        specialty: { type: "string" },
        problems: {
          type: "array",
          description: "Optional FULL replacement of all problems (same structure as add_exam)",
          items: { type: "object" },
        },
      },
      required: ["topic"],
    },
  },
  {
    name: "add_problem",
    description: "Append one problem to an existing exam. problemNumber auto-assigned if omitted.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string" },
        problem: {
          type: "object",
          properties: {
            problemNumber: { type: "integer" },
            title: { type: "string" },
            difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
            tags: { type: "array", items: { type: "string" } },
            statement: { type: "string" },
            solution: { type: "string" },
            remark: { type: "string" },
          },
          required: ["statement"],
        },
      },
      required: ["topic", "problem"],
    },
  },
  {
    name: "update_problem",
    description:
      "Edit one problem inside an exam, identified by problemNumber. Only provided fields change. Pass an empty string for solution/remark to remove them.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string" },
        problemNumber: { type: "integer" },
        newProblemNumber: { type: "integer", description: "Optional renumbering" },
        title: { type: "string" },
        difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
        tags: { type: "array", items: { type: "string" } },
        statement: { type: "string" },
        solution: { type: "string", description: "Empty string removes the solution" },
        remark: { type: "string", description: "Empty string removes the remark" },
      },
      required: ["topic", "problemNumber"],
    },
  },
  {
    name: "delete_problem",
    description: "Delete one problem from an exam by problemNumber.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string" },
        problemNumber: { type: "integer" },
      },
      required: ["topic", "problemNumber"],
    },
  },
  {
    name: "delete_exam",
    description: "PERMANENTLY delete an exam (and its stored files). Requires confirm=true.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string" },
        confirm: { type: "boolean", description: "Must be true" },
      },
      required: ["topic", "confirm"],
    },
  },
];

/* ------------------------------------------------------------------ */
/* منطق الأدوات                                                        */
/* ------------------------------------------------------------------ */

type Json = Record<string, unknown>;

function badMathReason(text: string): string | null {
  if (/\$\$/.test(text)) return "contains $$...$$ — use ```math blocks instead";
  if (/\\\[/.test(text)) return "contains \\[ ... \\] — use ```math blocks instead";
  if (/\\\(/.test(text)) return "contains \\( ... \\) — use inline $`...`$ instead";
  return null;
}

async function resolveUniversity(name: string, nameAr?: string) {
  const clean = name.trim();
  const found = await prisma.university.findFirst({
    where: {
      OR: [
        { name: { equals: clean, mode: "insensitive" } },
        { slug: slugify(clean) },
        { nameAr: clean },
      ],
    },
  });
  if (found) return found;
  return ensureUniversity({ name: clean, nameAr: nameAr || clean });
}

async function resolveSpecialty(name: string, nameAr?: string) {
  const clean = name.trim();
  const found = await prisma.specialty.findFirst({
    where: {
      OR: [
        { name: { equals: clean, mode: "insensitive" } },
        { slug: slugify(clean) },
        { nameAr: clean },
      ],
    },
  });
  if (found) return found;
  return ensureSpecialty({ name: clean, nameAr: nameAr || clean });
}

function assertMathOk(
  list: Array<{ problemNumber: number; statement: string; solution: string | null }>,
): void {
  for (const item of list) {
    const checks: Array<[string, string]> = [
      ["statement", item.statement],
      ["solution", item.solution ?? ""],
    ];
    for (const [field, text] of checks) {
      const bad = badMathReason(text);
      if (bad) {
        throw new Error(
          "problem #" + item.problemNumber + " " + field + " " + bad +
            ". Call get_exam_format and rewrite the math, then retry.",
        );
      }
    }
  }
}

async function resolveTopic(ref: unknown) {
  const clean = String(ref ?? "").trim();
  if (!clean) throw new Error("'topic' is required — pass the exam slug or id");
  const topic = /^[0-9a-f]{24}$/i.test(clean)
    ? await prisma.topic.findUnique({ where: { id: clean } })
    : await prisma.topic.findUnique({ where: { slug: clean } });
  if (!topic) {
    throw new Error("exam not found: '" + clean + "' — use list_exams to find the correct slug");
  }
  return topic;
}

function revalidateTopic(slug?: string): void {
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/admin/topics");
  if (slug) revalidatePath("/topics/" + slug);
}

async function toolListExams(args: Json): Promise<string> {
  const where: Json = {};
  if (args.year != null) where.year = Number(args.year);
  if (args.examType === "general" || args.examType === "specialty") where.examType = args.examType;
  if (args.status === "published" || args.status === "draft" || args.status === "needs_completion") {
    where.status = args.status;
  }
  if (args.university) {
    const name = String(args.university).trim();
    const uni = await prisma.university.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: "insensitive" } },
          { slug: slugify(name) },
          { nameAr: name },
        ],
      },
    });
    if (!uni) return JSON.stringify({ total: 0, exams: [], note: "university not found: " + name });
    where.universityId = uni.id;
  }
  if (args.specialty) {
    const name = String(args.specialty).trim();
    const spec = await prisma.specialty.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: "insensitive" } },
          { slug: slugify(name) },
          { nameAr: name },
        ],
      },
    });
    if (!spec) return JSON.stringify({ total: 0, exams: [], note: "specialty not found: " + name });
    where.specialtyId = spec.id;
  }
  if (args.keyword) {
    where.title = { contains: String(args.keyword), mode: "insensitive" };
  }
  const limitRaw = Number(args.limit);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 20;
  const offsetRaw = Number(args.offset);
  const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? Math.floor(offsetRaw) : 0;

  const rows = await prisma.topic.findMany({
    where: where as never,
    select: {
      slug: true,
      title: true,
      year: true,
      examType: true,
      examNumber: true,
      status: true,
      university: { select: { name: true } },
      specialty: { select: { name: true } },
    },
    orderBy: [ { year: "desc" }, { examNumber: "asc" } ],
    skip: offset,
    take: limit,
  });

  return JSON.stringify(
    {
      total: rows.length,
      exams: rows.map((r) => ({
        slug: r.slug,
        title: r.title,
        year: r.year,
        examType: r.examType,
        examNumber: r.examNumber,
        status: r.status,
        university: r.university.name,
        specialty: r.specialty.name,
        url: SITE + "/topics/" + r.slug,
      })),
    },
    null,
    2,
  );
}

async function toolGetExam(args: Json): Promise<string> {
  const topic = await resolveTopic(args.topic);
  const [uni, spec] = await Promise.all([
    prisma.university.findUnique({ where: { id: topic.universityId } }),
    prisma.specialty.findUnique({ where: { id: topic.specialtyId } }),
  ]);
  return JSON.stringify(
    {
      slug: topic.slug,
      title: topic.title,
      year: topic.year,
      examType: topic.examType,
      examNumber: topic.examNumber,
      coefficient: topic.coefficient,
      durationMinutes: topic.durationMinutes,
      status: topic.status,
      university: uni ? uni.name : null,
      specialty: spec ? spec.name : null,
      url: SITE + "/topics/" + topic.slug,
      problems: topic.problems,
    },
    null,
    2,
  );
}

async function toolUpdateExam(args: Json): Promise<string> {
  const topic = await resolveTopic(args.topic);
  const data: Json = {};

  if (args.title != null && String(args.title).trim()) data.title = String(args.title).trim();
  if (args.year != null) {
    const y = Number(args.year);
    if (!Number.isFinite(y) || y < 1990 || y > 2100) throw new Error("invalid 'year'");
    data.year = y;
  }
  if (args.examType != null) {
    if (args.examType !== "general" && args.examType !== "specialty") {
      throw new Error("invalid 'examType' — must be 'general' or 'specialty'");
    }
    data.examType = args.examType;
  }
  if ("examNumber" in args) {
    data.examNumber = args.examNumber == null ? null : Number(args.examNumber);
  }
  if ("coefficient" in args) {
    data.coefficient = args.coefficient == null ? null : Number(args.coefficient);
  }
  if (args.durationMinutes != null) {
    const d = Number(args.durationMinutes);
    if (!Number.isFinite(d) || d <= 0) throw new Error("invalid 'durationMinutes'");
    data.durationMinutes = d;
  }
  if (args.status != null) {
    if (args.status !== "published" && args.status !== "draft" && args.status !== "needs_completion") {
      throw new Error("invalid 'status' — published | draft | needs_completion");
    }
    data.status = args.status;
  }
  if (args.university != null) {
    const uni = await resolveUniversity(
      String(args.university),
      args.universityAr ? String(args.universityAr) : undefined,
    );
    data.universityId = uni.id;
  }
  if (args.specialty != null) {
    const spec = await resolveSpecialty(
      String(args.specialty),
      args.specialtyAr ? String(args.specialtyAr) : undefined,
    );
    data.specialtyId = spec.id;
  }
  if (args.problems != null) {
    const problems = parseProblems(JSON.stringify(args.problems));
    if (problems.length === 0) {
      throw new Error("'problems' replacement must contain at least one valid problem with a statement");
    }
    assertMathOk(problems);
    data.problems = problems;
  }

  if (Object.keys(data).length === 0) {
    throw new Error("nothing to update — pass at least one field to change");
  }

  const updated = await prisma.topic.update({ where: { id: topic.id }, data: data as never });
  revalidateTopic(updated.slug);
  return JSON.stringify(
    {
      ok: true,
      slug: updated.slug,
      url: SITE + "/topics/" + updated.slug,
      updatedFields: Object.keys(data),
    },
    null,
    2,
  );
}

async function toolAddProblem(args: Json): Promise<string> {
  const topic = await resolveTopic(args.topic);
  const raw = (args.problem ?? {}) as Json;
  const parsed = parseProblems(JSON.stringify([raw]));
  if (parsed.length === 0) throw new Error("'problem.statement' is required");
  const p = parsed[0];
  const maxNumber = topic.problems.reduce((m, x) => Math.max(m, x.problemNumber), 0);
  if (raw.problemNumber == null) {
    p.problemNumber = maxNumber + 1;
  } else if (topic.problems.some((x) => x.problemNumber === p.problemNumber)) {
    throw new Error(
      "problemNumber " + p.problemNumber + " already exists — omit it to auto-assign " + (maxNumber + 1),
    );
  }
  assertMathOk([p]);
  const problems = [...topic.problems, p].sort((a, b) => a.problemNumber - b.problemNumber);
  await prisma.topic.update({ where: { id: topic.id }, data: { problems } });
  revalidateTopic(topic.slug);
  return JSON.stringify(
    { ok: true, slug: topic.slug, addedProblemNumber: p.problemNumber, totalProblems: problems.length },
    null,
    2,
  );
}

async function toolUpdateProblem(args: Json): Promise<string> {
  const topic = await resolveTopic(args.topic);
  const n = Number(args.problemNumber);
  const idx = topic.problems.findIndex((p) => p.problemNumber === n);
  if (idx < 0) {
    throw new Error(
      "problem #" + n + " not found — existing numbers: " +
        topic.problems.map((p) => p.problemNumber).join(", "),
    );
  }
  const next = { ...topic.problems[idx] };
  const changed: string[] = [];

  if (args.statement != null && String(args.statement).trim()) {
    next.statement = String(args.statement).trim();
    changed.push("statement");
  }
  if ("solution" in args) {
    const sol = args.solution == null ? "" : String(args.solution).trim();
    next.solution = sol || null;
    next.hasSolution = Boolean(sol);
    changed.push("solution");
  }
  if (args.title != null && String(args.title).trim()) {
    next.title = String(args.title).trim();
    changed.push("title");
  }
  if (args.difficulty != null) {
    if (args.difficulty !== "easy" && args.difficulty !== "medium" && args.difficulty !== "hard") {
      throw new Error("invalid 'difficulty' — easy | medium | hard");
    }
    next.difficulty = args.difficulty as "easy" | "medium" | "hard";
    changed.push("difficulty");
  }
  if (args.tags != null) {
    next.tags = Array.isArray(args.tags)
      ? args.tags.map(String).map((t) => t.trim()).filter(Boolean)
      : [];
    changed.push("tags");
  }
  if ("remark" in args) {
    const r = args.remark == null ? "" : String(args.remark).trim();
    next.remark = r || null;
    changed.push("remark");
  }
  if (args.newProblemNumber != null) {
    const nn = Number(args.newProblemNumber);
    if (!Number.isFinite(nn) || nn <= 0) throw new Error("invalid 'newProblemNumber'");
    if (nn !== n && topic.problems.some((p) => p.problemNumber === nn)) {
      throw new Error("problemNumber " + nn + " already exists");
    }
    next.problemNumber = nn;
    changed.push("problemNumber");
  }

  if (changed.length === 0) throw new Error("nothing to update — pass at least one field");
  assertMathOk([next]);

  const problems = [...topic.problems];
  problems[idx] = next;
  problems.sort((a, b) => a.problemNumber - b.problemNumber);
  await prisma.topic.update({ where: { id: topic.id }, data: { problems } });
  revalidateTopic(topic.slug);
  return JSON.stringify(
    { ok: true, slug: topic.slug, problemNumber: next.problemNumber, changed },
    null,
    2,
  );
}

async function toolDeleteProblem(args: Json): Promise<string> {
  const topic = await resolveTopic(args.topic);
  const n = Number(args.problemNumber);
  const problems = topic.problems.filter((p) => p.problemNumber !== n);
  if (problems.length === topic.problems.length) {
    throw new Error(
      "problem #" + n + " not found — existing numbers: " +
        topic.problems.map((p) => p.problemNumber).join(", "),
    );
  }
  await prisma.topic.update({ where: { id: topic.id }, data: { problems } });
  revalidateTopic(topic.slug);
  return JSON.stringify(
    { ok: true, slug: topic.slug, deletedProblemNumber: n, remainingProblems: problems.length },
    null,
    2,
  );
}

async function toolDeleteExam(args: Json): Promise<string> {
  if (args.confirm !== true) {
    throw new Error("deletion is permanent — call again with confirm: true");
  }
  const topic = await resolveTopic(args.topic);
  await Promise.all(topic.files.map((f) => deleteFile(f.url)));
  await prisma.topic.delete({ where: { id: topic.id } });
  revalidateTopic(topic.slug);
  return JSON.stringify(
    { ok: true, deleted: true, slug: topic.slug, title: topic.title },
    null,
    2,
  );
}

async function toolAddExam(args: Json): Promise<string> {
  const year = Number(args.year);
  const examType = String(args.examType ?? "");
  if (!Number.isFinite(year) || year < 1990 || year > 2100) {
    throw new Error("invalid 'year' — expected integer like 2025");
  }
  if (examType !== "general" && examType !== "specialty") {
    throw new Error("invalid 'examType' — must be 'general' or 'specialty'");
  }
  if (!args.university || !args.specialty) {
    throw new Error("'university' and 'specialty' are required");
  }

  const problems = parseProblems(JSON.stringify(args.problems ?? []));
  if (problems.length === 0) {
    throw new Error("no valid problems — each problem needs a non-empty 'statement'");
  }

  // فحص صيغة الرياضيات قبل الحفظ
  assertMathOk(problems);

  const university = await resolveUniversity(
    String(args.university),
    args.universityAr ? String(args.universityAr) : undefined,
  );
  const specialty = await resolveSpecialty(
    String(args.specialty),
    args.specialtyAr ? String(args.specialtyAr) : undefined,
  );

  const examNumber = args.examNumber != null && Number.isFinite(Number(args.examNumber))
    ? Number(args.examNumber)
    : null;

  // منع التكرار الصريح
  const dup = await prisma.topic.findFirst({
    where: { universityId: university.id, year, examType, examNumber },
    select: { slug: true, title: true },
  });
  if (dup) {
    throw new Error(
      "duplicate: an exam already exists for this university/year/type" +
        (examNumber != null ? "/number" : "") +
        " -> " + SITE + "/topics/" + dup.slug +
        ". Pass a different examNumber if this is really another exam.",
    );
  }

  const slug = await uniqueTopicSlug(
    university.name + "-" + year + "-" + examType + "-" + (examNumber ?? "01"),
  );
  const title =
    String(args.title ?? "").trim() ||
    "مسابقة الدكتوراه " + year + " — " + university.nameAr;

  const parsedDuration = Number(args.durationMinutes);
  const durationMinutes = Number.isFinite(parsedDuration) && parsedDuration > 0
    ? parsedDuration
    : durationFromExamType(examType);

  const status = args.status === "published" ? "published" : "draft";
  const legacyId = await allocateManualLegacyId();

  const topic = await prisma.topic.create({
    data: {
      slug,
      title,
      examType,
      year,
      universityId: university.id,
      specialtyId: specialty.id,
      source:
        "MCP — " + university.name + " " + year +
        (args.sourceNote ? " — " + String(args.sourceNote).slice(0, 200) : ""),
      examNumber,
      coefficient: Number.isFinite(Number(args.coefficient)) && args.coefficient != null
        ? Number(args.coefficient)
        : null,
      durationMinutes,
      problems,
      legacyId,
      files: [],
      status,
    },
  });

  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/admin/topics");
  revalidatePath("/topics/" + topic.slug);

  return JSON.stringify(
    {
      ok: true,
      id: topic.id,
      slug: topic.slug,
      status,
      url: SITE + "/topics/" + topic.slug,
      problems: problems.length,
      withSolutions: problems.filter((p) => p.hasSolution).length,
      note: status === "draft"
        ? "saved as draft — an admin must publish it from /admin/topics"
        : "published",
    },
    null,
    2,
  );
}

async function callTool(name: string, args: Json): Promise<string> {
  switch (name) {
    case "get_exam_format":
      return FORMAT_GUIDE;

    case "list_universities": {
      const rows = await prisma.university.findMany({
        select: { id: true, name: true, nameAr: true, slug: true },
        orderBy: { name: "asc" },
      });
      return JSON.stringify(rows, null, 2);
    }

    case "list_specialties": {
      const rows = await prisma.specialty.findMany({
        select: { id: true, name: true, nameAr: true, slug: true },
        orderBy: { name: "asc" },
      });
      return JSON.stringify(rows, null, 2);
    }

    case "check_exam_exists": {
      const uniName = String(args.university ?? "").trim();
      const year = Number(args.year);
      if (!uniName || !Number.isFinite(year)) {
        throw new Error("'university' and integer 'year' are required");
      }
      const uni = await prisma.university.findFirst({
        where: {
          OR: [
            { name: { equals: uniName, mode: "insensitive" } },
            { slug: slugify(uniName) },
            { nameAr: uniName },
          ],
        },
      });
      if (!uni) {
        return JSON.stringify({ exists: false, university: null, matches: [] });
      }
      const where: Json = { universityId: uni.id, year };
      if (args.examType === "general" || args.examType === "specialty") {
        where.examType = args.examType;
      }
      const matches = await prisma.topic.findMany({
        where: where as never,
        select: {
          slug: true, title: true, examType: true, examNumber: true, status: true,
        },
        orderBy: { examNumber: "asc" },
      });
      return JSON.stringify(
        {
          exists: matches.length > 0,
          university: { id: uni.id, name: uni.name },
          matches: matches.map((m) => ({
            ...m,
            url: SITE + "/topics/" + m.slug,
          })),
        },
        null,
        2,
      );
    }

    case "add_exam":
      return toolAddExam(args);

    case "list_exams":
      return toolListExams(args);

    case "get_exam":
      return toolGetExam(args);

    case "update_exam":
      return toolUpdateExam(args);

    case "add_problem":
      return toolAddProblem(args);

    case "update_problem":
      return toolUpdateProblem(args);

    case "delete_problem":
      return toolDeleteProblem(args);

    case "delete_exam":
      return toolDeleteExam(args);

    default:
      throw new Error("unknown tool: " + name);
  }
}

/* ------------------------------------------------------------------ */
/* JSON-RPC 2.0 عبر HTTP                                               */
/* ------------------------------------------------------------------ */

function authorized(req: NextRequest): { ok: boolean; reason?: string } {
  const secret = (process.env.MCP_SECRET ?? "").trim();
  if (!secret) return { ok: false, reason: "MCP_SECRET is not configured on the server" };
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.replace(/^Bearer\s+/i, "").trim();
  const key = req.nextUrl.searchParams.get("key") ?? "";
  if (bearer === secret || key === secret) return { ok: true };
  return { ok: false, reason: "invalid or missing key" };
}

function rpc(id: unknown, payload: Json, status = 200) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, ...payload }, { status });
}

export async function POST(req: NextRequest) {
  const auth = authorized(req);
  if (!auth.ok) {
    return rpc(null, { error: { code: -32001, message: "Unauthorized: " + auth.reason } }, 401);
  }

  let body: Json;
  try {
    body = (await req.json()) as Json;
  } catch {
    return rpc(null, { error: { code: -32700, message: "Parse error" } }, 400);
  }

  const id = body.id;
  const method = String(body.method ?? "");
  const params = (body.params ?? {}) as Json;

  // إشعارات بدون رد
  if (method.startsWith("notifications/")) {
    return new NextResponse(null, { status: 202 });
  }

  if (method === "initialize") {
    return rpc(id, {
      result: {
        protocolVersion:
          typeof params.protocolVersion === "string" ? params.protocolVersion : PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions:
          "MCP server for docmathdz.dev — full exam management (add, edit, delete, search). " +
          "Call get_exam_format before writing any math. Use list_exams/get_exam to find exams, " +
          "then add_exam / update_exam / add_problem / update_problem / delete_problem / delete_exam.",
      },
    });
  }

  if (method === "ping") return rpc(id, { result: {} });

  if (method === "tools/list") return rpc(id, { result: { tools: TOOLS } });

  if (method === "tools/call") {
    const name = String(params.name ?? "");
    const args = (params.arguments ?? {}) as Json;
    try {
      const text = await callTool(name, args);
      return rpc(id, { result: { content: [ { type: "text", text } ], isError: false } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return rpc(id, {
        result: { content: [ { type: "text", text: "ERROR: " + msg } ], isError: true },
      });
    }
  }

  return rpc(id, { error: { code: -32601, message: "Method not found: " + method } });
}

// بعض عملاء MCP يجربون GET أولًا — نعيد معلومات بسيطة
export async function GET(req: NextRequest) {
  const auth = authorized(req);
  return NextResponse.json({
    ok: true,
    server: SERVER_INFO,
    transport: "streamable-http (stateless)",
    authorized: auth.ok,
    usage: "POST JSON-RPC 2.0 to this URL. Auth: 'Authorization: Bearer <MCP_SECRET>' or '?key=<MCP_SECRET>'",
    tools: TOOLS.map((t) => t.name),
  });
}

export async function DELETE() {
  return new NextResponse(null, { status: 405 });
}
