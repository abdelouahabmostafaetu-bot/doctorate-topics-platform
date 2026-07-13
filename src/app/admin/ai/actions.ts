"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { testProvider } from "@/lib/ai/llm";
import { AI_TASKS } from "@/lib/ai/tasks";
import { durationFromExamType } from "@/lib/exam-duration";
import {
  allocateManualLegacyId,
  ensureSpecialty,
  ensureUniversity,
  parseProblems,
  uniqueTopicSlug,
} from "@/lib/topic-helpers";

async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    throw new Error("فقط المديرون يملكون هذا الإجراء");
  }
  return session!.user!;
}

function revalidateAi() {
  revalidatePath("/admin/ai");
  revalidatePath("/admin/ai/status");
}

function failAi(msg: string): never {
  redirect("/admin/ai?error=" + encodeURIComponent(msg.slice(0, 180)));
}

/** إضافة مفتاح جديد مع فحص مباشر قبل الحفظ */
export async function addAiKeyAction(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const baseUrl = String(formData.get("baseUrl") ?? "").trim().replace(/\/+$/, "");
  const model = String(formData.get("model") ?? "").trim();
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const task = String(formData.get("task") ?? "general").trim();

  if (!name || !baseUrl || !model || !apiKey) failAi("يرجى تعبئة كل الحقول");
  if (!/^https:\/\//.test(baseUrl)) failAi("رابط الخدمة يجب أن يبدأ بـ https://");
  if (!AI_TASKS.some((t) => t.id === task)) failAi("مهمة غير معروفة");

  // فحص مباشر قبل الحفظ — نحفظ المفتاح في الحالتين مع تسجيل النتيجة
  const test = await testProvider({ baseUrl, model, apiKey });

  await prisma.aiKey.create({
    data: {
      name,
      baseUrl,
      model,
      apiKey,
      task,
      active: true,
      lastStatus: test.ok ? "ok" : "fail",
      lastError: test.ok ? null : (test.error ?? "فشل الفحص"),
      lastCheckedAt: new Date(),
    },
  });
  revalidateAi();
  redirect(test.ok ? "/admin/ai?added=ok" : "/admin/ai?added=fail");
}

export async function deleteAiKeyAction(id: string) {
  await requireAdmin();
  await prisma.aiKey.delete({ where: { id } });
  revalidateAi();
}

export async function toggleAiKeyAction(id: string) {
  await requireAdmin();
  const row = await prisma.aiKey.findUnique({ where: { id } });
  if (!row) return;
  await prisma.aiKey.update({ where: { id }, data: { active: !row.active } });
  revalidateAi();
}

export async function testAiKeyAction(id: string) {
  await requireAdmin();
  const row = await prisma.aiKey.findUnique({ where: { id } });
  if (!row) return;
  const test = await testProvider(row);
  await prisma.aiKey.update({
    where: { id },
    data: {
      lastStatus: test.ok ? "ok" : "fail",
      lastError: test.ok ? null : (test.error ?? "فشل الفحص"),
      lastCheckedAt: new Date(),
    },
  });
  revalidateAi();
}

/** فحص كل المفاتيح بالتتالي (مع مباعدة بين الفحوصات) */
export async function testAllAiKeysAction() {
  await requireAdmin();
  const rows = await prisma.aiKey.findMany();
  for (const row of rows) {
    const test = await testProvider(row);
    await prisma.aiKey.update({
      where: { id: row.id },
      data: {
        lastStatus: test.ok ? "ok" : "fail",
        lastError: test.ok ? null : (test.error ?? "فشل الفحص"),
        lastCheckedAt: new Date(),
      },
    });
    await new Promise((r) => setTimeout(r, 1100));
  }
  revalidateAi();
}

function failImport(msg: string): never {
  redirect("/admin/ai/import?error=" + encodeURIComponent(msg.slice(0, 180)));
}

/** إنشاء موضوع من المعاينة بعد الاستخراج بالذكاء الاصطناعي */
export async function createAiTopicAction(formData: FormData) {
  await requireAdmin();

  const universityIdRaw = String(formData.get("universityId") ?? "");
  const newUniversityName = String(formData.get("newUniversityName") ?? "").trim();
  const specialtyIdRaw = String(formData.get("specialtyId") ?? "");
  const newSpecialtyName = String(formData.get("newSpecialtyName") ?? "").trim();
  const year = parseInt(String(formData.get("year") ?? ""), 10);
  const examType = String(formData.get("examType") ?? "");
  const status = String(formData.get("status") ?? "published");
  const examNumber = String(formData.get("examNumber") ?? "").trim();
  const coefficient = String(formData.get("coefficient") ?? "").trim();
  const durationRaw = String(formData.get("durationMinutes") ?? "").trim();
  const rawTitle = String(formData.get("title") ?? "").trim();
  const problemsJson = String(formData.get("problemsJson") ?? "[]");

  if (!year || !Number.isFinite(year)) failImport("يرجى إدخال سنة صحيحة");
  if (examType !== "general" && examType !== "specialty") failImport("نوع المسابقة غير صالح");

  const problems = parseProblems(problemsJson);
  if (problems.length === 0) failImport("لا يوجد أي تمرين — تأكد من نصوص التمارين قبل الإضافة");

  let slugOut = "";
  try {
    const university = await ensureUniversity({
      id: universityIdRaw,
      name: newUniversityName || undefined,
      nameAr: newUniversityName || undefined,
    });
    const specialty = await ensureSpecialty({
      id: specialtyIdRaw,
      name: newSpecialtyName || undefined,
      nameAr: newSpecialtyName || undefined,
    });

    const examNumParsed = examNumber ? parseInt(examNumber, 10) : null;
    const slug = await uniqueTopicSlug(
      university.name + "-" + year + "-" + examType + "-" + (examNumParsed ?? "01"),
    );
    const title =
      rawTitle || "مسابقة الدكتوراه " + year + " — " + university.nameAr;

    const parsedDuration = durationRaw ? parseInt(durationRaw, 10) : NaN;
    const durationMinutes = Number.isFinite(parsedDuration)
      ? parsedDuration
      : durationFromExamType(examType);

    const legacyId = await allocateManualLegacyId();

    const topic = await prisma.topic.create({
      data: {
        slug,
        title,
        examType,
        year,
        universityId: university.id,
        specialtyId: specialty.id,
        source: "استيراد بالذكاء الاصطناعي — " + university.name + " " + year,
        examNumber: examNumParsed,
        coefficient: coefficient ? parseInt(coefficient, 10) : null,
        durationMinutes,
        problems,
        legacyId,
        files: [],
        status: status as "published" | "draft" | "needs_completion",
      },
    });

    revalidatePath("/admin/topics");
    revalidatePath("/");
    revalidatePath("/search");
    revalidatePath("/topics/" + topic.slug);
    slugOut = topic.slug;
  } catch (e) {
    failImport(e instanceof Error ? e.message : String(e));
  }
  redirect("/topics/" + slugOut);
}
