"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") redirect("/");
  return session!.user!;
}

function makeSlug(title: string, id?: string): string {
  // نستخدم طابع زمني + suffix من العنوان إن توفر
  const ts = id ? id.slice(-6) : Date.now().toString(36);
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[\s\u0600-\u06ff]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 40) || "article";
  return `${base}-${ts}`;
}

export async function createArticleAction(formData: FormData) {
  const user = await requireAdmin();

  const titleAr = ((formData.get("titleAr") as string) || "").trim();
  const summary = ((formData.get("summary") as string) || "").trim();
  const content = ((formData.get("content") as string) || "").trim();
  const position = parseInt((formData.get("position") as string) || "0", 10);
  const published = formData.get("published") === "1";

  if (!titleAr) throw new Error("العنوان مطلوب");
  if (!content) throw new Error("المحتوى مطلوب");

  const slug = makeSlug(titleAr);

  await prisma.article.create({
    data: {
      slug,
      titleAr,
      summary: summary || null,
      content,
      position: isNaN(position) ? 0 : position,
      published,
      createdById: user.id,
    },
  });

  revalidatePath("/guide");
  revalidatePath("/admin/guide");
  redirect("/admin/guide");
}

export async function updateArticleAction(formData: FormData) {
  await requireAdmin();

  const id = (formData.get("id") as string) || "";
  if (!id) throw new Error("معرف المقال مفقود");

  const titleAr = ((formData.get("titleAr") as string) || "").trim();
  const summary = ((formData.get("summary") as string) || "").trim();
  const content = ((formData.get("content") as string) || "").trim();
  const position = parseInt((formData.get("position") as string) || "0", 10);
  const published = formData.get("published") === "1";

  if (!titleAr) throw new Error("العنوان مطلوب");
  if (!content) throw new Error("المحتوى مطلوب");

  await prisma.article.update({
    where: { id },
    data: {
      titleAr,
      summary: summary || null,
      content,
      position: isNaN(position) ? 0 : position,
      published,
    },
  });

  revalidatePath("/guide");
  revalidatePath("/admin/guide");
  redirect("/admin/guide");
}

export async function deleteArticleAction(id: string) {
  await requireAdmin();
  await prisma.article.delete({ where: { id } });
  revalidatePath("/guide");
  revalidatePath("/admin/guide");
}
