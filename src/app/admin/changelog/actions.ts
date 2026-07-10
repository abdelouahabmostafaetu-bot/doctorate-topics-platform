"use server";

// إدارة "جديدنا" (What's New — SUPER_ADMIN فقط)
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

async function requireSuperAdmin() {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    throw new Error("هذا الإجراء متاح للمشرف الرئيسي فقط");
  }
  return session.user;
}

type RawItem = { type?: string; textAr?: string };

export async function createChangelogEntryAction(formData: FormData) {
  const user = await requireSuperAdmin();
  const titleAr = ((formData.get("titleAr") as string) || "").trim();
  const itemsJson = (formData.get("itemsJson") as string) || "[]";
  if (!titleAr) throw new Error("عنوان التحديث مطلوب");

  let raw: RawItem[] = [];
  try {
    const parsed = JSON.parse(itemsJson);
    if (Array.isArray(parsed)) raw = parsed;
  } catch {
    raw = [];
  }
  const items = raw
    .map((it) => ({
      type: (["new", "improved", "fixed"].includes(it.type ?? "")
        ? it.type
        : "new") as "new" | "improved" | "fixed",
      textAr: (it.textAr ?? "").trim(),
    }))
    .filter((it) => it.textAr.length > 0);

  await prisma.changelogEntry.create({
    data: { titleAr, items, createdById: user.id },
  });

  revalidatePath("/admin/changelog");
}

export async function deleteChangelogEntryAction(id: string) {
  await requireSuperAdmin();
  await prisma.changelogEntry.delete({ where: { id } });
  revalidatePath("/admin/changelog");
}
