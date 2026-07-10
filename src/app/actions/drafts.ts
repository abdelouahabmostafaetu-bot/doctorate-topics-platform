"use server";

// إجراءات المسودات (Draft) — تُستخدم من useAutoSave لكل النماذج (الأسبوع 7)
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { Prisma } from "@prisma/client";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000; // FR-607: انتهاء صلاحية المسودة

export async function saveDraftAction(
  formId: string,
  data: Record<string, unknown>,
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false as const };

  await prisma.draft.upsert({
    where: { userId_formId: { userId, formId } },
    update: {
      data: data as Prisma.InputJsonValue,
      savedAt: new Date(),
      expiresAt: new Date(Date.now() + THIRTY_DAYS_MS),
    },
    create: {
      userId,
      formId,
      data: data as Prisma.InputJsonValue,
      expiresAt: new Date(Date.now() + THIRTY_DAYS_MS),
    },
  });
  return { ok: true as const };
}

export async function loadDraftAction(formId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const draft = await prisma.draft.findUnique({
    where: { userId_formId: { userId, formId } },
  });
  if (!draft) return null;
  return { data: draft.data, savedAt: draft.savedAt.toISOString() };
}

export async function deleteDraftAction(formId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;
  await prisma.draft.deleteMany({ where: { userId, formId } });
}
