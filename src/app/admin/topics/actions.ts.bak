"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { uploadFile, deleteFile } from "@/lib/storage";
import { durationMinutesForExamType } from "@/lib/exam-duration";

async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    throw new Error("فقط المديرون يملكون هذا الإجراء");
  }
}

// يحوّل نصًا حرًا إلى slug آمن (يُستخدم لإنشاء رابط الموضوع الجديد)
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

// يحوّل JSON القادم من محرّر التمارين (ProblemsEditor) إلى شكل Prisma المضمّن
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


async function resolveUniversityId(universityId: string, universityOther: string) {
  if (universityId) {
    const existing = await prisma.university.findUnique({ where: { id: universityId } });
    if (existing) return existing.id;
  }
  const nameAr = universityOther.trim();
  if (!nameAr) throw new Error("يرجى اختيار جامعة أو كتابة اسم جامعة جديدة");
  const slugBase = slugify(nameAr) || "university";
  let slug = slugBase;
  let n = 1;
  while (await prisma.university.findUnique({ where: { slug } })) {
    n += 1;
    slug = slugBase + "-" + n;
  }
  // name (latin unique key) — reuse Arabic if no latin form available
  let name = nameAr;
  let nameSuffix = 1;
  while (await prisma.university.findUnique({ where: { name } })) {
    nameSuffix += 1;
    name = nameAr + " " + nameSuffix;
  }
  const created = await prisma.university.create({
    data: { name, nameAr, slug },
  });
  return created.id;
}

async function resolveSpecialtyId(specialtyId: string, specialtyOther: string) {
  if (specialtyId) {
    const existing = await prisma.specialty.findUnique({ where: { id: specialtyId } });
    if (existing) return existing.id;
  }
  const nameAr = specialtyOther.trim();
  if (!nameAr) throw new Error("يرجى اختيار تخصص أو كتابة اسم تخصص جديد");
  const slugBase = slugify(nameAr) || "specialty";
  let slug = slugBase;
  let n = 1;
  while (await prisma.specialty.findUnique({ where: { slug } })) {
    n += 1;
    slug = slugBase + "-" + n;
  }
  let name = nameAr;
  let nameSuffix = 1;
  while (await prisma.specialty.findUnique({ where: { name } })) {
    nameSuffix += 1;
    name = nameAr + " " + nameSuffix;
  }
  const created = await prisma.specialty.create({
    data: { name, nameAr, slug },
  });
  return created.id;
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

// إنشاء موضوع جديد من لوحة الإدارة (زر "إضافة موضوع جديد")
export async function createTopicAction(formData: FormData) {
  await requireAdmin();
  // auto-meta-resolve
  const universityId = await resolveUniversityId(
    String(formData.get("universityId") ?? ""),
    String(formData.get("universityOther") ?? ""),
  );
  const specialtyId = await resolveSpecialtyId(
    String(formData.get("specialtyId") ?? ""),
    String(formData.get("specialtyOther") ?? ""),
  );
  const year = parseInt((formData.get("year") as string) || "", 10);
  const examType = formData.get("examType") as string;
  const status = (formData.get("status") as string) || "published";
  const source = (formData.get("source") as string) || "";
  const examNumber = formData.get("examNumber") as string;
  const coefficient = formData.get("coefficient") as string;
  const _durationIgnored = formData.get("durationMinutes") as string;
  const rawTitle = (formData.get("title") as string) || "";
  const problemsJson = (formData.get("problemsJson") as string) || "[]";

  if (!universityId || !specialtyId || !year || !examType) {
    throw new Error("يرجى تعبئة الجامعة والتخصص والسنة والنوع");
  }

  const university = await prisma.university.findUnique({ where: { id: universityId } });
  if (!university) throw new Error("جامعة غير موجودة");
  const baseSlug = slugify(
    `${university.name}-${year}-${examType}-${examNumber || "01"}`,
  );
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.topic.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const problems = parseProblems(problemsJson);
  const title =
    rawTitle.trim() || `مسابقة الدكتوراه ${year} — ${university.nameAr}`;

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
      durationMinutes: durationMinutesForExamType(examType),
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

// نسخ موضوع موجود (مفيد عند إضافة نسخة سنة جديدة من امتحان مشابه)
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

// حفظ بيانات الموضوع الوصفية وتمارينه معًا من نموذج التعديل الموحّد (الأسبوع 7)
export async function updateTopicFullAction(formData: FormData) {
  await requireAdmin();
  // auto-meta-resolve-update
  const id = formData.get("id") as string;
  const title = (formData.get("title") as string) || undefined;
  const universityId = await resolveUniversityId(
    String(formData.get("universityId") ?? ""),
    String(formData.get("universityOther") ?? ""),
  );
  const specialtyId = await resolveSpecialtyId(
    String(formData.get("specialtyId") ?? ""),
    String(formData.get("specialtyOther") ?? ""),
  );
  const year = formData.get("year") as string;
  const examType = formData.get("examType") as string;
  const status = formData.get("status") as string;
  const source = (formData.get("source") as string) || "";
  const examNumber = formData.get("examNumber") as string;
  const coefficient = formData.get("coefficient") as string;
  const _durationIgnored = formData.get("durationMinutes") as string;
  const problemsJson = (formData.get("problemsJson") as string) || "[]";
  const problems = parseProblems(problemsJson);

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
      durationMinutes: durationMinutesForExamType(examType),
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
