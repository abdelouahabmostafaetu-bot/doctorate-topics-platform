"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";
import { durationFromExamType } from "@/lib/exam-duration";
import { parseProblems } from "@/lib/topic-helpers";

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
  const examNumberRaw = String(formData.get("examNumber") ?? "");
  const coefficientRaw = String(formData.get("coefficient") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim();
  const problemsJson = String(formData.get("problemsJson") ?? "[]");

  if (!year || Number.isNaN(year)) {
    throw new Error("يرجى إدخال سنة صحيحة");
  }
  if (!universityId && !universityName) {
    throw new Error("يرجى اختيار الجامعة");
  }
  if (!specialtyId && !specialtyName) {
    throw new Error("يرجى اختيار التخصص");
  }

  if (type === "latex") {
    const problems = parseProblems(problemsJson);
    if (problems.length === 0) {
      throw new Error("أضف تمرينًا واحدًا على الأقل بنص LaTeX");
    }
    await prisma.contribution.create({
      data: {
        userId,
        type: "latex",
        status: "pending",
        universityId: universityId || null,
        universityName: universityName || null,
        specialtyId: specialtyId || null,
        specialtyName: specialtyName || null,
        year,
        examType,
        examNumber: examNumberRaw ? parseInt(examNumberRaw, 10) : null,
        coefficient: coefficientRaw ? parseInt(coefficientRaw, 10) : null,
        durationMinutes: durationFromExamType(examType),
        title: title || null,
        source: source || null,
        problemsJson: JSON.stringify(problems),
      },
    });
  } else {
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      throw new Error("يرجى رفع ملف PDF");
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `contributions/${userId}/${Date.now()}-${file.name}`;
    const url = await uploadFile(buffer, key, file.type || "application/pdf");

    await prisma.contribution.create({
      data: {
        userId,
        type: "file",
        status: "pending",
        universityId: universityId || null,
        universityName: universityName || null,
        specialtyId: specialtyId || null,
        specialtyName: specialtyName || null,
        year,
        examType,
        examNumber: examNumberRaw ? parseInt(examNumberRaw, 10) : null,
        coefficient: coefficientRaw ? parseInt(coefficientRaw, 10) : null,
        durationMinutes: durationFromExamType(examType),
        title: title || null,
        source: source || null,
        fileUrl: url,
        fileName: file.name,
        fileSizeBytes: file.size,
      },
    });
  }

  revalidatePath("/contribute");
  revalidatePath("/admin/contributions");
  redirect("/contribute?submitted=1");
}
