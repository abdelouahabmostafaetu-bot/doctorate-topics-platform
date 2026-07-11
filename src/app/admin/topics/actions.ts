"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { uploadFile, deleteFile } from "@/lib/storage";
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

function revalidateTopicPaths(slug?: string) {
  revalidatePath("/admin/topics");
  revalidatePath("/");
  revalidatePath("/search");
  if (slug) revalidatePath(`/topics/${slug}`);
}

export async function deleteTopicAction(id: string) {
  await requireAdmin();
  const topic = await prisma.topic.findUnique({ where: { id } });
  if (topic) {
    await Promise.all(topic.files.map((f) => deleteFile(f.url)));
  }
  await prisma.topic.delete({ where: { id } });
  revalidateTopicPaths(topic?.slug);
}

/**
 * إنشاء موضوع جديد من لوحة الإدارة.
 * - legacyId سالب فريد (لا يتصادم مع examId المستورد الموجب)
 * - source مطلوب في المخطط — نملأه دائمًا
 */
export async function createTopicAction(formData: FormData) {
  await requireAdmin();

  const universityIdRaw = String(formData.get("universityId") ?? "");
  const specialtyIdRaw = String(formData.get("specialtyId") ?? "");
  const newUniversityName = String(formData.get("newUniversityName") ?? "");
  const newUniversityNameAr = String(formData.get("newUniversityNameAr") ?? "");
  const newSpecialtyName = String(formData.get("newSpecialtyName") ?? "");
  const newSpecialtyNameAr = String(formData.get("newSpecialtyNameAr") ?? "");
  const year = parseInt(String(formData.get("year") ?? ""), 10);
  const examType = String(formData.get("examType") ?? "");
  const status = String(formData.get("status") ?? "published");
  const source = String(formData.get("source") ?? "");
  const examNumber = String(formData.get("examNumber") ?? "");
  const coefficient = String(formData.get("coefficient") ?? "");
  const durationRaw = String(formData.get("durationMinutes") ?? "");
  const rawTitle = String(formData.get("title") ?? "");
  const problemsJson = String(formData.get("problemsJson") ?? "[]");

  if (!year || !examType) {
    throw new Error("يرجى تعبئة السنة ونوع المسابقة");
  }
  if (examType !== "general" && examType !== "specialty") {
    throw new Error("نوع المسابقة غير صالح");
  }

  const university = await ensureUniversity({
    id: universityIdRaw,
    name: newUniversityName || undefined,
    nameAr: newUniversityNameAr || newUniversityName || undefined,
  });
  const specialty = await ensureSpecialty({
    id: specialtyIdRaw,
    name: newSpecialtyName || undefined,
    nameAr: newSpecialtyNameAr || newSpecialtyName || undefined,
  });

  const examNumParsed = examNumber ? parseInt(examNumber, 10) : null;
  const slug = await uniqueTopicSlug(
    `${university.name}-${year}-${examType}-${examNumParsed ?? "01"}`,
  );

  const problems = parseProblems(problemsJson);
  const title =
    rawTitle.trim() ||
    `مسابقة الدكتوراه ${year} — ${university.nameAr}`;

  const parsedDuration = durationRaw ? parseInt(durationRaw, 10) : NaN;
  const durationMinutes = Number.isFinite(parsedDuration)
    ? parsedDuration
    : durationFromExamType(examType);

  // CRITICAL FIX: always set a unique numeric legacyId (negative = manual)
  // Never leave it null — MongoDB unique index allows only one null.
  // Never use random positive — collides with imported examIds.
  const legacyId = await allocateManualLegacyId();

  const topic = await prisma.topic.create({
    data: {
      slug,
      title,
      examType,
      year,
      universityId: university.id,
      specialtyId: specialty.id,
      source: source.trim() || `إضافة يدوية — ${university.name} ${year}`,
      examNumber: examNumParsed,
      coefficient: coefficient ? parseInt(coefficient, 10) : null,
      durationMinutes,
      problems,
      legacyId,
      files: [],
      status: status as "published" | "draft" | "needs_completion",
    },
  });

  revalidateTopicPaths(topic.slug);
  redirect(`/admin/topics/${topic.id}`);
}

export async function duplicateTopicAction(id: string) {
  await requireAdmin();
  const topic = await prisma.topic.findUnique({ where: { id } });
  if (!topic) return;

  const slug = await uniqueTopicSlug(`${topic.slug}-copy`);
  const legacyId = await allocateManualLegacyId();

  const copy = await prisma.topic.create({
    data: {
      slug,
      title: `${topic.title} (نسخة)`,
      examType: topic.examType,
      year: topic.year,
      universityId: topic.universityId,
      specialtyId: topic.specialtyId,
      source: topic.source,
      examNumber: topic.examNumber,
      coefficient: topic.coefficient,
      durationMinutes: topic.durationMinutes,
      problems: topic.problems,
      legacyId,
      files: [],
      status: "draft",
    },
  });

  revalidateTopicPaths();
  redirect(`/admin/topics/${copy.id}`);
}

