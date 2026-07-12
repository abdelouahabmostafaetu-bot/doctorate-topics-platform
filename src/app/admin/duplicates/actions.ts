"use server";

// إجراءات صفحة مقارنة المواضيع وتنظيف التصنيفات
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { deleteTopicAction } from "../topics/actions";

async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    throw new Error("فقط المديرون يملكون هذا الإجراء");
  }
}

function revalidateAll() {
  revalidatePath("/admin/duplicates");
  revalidatePath("/admin/topics");
  revalidatePath("/search");
  revalidatePath("/");
}

export async function deleteDuplicateTopicAction(id: string) {
  await deleteTopicAction(id);
  revalidatePath("/admin/duplicates");
}

/**
 * دمج تخصصين: تُنقل كل مواضيع التخصص الأول إلى الثاني، ثم يُحذف الأول.
 */
export async function mergeSpecialtiesAction(formData: FormData) {
  await requireAdmin();
  const fromId = String(formData.get("fromId") ?? "");
  const toId = String(formData.get("toId") ?? "");
  if (!fromId || !toId || fromId === toId) return;
  await prisma.topic.updateMany({
    where: { specialtyId: fromId },
    data: { specialtyId: toId },
  });
  await prisma.specialty.delete({ where: { id: fromId } });
  revalidateAll();
}

/**
 * حذف تخصص — مسموح فقط إذا لم يكن مرتبطًا بأي موضوع (ادمجه أولًا).
 */
export async function deleteSpecialtyAction(id: string) {
  await requireAdmin();
  const count = await prisma.topic.count({ where: { specialtyId: id } });
  if (count > 0) {
    throw new Error("لا يمكن حذف تخصص مرتبط بمواضيع — ادمجه أولًا");
  }
  await prisma.specialty.delete({ where: { id } });
  revalidateAll();
}

/**
 * حذف جامعة — مسموح فقط إذا لم تكن مرتبطة بأي موضوع.
 */
export async function deleteUniversityAction(id: string) {
  await requireAdmin();
  const count = await prisma.topic.count({ where: { universityId: id } });
  if (count > 0) {
    throw new Error("لا يمكن حذف جامعة مرتبطة بمواضيع — احذف مواضيعها أولًا");
  }
  await prisma.university.delete({ where: { id } });
  revalidateAll();
}
