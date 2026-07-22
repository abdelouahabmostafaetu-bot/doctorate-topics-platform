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

function cleanText(v: FormDataEntryValue | null, max: number) {
  return String(v ?? "")
    .trim()
    .slice(0, max);
}

export async function addSiteTipAction(formData: FormData) {
  await requireAdmin();
  const text = cleanText(formData.get("text"), 280);
  const href = cleanText(formData.get("href"), 200);
  const cta = cleanText(formData.get("cta"), 40);
  const order = Number(formData.get("order") ?? 0);

  if (!text) throw new Error("نص النصيحة مطلوب");
  if (href && !href.startsWith("/") && !href.startsWith("https://")) {
    throw new Error("الرابط يجب أن يبدأ بـ / أو https://");
  }

  await prisma.siteTip.create({
    data: {
      text,
      href: href || null,
      cta: cta || null,
      order: Number.isFinite(order) ? Math.trunc(order) : 0,
      active: true,
    },
  });

  revalidatePath("/admin/tips");
  revalidatePath("/");
}

export async function toggleSiteTipAction(id: string) {
  await requireAdmin();
  const tip = await prisma.siteTip.findUnique({ where: { id } });
  if (!tip) throw new Error("النصيحة غير موجودة");
  await prisma.siteTip.update({
    where: { id },
    data: { active: !tip.active },
  });
  revalidatePath("/admin/tips");
  revalidatePath("/");
}

export async function deleteSiteTipAction(id: string) {
  await requireAdmin();
  await prisma.siteTip.delete({ where: { id } });
  revalidatePath("/admin/tips");
  revalidatePath("/");
}

export async function updateSiteTipAction(formData: FormData) {
  await requireAdmin();
  const id = cleanText(formData.get("id"), 40);
  const text = cleanText(formData.get("text"), 280);
  const href = cleanText(formData.get("href"), 200);
  const cta = cleanText(formData.get("cta"), 40);
  const order = Number(formData.get("order") ?? 0);

  if (!id || !text) throw new Error("بيانات غير مكتملة");
  if (href && !href.startsWith("/") && !href.startsWith("https://")) {
    throw new Error("الرابط يجب أن يبدأ بـ / أو https://");
  }

  await prisma.siteTip.update({
    where: { id },
    data: {
      text,
      href: href || null,
      cta: cta || null,
      order: Number.isFinite(order) ? Math.trunc(order) : 0,
    },
  });

  revalidatePath("/admin/tips");
  revalidatePath("/");
}
