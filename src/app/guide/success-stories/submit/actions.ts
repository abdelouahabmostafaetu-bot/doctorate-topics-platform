"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const text = (formData: FormData, field: string) =>
  String(formData.get(field) ?? "").trim();

export async function submitSuccessStoryAction(formData: FormData) {
  const name = text(formData, "name");
  const email = text(formData, "email");
  const university = text(formData, "university");
  const title = text(formData, "title");
  const excerpt = text(formData, "excerpt");
  const story = text(formData, "story");
  const advice = text(formData, "advice");
  const yearRaw = text(formData, "year");
  const year = Number.parseInt(yearRaw, 10);
  if (!title || !excerpt || !story || !advice)
    throw new Error("يرجى ملء جميع الحقول المطلوبة.");
  await prisma.successStorySubmission.create({
    data: {
      name,
      email: email || null,
      university: university || null,
      year: Number.isFinite(year) ? year : null,
      title,
      excerpt,
      story,
      advice,
    },
  });
  redirect("/guide/success-stories/submit?sent=1");
}
