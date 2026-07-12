"use server";

// إجراءات مراجعة تحسين LaTeX: قبول (يطبّق النسخة المحسّنة) أو رفض
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { readPolished } from "./polished";
import { redirect } from "next/navigation";
import { polishProblems, type ProblemInput } from "@/lib/ai/latex-polish";

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

/* ==== تحسين موضوع واحد عبر رابطه من الواجهة مباشرة (Mistral) ==== */

function toError(target: string): never {
  redirect("/admin/latex-review?error=" + encodeURIComponent(target));
}

export async function polishByUrlAction(formData: FormData) {
  await requireAdmin();
  const raw = String(formData.get("url") ?? "").trim();
  if (!raw) toError("الصق رابط الموضوع أولًا");

  // يقبل الرابط الكامل من المتصفح أو الـ slug وحده
  const m = raw.match(/\/topics\/([^\/?#]+)/);
  const slug = decodeURIComponent(
    m ? m[1] : raw.split("?")[0].split("#")[0].replace(/\/+$/, ""),
  );
  if (!slug) toError("تعذر استخراج معرّف الموضوع من الرابط");

  const topic = await prisma.topic.findUnique({ where: { slug } });
  if (!topic) {
    toError("لم يتم العثور على موضوع بهذا الرابط — تأكد أنه رابط صفحة الموضوع نفسها (يحتوي /topics/)");
  }

  let polishedProblems: object[] = [];
  let anyChange = false;
  try {
    const res = await polishProblems(
      topic.problems as unknown as ProblemInput[],
    );
    polishedProblems = res.problems;
    anyChange = res.anyChange;
  } catch (e) {
    const msg = String(e instanceof Error ? e.message : e).slice(0, 160);
    toError("فشل التحسين: " + msg);
  }

  const payload = {
    problems: polishedProblems,
    model: "mistral-large-latest (من الواجهة)",
    at: new Date().toISOString(),
    anyChange,
  };

  await prisma.topic.update({
    where: { id: topic.id },
    data: {
      polished: JSON.parse(JSON.stringify(payload)),
      latexReview: "pending",
    },
  });

  revalidatePath("/admin/latex-review");
  redirect("/admin/latex-review/" + topic.id);
}
