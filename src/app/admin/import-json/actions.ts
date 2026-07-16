"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { slugify } from "@/lib/slugify";
import { durationFromExamType } from "@/lib/exam-duration";
import {
  allocateManualLegacyId,
  ensureSpecialty,
  ensureUniversity,
  parseProblems,
  uniqueTopicSlug,
} from "@/lib/topic-helpers";

/**
 * استيراد اختبارات من ملفات JSON — للأدمين فقط.
 * ---------------------------------------------
 * الفائدة: الأدمين يطلب من أي ذكاء اصطناعي (ChatGPT / Gemini / Le Chat ...)
 * تحويل صور أو PDF امتحان إلى ملف JSON بالصيغة الموحدة، ثم يرفعه هنا
 * فيُضاف ويُنشر مباشرة دون إعادة كتابة أي شيء.
 *
 * صيغة الرياضيات (صارمة):
 * - داخل السطر: $x^2$
 * - معروضة: $$ في سطر مستقل ثم الكود ثم $$ في سطر مستقل
 * - يُحوَّل تلقائيًا: $`كود`$ إلى $كود$ ، وكتل ```math و $$ بسطر واحد
 *   إلى كتل $$ متعددة الأسطر
 * - يُرفض: \[ ... \] و \( ... \)
 */

const SITE = "https://www.docmathdz.dev";
const MAX_EXAMS_PER_FILE = 30;

export type ImportExamResult = {
  index: number;
  ok: boolean;
  title?: string;
  slug?: string;
  url?: string;
  status?: string;
  problems?: number;
  error?: string;
};

export type ImportFileOutcome = {
  fileName: string;
  results: ImportExamResult[];
};

async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    throw new Error("فقط المديرون يملكون هذا الإجراء");
  }
  return session!.user!;
}

/**
 * توحيد صيغة الرياضيات تلقائيًا قبل الحفظ:
 * 1) $`code`$        ->  $code$
 * 2) ```math ... ```  ->  $$\n ... \n$$
 * 3) $$ code $$ (سطر واحد) -> $$\n code \n$$
 */
function normalizeMath(text: string): string {
  let t = text;
  // صيغة GitLab القديمة داخل السطر
  t = t.replace(/\$`([^`]+)`\$/g, (_m, code: string) => "$" + code.trim() + "$");
  // كتل ```math
  t = t.replace(/```math[ \t]*\r?\n([\s\S]*?)```/g, (_m, code: string) => "$$\n" + code.trim() + "\n$$");
  // $$ ... $$ في سطر واحد -> كتلة متعددة الأسطر
  t = t.replace(/\$\$[ \t]*([^\n$][^\n]*?)[ \t]*\$\$/g, (_m, code: string) => "$$\n" + code.trim() + "\n$$");
  return t;
}

