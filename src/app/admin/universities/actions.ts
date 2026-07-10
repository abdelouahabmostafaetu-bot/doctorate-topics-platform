"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    throw new Error("فقط المديرون يملكون هذا الإجراء");
  }
}

export async function updateUniversityAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const nameAr = formData.get("nameAr") as string;
  const city = (formData.get("city") as string) || null;
  await prisma.university.update({ where: { id }, data: { nameAr, city } });
  revalidatePath("/admin/universities");
}

export async function addUniversityAction(formData: FormData) {
  await requireAdmin();
  const name = formData.get("name") as string;
  const nameAr = formData.get("nameAr") as string;
  const slug = formData.get("slug") as string;
  const city = (formData.get("city") as string) || null;
  await prisma.university.create({ data: { name, nameAr, slug, city } });
  revalidatePath("/admin/universities");
}
