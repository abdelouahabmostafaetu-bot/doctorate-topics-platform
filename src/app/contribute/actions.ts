"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type FilePayload = {
  url: string;
  fileName: string;
  sizeBytes: number;
  contentType: string;
};

type SubmitPayload = {
  kind: "latex" | "files";
  title: string;
  universityName: string | null;
  specialtyName: string | null;
  year: number | null;
  examType: string | null;
  message: string | null;
  latexContent: string | null;
  files: FilePayload[];
};

export async function submitContribution(
  payload: SubmitPayload
): Promise<{ ok?: boolean; error?: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "يجب تسجيل الدخول أولًا." };

  const title = (payload.title ?? "").trim().slice(0, 200);
  if (!title) return { error: "العنوان مطلوب." };

  if (payload.kind === "latex") {
    if (!payload.latexContent || !payload.latexContent.trim()) {
      return { error: "محتوى LaTeX مطلوب." };
    }
    if (payload.latexContent.length > 100000) {
      return { error: "المحتوى طويل جدًا — أرسله على دفعات من فضلك." };
    }
  } else if (!Array.isArray(payload.files) || payload.files.length === 0) {
    return { error: "يرجى رفع ملف واحد على الأقل." };
  }

  const files = (payload.files ?? [])
    .slice(0, 10)
    .filter((f) => f && typeof f.url === "string" && f.url.length > 0)
    .map((f) => ({
      url: f.url,
      fileName: String(f.fileName ?? "file").slice(0, 200),
      sizeBytes: Number(f.sizeBytes) || 0,
      contentType: String(f.contentType ?? "application/octet-stream").slice(0, 100),
    }));

  await prisma.contribution.create({
    data: {
      userId,
      kind: payload.kind === "files" ? "files" : "latex",
      title,
      universityName: payload.universityName?.trim().slice(0, 200) || null,
      specialtyName: payload.specialtyName?.trim().slice(0, 200) || null,
      year:
        payload.year != null && Number.isFinite(payload.year)
          ? Math.trunc(payload.year)
          : null,
      examType:
        payload.examType === "general" || payload.examType === "specialty"
          ? payload.examType
          : null,
      message: payload.message?.trim().slice(0, 2000) || null,
      latexContent: payload.kind === "latex" ? payload.latexContent : null,
      files,
    },
  });

  return { ok: true };
}
