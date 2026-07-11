"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { uploadFile, deleteFile } from "@/lib/storage";

async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    throw new Error("فقط المديرون يملكون هذا الإجراء");
  }
}

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type RawProblem = {
  problemNumber?: number | string;
  title?: string;
  difficulty?: string;
  tags?: string;
  statement?: string;
  solution?: string;
  remark?: string;
};

function parseProblems(problemsJson: string) {
  let raw: RawProblem[] = [];
  try {
    const parsed = JSON.parse(problemsJson);
    if (Array.isArray(parsed)) raw = parsed;
  } catch {
    raw = [];
  }
  return raw.map((p, i) => {
    const solution = (p.solution ?? "").trim();
    const remark = (p.remark ?? "").trim();
    return {
      problemNumber: Number(p.problemNumber) || i + 1,
      title: (p.title ?? `تمرين ${i + 1}`).trim() || `تمرين ${i + 1}`,
      difficulty: (["easy", "medium", "hard"].includes(p.difficulty ?? "")
        ? p.difficulty
        : "medium") as "easy" | "medium" | "hard",
      tags: (p.tags ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      statement: (p.statement ?? "").trim(),
      solution: solution || null,
      remark: remark || null,
      hasSolution: Boolean(solution),
    };
  });
}

function durationFromExamType(examType: string): number {
  return examType === "specialty" ? 180 : 90;
}

export async function deleteTopicAction(id: string) {
  await requireAdmin();
  const topic = await prisma.topic.findUnique({ where: { id } });
  if (topic) {
    await Promise.all(topic.files.map((f) => deleteFile(f.url)));
  }
  await prisma.topic.delete({ where: { id } });
  revalidatePath("/admin/topics");
  revalidatePath("/universities");
  revalidatePath("/");
}

export async function createTopicAction(formData: FormData) {
  await requireAdmin();
  const universityId = formData.get("universityId") as string;
  const specialtyId = formData.get("specialtyId") as string;
  const year = parseInt((formData.get("year") as string) || "", 10);
  const examType = formData.get("examType") as string;
  const status = (formData.get("status") as string) || "published";
  const source = (formData.get("source") as string) || "";
  const examNumber = formData.get("examNumber") as string;
  const coefficient = formData.get("coefficient") as string;
  const durationRaw = formData.get("durationMinutes") as string;
  const rawTitle = (formData.get("title") as string) || "";
  const problemsJson = (formData.get("problemsJson") as string) || "[]";

  if (!universityId || !specialtyId || !year || !examType) {
    throw new Error("يرجى تعبئة الجامعة والتخصص والسنة والنوع");
  }

  const university = await prisma.university.findUnique({
    where: { id: universityId },
  });
  if (!university) throw new Error("جامعة غير موجودة");

  const specialty = await prisma.specialty.findUnique({
    where: { id: specialtyId },
  });
  if (!specialty) throw new Error("تخصص غير موجود");

  const baseSlug = slugify(
    `${university.name}-${year}-${examType}-${examNumber || "01"}`,
  );
  let slug = baseSlug || "topic";
  let suffix = 1;
  while (await prisma.topic.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const problems = parseProblems(problemsJson);
  const title =
    rawTitle.trim() || `مسابقة الدكتوراه ${year} — ${university.nameAr}`;

  const parsedDuration = durationRaw ? parseInt(durationRaw, 10) : NaN;
  const durationMinutes = Number.isFinite(parsedDuration)
    ? parsedDuration
    : durationFromExamType(examType);

  const topic = await prisma.topic.create({
    data: {
      slug,
      title,
      examType: examType as "general" | "specialty",
      year,
      universityId,
      specialtyId,
      source,
      examNumber: examNumber ? parseInt(examNumber, 10) : null,
      coefficient: coefficient ? parseInt(coefficient, 10) : null,
      durationMinutes,
      problems,
      files: [],
      status: status as "published" | "draft" | "needs_completion",
    },
  });

  revalidatePath("/admin/topics");
  revalidatePath("/");
  revalidatePath("/search");
  return { redirectTo: `/admin/topics/${topic.id}` };
}

export async function duplicateTopicAction(id: string) {
  await requireAdmin();
  const topic = await prisma.topic.findUnique({ where: { id } });
  if (!topic) return;

  let slug = `${topic.slug}-copy`;
  let suffix = 1;
  while (await prisma.topic.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${topic.slug}-copy-${suffix}`;
  }

  const created = await prisma.topic.create({
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
      files: [],
      status: "draft",
    },
  });

  revalidatePath("/admin/topics");
  redirect(`/admin/topics/${created.id}`);
}

export async function updateTopicFullAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const title = (formData.get("title") as string) || undefined;
  const universityId = formData.get("universityId") as string;
  const specialtyId = formData.get("specialtyId") as string;
  const year = formData.get("year") as string;
  const examType = formData.get("examType") as string;
  const status = formData.get("status") as string;
  const source = (formData.get("source") as string) || "";
  const examNumber = formData.get("examNumber") as string;
  const coefficient = formData.get("coefficient") as string;
  const durationRaw = formData.get("durationMinutes") as string;
  const problemsJson = (formData.get("problemsJson") as string) || "[]";
  const problems = parseProblems(problemsJson);

  const parsedDuration = durationRaw ? parseInt(durationRaw, 10) : NaN;
  const durationMinutes = Number.isFinite(parsedDuration)
    ? parsedDuration
    : durationFromExamType(examType || "general");

  const topic = await prisma.topic.update({
    where: { id },
    data: {
      title,
      universityId: universityId || undefined,
      specialtyId: specialtyId || undefined,
      year: year ? parseInt(year, 10) : undefined,
      examType: (examType || undefined) as "general" | "specialty" | undefined,
      status: status as "published" | "draft" | "needs_completion",
      source,
      examNumber: examNumber ? parseInt(examNumber, 10) : null,
      coefficient: coefficient ? parseInt(coefficient, 10) : null,
      durationMinutes,
      problems: { set: problems },
    },
  });

  revalidatePath(`/admin/topics/${id}`);
  revalidatePath("/admin/topics");
  revalidatePath("/");
  revalidatePath(`/topics/${topic.slug}`);
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
