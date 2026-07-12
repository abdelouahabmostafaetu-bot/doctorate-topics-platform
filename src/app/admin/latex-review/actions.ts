"use server";

// إجراءات مراجعة تحسين LaTeX: قبول (يطبّق النسخة المحسّنة) أو رفض
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { readPolished } from "./polished";

async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    throw new Error("فقط المديرون يملكون هذا الإجراء");
  }
}

export async function approveLatexAction(topicId: string) {
  await requireAdmin();
  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  if (!topic) throw new Error("الموضوع غير موجود");
  const polished = readPolished(topic.polished);
  if (polished.length === 0) throw new Error("لا توجد نسخة محسّنة لهذا الموضوع");

  // دمج الحقول المحسّنة فقط — ما لم يُحسّن يبقى كما هو
  const merged = topic.problems.map((p) => {
    const pol = polished.find((x) => x.problemNumber === p.problemNumber);
    if (!pol) return p;
    return {
      ...p,
      statement: pol.statement || p.statement,
      solution: pol.solution || p.solution,
      remark: pol.remark || p.remark,
    };
  });

  await prisma.topic.update({
    where: { id: topicId },
    data: { problems: merged, latexReview: "done" },
  });

  revalidatePath("/admin/latex-review");
  revalidatePath(`/topics/${topic.slug}`);
}

export async function rejectLatexAction(topicId: string) {
  await requireAdmin();
  await prisma.topic.update({
    where: { id: topicId },
    data: { latexReview: "rejected" },
  });
  revalidatePath("/admin/latex-review");
}

/** إعادة موضوع مرفوض/مقبول إلى الطابور ليعالجه السكريبت من جديد */
export async function requeueLatexAction(topicId: string) {
  await requireAdmin();
  await prisma.topic.update({
    where: { id: topicId },
    data: { latexReview: null },
  });
  revalidatePath("/admin/latex-review");
}
