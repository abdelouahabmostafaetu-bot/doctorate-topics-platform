"use server";

// تحديث الملف الشخصي — حقل الاسم فقط دون توجيه (يسمح بالتوسيع لاترَا بالدمر)
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function updateProfileAction(formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("يجب تسجيل الدخول");
  const name = ((formData.get("name") as string) || "").trim();
  if (!name) throw new Error("الاسم مطلوب");
  await prisma.user.update({ where: { id: userId }, data: { name } });
  revalidatePath("/account");
}
