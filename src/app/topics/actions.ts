"use server";

// إرسال بلاغ عن خطأ في موضوع (FR-401) — يتطلّب تسجيل دخول
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function createReportAction(formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("يجب تسجيل الدخول لإرسال بلاف");

  const topicId = formData.get("topicId") as string;
  const problemNumberRaw = formData.get("problemNumber") as string;
  const type = (formData.get("type") as string) || "other";
  const message = ((formData.get("message") as string) || "").trim();

  if (!topicId || !message) {
    throw new Error("يرجى كتابة وصف البلاف");
  }

  const validTypes = [
    "wrong_content",
    "broken_file",
    "wrong_classification",
    "other",
  ];
  const safeType = validTypes.includes(type) ? type : "other";

  await prisma.report.create({
    data: {
      topicId,
      problemNumber: problemNumberRaw ? parseInt(problemNumberRaw, 10) : null,
      userId,
      type: safeType as
        "wrong_content" | "broken_file" | "wrong_classification" | "other",
      message,
    },
  });

  revalidatePath("/admin/reports");
}

// حفظ/إلغاء حفظ موضوع في المفضلة — لوحة المستخدم الشخصية (v2)
export async function toggleFavoriteAction(
  topicId: string,
  slug: string,
): Promise<{ favorited: boolean }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("يجب تسجيل الدخول لحفظ الموضوع");

  const existing = await prisma.favorite.findUnique({
    where: { userId_topicId: { userId, topicId } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
  } else {
    await prisma.favorite.create({ data: { userId, topicId } });
  }

  revalidatePath(`/topics/${slug}`);
  revalidatePath("/account");
  return { favorited: !existing };
}
