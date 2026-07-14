"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { durationFromExamType } from "@/lib/exam-duration";
import {
  allocateManualLegacyId,
  ensureSpecialty,
  ensureUniversity,
  parseProblems,
  uniqueTopicSlug,
} from "@/lib/topic-helpers";

const MAX_FILES = 100;

// نقاط النشر التلقائي لمواضيع LaTeX
const AUTO_PUBLISH_POINTS = 100;

/** Read-then-set points (MongoDB increment can silently fail on some accounts). */
async function awardPoints(userId: string, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { points: true },
  });
  if (!user) return;
  const current = typeof user.points === "number" ? user.points : 0;
  await prisma.user.update({
    where: { id: userId },
    data: { points: current + amount },
  });
}

type UploadedFile = { url: string; fileName: string; sizeBytes: number };

export async function submitContributionAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/contribute");
  }
  const userId = session.user.id;

  const type = String(formData.get("type") ?? "latex");
  if (type !== "latex" && type !== "file") {
    throw new Error("نوع المساهمة غير صالح");
  }

  const universityId = String(formData.get("universityId") ?? "") || null;
  const universityName = String(formData.get("universityName") ?? "").trim();
  const specialtyId = String(formData.get("specialtyId") ?? "") || null;
  const specialtyName = String(formData.get("specialtyName") ?? "").trim();
  const year = parseInt(String(formData.get("year") ?? ""), 10);
  const examTypeRaw = String(formData.get("examType") ?? "general");
  const examType =
    examTypeRaw === "specialty" ? ("specialty" as const) : ("general" as const);
  const problemsJson = String(formData.get("problemsJson") ?? "[]");

  // معلومات المسابقة مطلوبة فقط لمساهمات LaTeX —
  // مساهمات الملفات تُرفع بدون تصنيف، ويصنّفها المشرف عند المراجعة.
  if (type === "latex") {
    if (!year || Number.isNaN(year)) {
      throw new Error("يرجى إدخال سنة صحيحة");
    }
    if (!universityId && !universityName) {
      throw new Error("يرجى اختيار الجامعة");
    }
    if (!specialtyId && !specialtyName) {
      throw new Error("يرجى اختيار التخصص");
    }
  }

  const validYear = year && !Number.isNaN(year) ? year : null;

  // العنوان يُولّد تلقائيًا — لا يدخله المستخدم
  const title =
    type === "file"
      ? `مساهمة ملفات — ${new Date().toLocaleDateString("ar-DZ", { year: "numeric", month: "long", day: "numeric" })}`
      : `مسابقة الدكتوراه ${validYear ?? ""}${universityName ? ` — ${universityName}` : ""}`.trim();

  if (type === "latex") {
    const problems = parseProblems(problemsJson);
    if (problems.length === 0) {
      throw new Error("أضف تمرينًا واحدًا على الأقل بنص LaTeX");
    }

    // نشر تلقائي فوري: يُنشأ الموضوع مباشرة بدون انتظار مراجعة المدير،
    // ويُمنح المساهم 100 نقطة فورًا. تبقى المساهمة "قيد المراجعة" في
    // لوحة المدير ليصادق على النشر أو يلغيه (حذف الموضوع واسترجاع النقاط).
    const university = await ensureUniversity({
      id: universityId,
      name: universityName || null,
      nameAr: universityName || null,
    });
    const specialty = await ensureSpecialty({
      id: specialtyId,
      name: specialtyName || null,
      nameAr: specialtyName || null,
    });

    const slug = await uniqueTopicSlug(
      `${university.name}-${year}-${examType}-01`,
    );
    const legacyId = await allocateManualLegacyId();

    const topic = await prisma.topic.create({
      data: {
        slug,
        title,
        examType,
        year,
        universityId: university.id,
        specialtyId: specialty.id,
        source: `مساهمة مستخدم — ${university.name} ${year}`,
        durationMinutes: durationFromExamType(examType),
        problems,
        legacyId,
        files: [],
        status: "published",
        createdById: userId,
      },
    });

    await awardPoints(userId, AUTO_PUBLISH_POINTS);

    await prisma.contribution.create({
      data: {
        userId,
        type: "latex",
        status: "pending",
        universityId: university.id,
        universityName: university.name,
        specialtyId: specialty.id,
        specialtyName: specialty.name,
        year: validYear,
        examType,
        durationMinutes: durationFromExamType(examType),
        title,
        problemsJson: JSON.stringify(problems),
        pointsAwarded: AUTO_PUBLISH_POINTS,
        createdTopicId: topic.id,
      },
    });

    revalidatePath("/");
    revalidatePath("/search");
    revalidatePath("/contributors");
    revalidatePath(`/topics/${topic.slug}`);
  } else {
    // الملفات تُرفع من المتصفح مباشرة:
    // - الصغيرة عبر /api/contributions/upload (داخل حد Vercel)
    // - الكبيرة عبر presigned URL مباشرة إلى التخزين (حتى 50 م.ب)
    // ثم تصلنا روابطها هنا
    let files: UploadedFile[] = [];
    try {
      const parsed = JSON.parse(String(formData.get("filesJson") ?? "[]"));
      if (Array.isArray(parsed)) {
        files = parsed
          .filter(
            (f): f is UploadedFile =>
              f && typeof f.url === "string" && f.url.length > 0,
          )
          .slice(0, MAX_FILES);
      }
    } catch {
      files = [];
    }
    if (files.length === 0) {
      throw new Error("يرجى رفع ملف واحد على الأقل");
    }

    const totalBytes = files.reduce(
      (sum, f) => sum + (Number(f.sizeBytes) || 0),
      0,
    );

    await prisma.contribution.create({
      data: {
        userId,
        type: "file",
        status: "pending",
        universityId: universityId || null,
        universityName: universityName || null,
        specialtyId: specialtyId || null,
        specialtyName: specialtyName || null,
        year: validYear,
        examType,
        durationMinutes: durationFromExamType(examType),
        title,
        fileUrl: files[0].url,
        fileName:
          files.length === 1
            ? files[0].fileName
            : `${files[0].fileName} (+${files.length - 1})`,
        fileSizeBytes: totalBytes,
        filesJson: JSON.stringify(files),
      },
    });
  }

  revalidatePath("/contribute");
  revalidatePath("/admin/contributions");
  redirect("/contribute?submitted=1");
}