export async function updateTopicDetailsAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const title = (formData.get("title") as string) || undefined;
  const status = formData.get("status") as string;
  const examNumber = formData.get("examNumber") as string;
  const coefficient = formData.get("coefficient") as string;
  const durationMinutes = formData.get("durationMinutes") as string;
  const problemsJson = formData.get("problemsJson") as string | null;
  const source = formData.get("source") as string | null;

  const data: Record<string, unknown> = {
    title,
    status: status as "published" | "draft" | "needs_completion",
    examNumber: examNumber ? parseInt(examNumber, 10) : null,
    coefficient: coefficient ? parseInt(coefficient, 10) : null,
    durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : null,
  };
  if (problemsJson != null) {
    data.problems = parseProblems(problemsJson);
  }
  if (source != null) {
    data.source = source;
  }

  const topic = await prisma.topic.update({ where: { id }, data });
  revalidatePath(`/admin/topics/${id}`);
  revalidateTopicPaths(topic.slug);
}

export async function updateTopicFullAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("معرّف الموضوع مفقود");

  const universityIdRaw = String(formData.get("universityId") ?? "");
  const specialtyIdRaw = String(formData.get("specialtyId") ?? "");
  const newUniversityName = String(formData.get("newUniversityName") ?? "");
  const newUniversityNameAr = String(formData.get("newUniversityNameAr") ?? "");
  const newSpecialtyName = String(formData.get("newSpecialtyName") ?? "");
  const newSpecialtyNameAr = String(formData.get("newSpecialtyNameAr") ?? "");
  const year = parseInt(String(formData.get("year") ?? ""), 10);
  const examType = String(formData.get("examType") ?? "");
  const status = String(formData.get("status") ?? "published");
  const source = String(formData.get("source") ?? "");
  const examNumber = String(formData.get("examNumber") ?? "");
  const coefficient = String(formData.get("coefficient") ?? "");
  const durationRaw = String(formData.get("durationMinutes") ?? "");
  const rawTitle = String(formData.get("title") ?? "");
  const problemsJson = String(formData.get("problemsJson") ?? "[]");

  if (!year || (examType !== "general" && examType !== "specialty")) {
    throw new Error("يرجى تعبئة السنة ونوع المسابقة");
  }

  const university = await ensureUniversity({
    id: universityIdRaw,
    name: newUniversityName || undefined,
    nameAr: newUniversityNameAr || newUniversityName || undefined,
  });
  const specialty = await ensureSpecialty({
    id: specialtyIdRaw,
    name: newSpecialtyName || undefined,
    nameAr: newSpecialtyNameAr || newSpecialtyName || undefined,
  });

  const parsedDuration = durationRaw ? parseInt(durationRaw, 10) : NaN;
  const durationMinutes = Number.isFinite(parsedDuration)
    ? parsedDuration
    : durationFromExamType(examType);

  const topic = await prisma.topic.update({
    where: { id },
    data: {
      title:
        rawTitle.trim() ||
        `مسابقة الدكتوراه ${year} — ${university.nameAr}`,
      examType: examType as "general" | "specialty",
      year,
      universityId: university.id,
      specialtyId: specialty.id,
      source: source.trim() || `تحديث يدوي — ${university.name} ${year}`,
      examNumber: examNumber ? parseInt(examNumber, 10) : null,
      coefficient: coefficient ? parseInt(coefficient, 10) : null,
      durationMinutes,
      problems: parseProblems(problemsJson),
      status: status as "published" | "draft" | "needs_completion",
    },
  });

  revalidatePath(`/admin/topics/${id}`);
  revalidateTopicPaths(topic.slug);
  redirect("/admin/topics");
}

export async function uploadTopicFileAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const kind = formData.get("kind") as "exam_pdf" | "solution_pdf";
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return;

  const topic = await prisma.topic.findUnique({ where: { id } });
  if (!topic) return;

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `topics/${id}/${kind}-${Date.now()}-${file.name}`;
  const url = await uploadFile(buffer, key, file.type || "application/pdf");

  const old = topic.files.find((f) => f.kind === kind);
  const files = topic.files.filter((f) => f.kind !== kind);
  files.push({
    kind,
    url,
    fileName: file.name,
    sizeBytes: file.size,
    uploadedAt: new Date(),
  });

  await prisma.topic.update({ where: { id }, data: { files: { set: files } } });
  if (old) await deleteFile(old.url);

  revalidatePath(`/admin/topics/${id}`);
  revalidatePath(`/topics/${topic.slug}`);
}

export async function deleteTopicFileAction(
  id: string,
  kind: "exam_pdf" | "solution_pdf",
) {
  await requireAdmin();
  const topic = await prisma.topic.findUnique({ where: { id } });
  if (!topic) return;

  const removed = topic.files.find((f) => f.kind === kind);
  const files = topic.files.filter((f) => f.kind !== kind);
  await prisma.topic.update({ where: { id }, data: { files: { set: files } } });
  if (removed) await deleteFile(removed.url);

  revalidatePath(`/admin/topics/${id}`);
  revalidatePath(`/topics/${topic.slug}`);
}
