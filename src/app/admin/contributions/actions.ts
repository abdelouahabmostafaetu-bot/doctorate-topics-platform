"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
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
  // Capture id after guard — avoids "session is possibly null" TypeScript error
  const handledById = session?.user?.id ?? null;
  return { handledById };
}

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

function revalidateAll() {
  revalidatePath("/admin/contributions");
  revalidatePath("/admin/topics");
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/contributors");
  revalidatePath("/contribute");
}

/**
 * قرارات المراجعة:
 * - publishLatex: ينشر المساهمة كموضوع حقيقي + نقاط (افتراضي 10)
 * - acceptFile: يقبل ملف PDF + نقاط يختارها المدير
 * - reject / duplicate: يزيل من الوارد بدون إنشاء موضوع
 */
export async function reviewContributionAction(formData: FormData) {
  const { handledById } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const adminNote = String(formData.get("adminNote") ?? "").trim();
  const customPointsRaw = String(formData.get("points") ?? "");

  if (!id) return { ok: false as const, error: "معرّف المساهمة مفقود" };
  if (
    decision !== "publishLatex" &&
    decision !== "acceptFile" &&
    decision !== "reject" &&
    decision !== "duplicate"
  ) {
    return { ok: false as const, error: "قرار غير صالح" };
  }

  const contribution = await prisma.contribution.findUnique({ where: { id } });
  if (!contribution) return { ok: false as const, error: "المساهمة غير موجودة" };
  if (contribution.status !== "pending") {
    return { ok: false as const, error: "تمت مراجعة هذه المساهمة مسبقًا" };
  }

  try {
    if (decision === "reject" || decision === "duplicate") {
      // مساهمة منشورة تلقائيًا: نلغي نشر الموضوع ونسترجع النقاط الممنوحة
      if (contribution.createdTopicId) {
        try {
          await prisma.topic.delete({
            where: { id: contribution.createdTopicId },
          });
        } catch (err) {
          console.error("auto-published topic already removed:", err);
        }
        const refund = contribution.pointsAwarded ?? 0;
        if (refund > 0) {
          const user = await prisma.user.findUnique({
            where: { id: contribution.userId },
            select: { points: true },
          });
          if (user) {
            const current = typeof user.points === "number" ? user.points : 0;
            await prisma.user.update({
              where: { id: contribution.userId },
              data: { points: Math.max(0, current - refund) },
            });
          }
        }
      }
      await prisma.contribution.update({
        where: { id },
        data: {
          status: decision === "reject" ? "rejected" : "duplicate",
          handledById,
          adminNote: adminNote || null,
          pointsAwarded: 0,
        },
      });
      revalidateAll();
      return { ok: true as const };
    }

    if (decision === "acceptFile") {
      const points = Math.max(0, parseInt(customPointsRaw || "10", 10) || 10);
      await awardPoints(contribution.userId, points);
      await prisma.contribution.update({
        where: { id },
        data: {
          status: "accepted",
          handledById,
          adminNote: adminNote || null,
          pointsAwarded: points,
        },
      });
      revalidateAll();
      return { ok: true as const };
    }

    // مساهمة منشورة تلقائيًا: المدير يصادق فقط — الموضوع موجود والنقاط مُنحت
    if (contribution.createdTopicId) {
      await prisma.contribution.update({
        where: { id },
        data: {
          status: "accepted",
          handledById,
          adminNote: adminNote || null,
        },
      });
      revalidateAll();
      return { ok: true as const, topicId: contribution.createdTopicId };
    }

    // publishLatex → create real Topic in database
    const year = contribution.year;
    const examType = contribution.examType;
    if (!year || !examType) {
      return {
        ok: false as const,
        error: "المساهمة ناقصة (السنة أو نوع المسابقة)",
      };
    }

    const university = await ensureUniversity({
      id: contribution.universityId,
      name: contribution.universityName,
      nameAr: contribution.universityName,
    });
    const specialty = await ensureSpecialty({
      id: contribution.specialtyId,
      name: contribution.specialtyName,
      nameAr: contribution.specialtyName,
    });

    const problems = parseProblems(contribution.problemsJson || "[]");
    if (problems.length === 0) {
      return {
        ok: false as const,
        error: "لا توجد تمارين صالحة لنشرها كموضوع",
      };
    }

    const slug = await uniqueTopicSlug(
      `${university.name}-${year}-${examType}-${contribution.examNumber ?? "01"}`,
    );
    const legacyId = await allocateManualLegacyId();
    const title =
      (contribution.title || "").trim() ||
      `مسابقة الدكتوراه ${year} — ${university.nameAr}`;

    const topic = await prisma.topic.create({
      data: {
        slug,
        title,
        examType,
        year,
        universityId: university.id,
        specialtyId: specialty.id,
        source:
          (contribution.source || "").trim() ||
          `مساهمة مستخدم — ${university.name} ${year}`,
        examNumber: contribution.examNumber,
        coefficient: contribution.coefficient,
        durationMinutes:
          contribution.durationMinutes ?? durationFromExamType(examType),
        problems,
        legacyId,
        files: [],
        status: "published",
        createdById: contribution.userId,
      },
    });

    const points = Math.max(0, parseInt(customPointsRaw || "100", 10) || 100);
    await awardPoints(contribution.userId, points);

    await prisma.contribution.update({
      where: { id },
      data: {
        status: "accepted",
        handledById,
        adminNote: adminNote || null,
        pointsAwarded: points,
        createdTopicId: topic.id,
      },
    });

    revalidateAll();
    revalidatePath(`/topics/${topic.slug}`);
    return { ok: true as const, topicId: topic.id };
  } catch (err) {
    console.error("reviewContributionAction failed:", err);
    return {
      ok: false as const,
      error:
        err instanceof Error
          ? err.message
          : "تعذر تنفيذ العملية. أعد المحاولة.",
    };
  }
}