function badMathReason(text: string): string | null {
  if (/\\\[/.test(text)) return "يحتوي \\[ ... \\] — استعمل كتلة $$ بدلًا منها";
  if (/\\\(/.test(text)) return "يحتوي \\( ... \\) — استعمل $...$ داخل السطر بدلًا منها";
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

async function importOneExam(
  raw: Record<string, unknown>,
  index: number,
): Promise<ImportExamResult> {
  const rawTitle = String(raw.title ?? "").trim();
  try {
    const year = Number(raw.year);
    if (!Number.isFinite(year) || year < 1990 || year > 2100) {
      throw new Error("حقل year غير صالح — المطلوب عدد صحيح مثل 2025");
    }
    const examType = String(raw.examType ?? "");
    if (examType !== "general" && examType !== "specialty") {
      throw new Error("حقل examType يجب أن يكون 'general' أو 'specialty'");
    }
    if (!raw.university || !raw.specialty) {
      throw new Error("الحقلان university و specialty مطلوبان");
    }

    // توحيد صيغة الرياضيات داخل كل تمرين قبل التحقق
    const problemsRaw = Array.isArray(raw.problems) ? raw.problems : [];
    const normalized = problemsRaw.map((p) => {
      const obj = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
      return {
        ...obj,
        statement: obj.statement == null ? obj.statement : normalizeMath(String(obj.statement)),
        solution: obj.solution == null ? obj.solution : normalizeMath(String(obj.solution)),
        remark: obj.remark == null ? obj.remark : normalizeMath(String(obj.remark)),
      };
    });
    const problems = parseProblems(JSON.stringify(normalized));
    if (problems.length === 0) {
      throw new Error("لا توجد تمارين صالحة — كل تمرين يحتاج حقل statement غير فارغ");
    }
    for (const p of problems) {
      const checks: Array<[string, string]> = [
        ["statement", p.statement],
        ["solution", p.solution ?? ""],
        ["remark", p.remark ?? ""],
      ];
      for (const [field, text] of checks) {
        const bad = badMathReason(text);
        if (bad) {
          throw new Error("التمرين رقم " + p.problemNumber + " (" + field + "): " + bad);
        }
      }
    }

    const university = await resolveUniversity(
      String(raw.university),
      raw.universityAr ? String(raw.universityAr) : undefined,
    );
    const specialty = await resolveSpecialty(
      String(raw.specialty),
      raw.specialtyAr ? String(raw.specialtyAr) : undefined,
    );

    const examNumber =
      raw.examNumber != null && Number.isFinite(Number(raw.examNumber))
        ? Number(raw.examNumber)
        : null;

    // منع التكرار الصريح — نفس منطق MCP add_exam
    const dup = await prisma.topic.findFirst({
      where: { universityId: university.id, year, examType, examNumber },
      select: { slug: true },
    });
    if (dup) {
      throw new Error(
        "موجود مسبقًا: " + SITE + "/topics/" + dup.slug +
          " — إن كان هذا امتحانًا آخر فعلًا ضع examNumber مختلفًا",
      );
    }

    const slug = await uniqueTopicSlug(
      university.name + "-" + year + "-" + examType + "-" + (examNumber ?? "01"),
    );
    const title = rawTitle || "مسابقة الدكتوراه " + year + " — " + university.nameAr;

    const parsedDuration = Number(raw.durationMinutes);
    const durationMinutes =
      Number.isFinite(parsedDuration) && parsedDuration > 0
        ? parsedDuration
        : durationFromExamType(examType);

    // الافتراضي هنا هو النشر المباشر (هذه فائدة الخاصية) — إلا إن طُلب draft
    const status = raw.status === "draft" ? "draft" : "published";
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
          "JSON import — " + university.name + " " + year +
          (raw.sourceNote ? " — " + String(raw.sourceNote).slice(0, 200) : ""),
        examNumber,
        coefficient:
          raw.coefficient != null && Number.isFinite(Number(raw.coefficient))
            ? Number(raw.coefficient)
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

    return {
      index,
      ok: true,
      title: topic.title,
      slug: topic.slug,
      url: SITE + "/topics/" + topic.slug,
      status,
      problems: problems.length,
    };
  } catch (e) {
    return {
      index,
      ok: false,
      title: rawTitle || undefined,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/** يستورد ملف JSON واحدًا: كائن اختبار واحد، أو مصفوفة، أو { "exams": [...] } */
export async function importExamsJsonAction(input: {
  fileName: string;
  text: string;
}): Promise<ImportFileOutcome> {
  await requireAdmin();

  let parsed: unknown;
  try {
    parsed = JSON.parse(input.text);
  } catch (e) {
    return {
      fileName: input.fileName,
      results: [{
        index: 0,
        ok: false,
        error: "ملف JSON غير صالح: " + (e instanceof Error ? e.message.slice(0, 160) : ""),
      }],
    };
  }

  let exams: unknown[];
  if (Array.isArray(parsed)) {
    exams = parsed;
  } else if (
    parsed && typeof parsed === "object" &&
    Array.isArray((parsed as { exams?: unknown[] }).exams)
  ) {
    exams = (parsed as { exams: unknown[] }).exams;
  } else {
    exams = [parsed];
  }

  if (exams.length > MAX_EXAMS_PER_FILE) {
    return {
      fileName: input.fileName,
      results: [{
        index: 0,
        ok: false,
        error: "الحد الأقصى " + MAX_EXAMS_PER_FILE + " اختبارًا في الملف الواحد — قسّم الملف",
      }],
    };
  }

  const results: ImportExamResult[] = [];
  for (let i = 0; i < exams.length; i++) {
    const raw = exams[i];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      results.push({ index: i, ok: false, error: "العنصر رقم " + (i + 1) + " ليس كائن JSON" });
      continue;
    }
    results.push(await importOneExam(raw as Record<string, unknown>, i));
  }

  return { fileName: input.fileName, results };
}
