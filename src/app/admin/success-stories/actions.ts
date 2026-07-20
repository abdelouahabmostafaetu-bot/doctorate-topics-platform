"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") redirect("/");
}

function value(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
}

function makeSlug(title: string) {
  return `success-${Date.now().toString(36)}-${
    title
      .toLowerCase()
      .replace(/[\s\u0600-\u06ff]+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 24) || "story"
  }`;
}

function valuesFrom(formData: FormData) {
  const name = value(formData, "name");
  const title = value(formData, "title");
  const excerpt = value(formData, "excerpt");
  const story = value(formData, "story");
  const advice = value(formData, "advice");
  const university = value(formData, "university");
  const yearValue = value(formData, "year");
  const positionValue = value(formData, "position");
  if (!title || !excerpt || !story || !advice)
    throw new Error("العنوان والملخص والتجربة والنصيحة مطلوبة.");
  const year = Number.parseInt(yearValue, 10);
  const position = Number.parseInt(positionValue, 10);
  return {
    name: name || null,
    title,
    excerpt,
    story,
    advice,
    university: university || null,
    year: Number.isFinite(year) ? year : null,
    position: Number.isFinite(position) ? position : 0,
    published: formData.get("published") === "1",
  };
}

function refresh() {
  revalidatePath("/guide");
  revalidatePath("/guide/success-stories");
  revalidatePath("/admin/success-stories");
}

export async function createSuccessStoryAction(formData: FormData) {
  await requireAdmin();
  const data = valuesFrom(formData);
  await prisma.successStory.create({
    data: { ...data, slug: makeSlug(data.title) },
  });
  refresh();
  redirect("/admin/success-stories");
}

export async function updateSuccessStoryAction(formData: FormData) {
  await requireAdmin();
  const id = value(formData, "id");
  if (!id) throw new Error("معرف التجربة مفقود.");
  await prisma.successStory.update({
    where: { id },
    data: valuesFrom(formData),
  });
  refresh();
  redirect("/admin/success-stories");
}

export async function deleteSuccessStoryAction(id: string) {
  await requireAdmin();
  await prisma.successStory.delete({ where: { id } });
  refresh();
}
