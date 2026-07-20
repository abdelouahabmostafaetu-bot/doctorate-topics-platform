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
function slug(title: string) {
  return `success-${Date.now().toString(36)}-${
    title
      .toLowerCase()
      .replace(/[\s\u0600-\u06ff]+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 24) || "story"
  }`;
}
function refresh() {
  revalidatePath("/guide");
  revalidatePath("/guide/success-stories");
  revalidatePath("/admin/success-story-submissions");
}

export async function approveSuccessStorySubmissionAction(id: string) {
  await requireAdmin();
  const submission = await prisma.successStorySubmission.findUnique({
    where: { id },
  });
  if (!submission || submission.status !== "pending") return;
  await prisma.successStory.create({
    data: {
      slug: slug(submission.title),
      name: submission.name,
      university: submission.university,
      year: submission.year,
      title: submission.title,
      excerpt: submission.excerpt,
      story: submission.story,
      advice: submission.advice,
      published: true,
      position: 999,
    },
  });
  await prisma.successStorySubmission.update({
    where: { id },
    data: { status: "approved", reviewedAt: new Date() },
  });
  refresh();
}

export async function rejectSuccessStorySubmissionAction(id: string) {
  await requireAdmin();
  await prisma.successStorySubmission.update({
    where: { id },
    data: { status: "rejected", reviewedAt: new Date() },
  });
  refresh();
}
