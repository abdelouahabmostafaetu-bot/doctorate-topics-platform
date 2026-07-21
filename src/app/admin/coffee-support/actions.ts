"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  const user = session?.user;
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    throw new Error("هذا الإجراء متاح للمديرين فقط");
  }
  return user;
}

export async function addCoffeeSupportAction(formData: FormData) {
  const user = await requireAdmin();
  const amountDzd = Number(formData.get("amountDzd"));
  const supporterName = String(formData.get("supporterName") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const receivedAtRaw = String(formData.get("receivedAt") ?? "").trim();

  if (!Number.isInteger(amountDzd) || amountDzd <= 0 || amountDzd > 1_000_000_000) {
    throw new Error("أدخل مبلغًا صحيحًا موجبًا بالدينار الجزائري");
  }
  if (supporterName.length > 80) throw new Error("اسم الداعم طويل جدًا");
  if (note.length > 300) throw new Error("الملاحظة طويلة جدًا");

  const receivedAt = receivedAtRaw
    ? new Date(receivedAtRaw + "T12:00:00.000Z")
    : new Date();
  if (Number.isNaN(receivedAt.getTime())) throw new Error("تاريخ الاستلام غير صالح");

  await prisma.coffeeSupport.create({
    data: {
      amountDzd,
      supporterName: supporterName || null,
      note: note || null,
      receivedAt,
      createdById: user.id,
    },
  });

  revalidatePath("/admin/coffee-support");
  revalidatePath("/coffee");
}

export async function deleteCoffeeSupportAction(id: string) {
  await requireAdmin();
  await prisma.coffeeSupport.delete({ where: { id } });
  revalidatePath("/admin/coffee-support");
  revalidatePath("/coffee");
}
