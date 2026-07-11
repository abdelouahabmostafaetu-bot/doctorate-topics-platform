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
    throw new Error("ÙÙ‚Ø· Ø§Ù„Ù…Ø¯ÙŠØ±ÙˆÙ† ÙŠÙ…Ù„ÙƒÙˆÙ† Ù‡Ø°Ø§ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡");
  }
}

// ÙŠØ­ÙˆÙ‘Ù„ Ù†ØµÙ‹Ø§ Ø­Ø±Ù‹Ø§ Ø¥Ù„Ù‰ slug Ø¢Ù…Ù† (ÙŠÙØ³ØªØ®Ø¯Ù… Ù„Ø¥Ù†Ø´Ø§Ø¡ Ø±Ø§Ø¨Ø· Ø§Ù„Ù…ÙˆØ¶ÙˆØ¹ Ø§Ù„Ø¬Ø¯ÙŠØ¯)
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

// ÙŠØ­ÙˆÙ‘Ù„ JSON Ø§Ù„Ù‚Ø§Ø¯Ù… Ù…Ù† Ù…Ø­Ø±Ù‘Ø± Ø§Ù„ØªÙ…Ø§Ø±ÙŠÙ† (ProblemsEditor) Ø¥Ù„Ù‰ Ø´ÙƒÙ„ Prisma Ø§Ù„Ù…Ø¶Ù…Ù‘Ù†
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
      title: (p.title ?? `ØªÙ…Ø±ÙŠÙ† ${i + 1}`).trim() || `ØªÙ…Ø±ÙŠÙ† ${i + 1}`,
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

// Ø¥Ù†Ø´Ø§Ø¡ Ù…ÙˆØ¶ÙˆØ¹ Ø¬Ø¯ÙŠØ¯ Ù…Ù† Ù„ÙˆØ­Ø© Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© (Ø²Ø± "Ø¥Ø¶Ø§ÙØ© Ù…ÙˆØ¶ÙˆØ¹ Ø¬Ø¯ÙŠØ¯")
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
  const durationMinutes = formData.get("durationMinutes") as string;
  const rawTitle = (formData.get("title") as string) || "";
  const problemsJson = (formData.get("problemsJson") as string) || "[]";

  if (!universityId || !specialtyId || !year || !examType) {
    throw new Error("ÙŠØ±Ø¬Ù‰ ØªØ¹Ø¨Ø¦Ø© Ø§Ù„Ø¬Ø§Ù…Ø¹Ø© ÙˆØ§Ù„ØªØ®ØµØµ ÙˆØ§Ù„Ø³Ù†Ø© ÙˆØ§Ù„Ù†ÙˆØ¹");
  }

  const university = await prisma.university.findUnique({ where: { id: universityId } });
  if (!university) throw new Error("Ø¬Ø§Ù…Ø¹Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©");
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
    rawTitle.trim() || `Ù…Ø³Ø§Ø¨Ù‚Ø© Ø§Ù„Ø¯ÙƒØªÙˆØ±Ø§Ù‡ ${year} â€” ${university.nameAr}`;

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
      durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : null,
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

// Ù†Ø³Ø® Ù…ÙˆØ¶ÙˆØ¹ Ù…ÙˆØ¬ÙˆØ¯ (Ù…ÙÙŠØ¯ Ø¹Ù†Ø¯ Ø¥Ø¶Ø§ÙØ© Ù†Ø³Ø®Ø© Ø³Ù†Ø© Ø¬Ø¯ÙŠØ¯Ø© Ù…Ù† Ø§Ù…ØªØ­Ø§Ù† Ù…Ø´Ø§Ø¨Ù‡)
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
      title: `${topic.title} (Ù†Ø³Ø®Ø©)`,
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

// Ø­ÙØ¸ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…ÙˆØ¶ÙˆØ¹ Ø§Ù„ÙˆØµÙÙŠØ© ÙˆØªÙ…Ø§Ø±ÙŠÙ†Ù‡ Ù…Ø¹Ù‹Ø§ Ù…Ù† Ù†Ù…ÙˆØ°Ø¬ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù…ÙˆØ­Ù‘Ø¯ (Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ 7)
export async function updateTopicFullAction(formData: FormData) {
  await requireAdmin();
  // auto-meta-resolve-update
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
  const durationMinutes = formData.get("durationMinutes") as string;
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
      durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : null,
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


