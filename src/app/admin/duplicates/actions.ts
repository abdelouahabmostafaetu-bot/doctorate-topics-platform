"use server";

// إجراءات صفحة مقارنة المواضيع وتنظيف التصنيفات
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { deleteTopicAction } from "../topics/actions";
import { askLLM } from "@/lib/ai/llm";

async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    throw new Error("فقط المديرون يملكون هذا الإجراء");
  }
}

function revalidateAll() {
  revalidatePath("/admin/duplicates");
  revalidatePath("/admin/topics");
  revalidatePath("/search");
  revalidatePath("/");
}

export async function deleteDuplicateTopicAction(id: string) {
  await deleteTopicAction(id);
  revalidatePath("/admin/duplicates");
}

/**
 * دمج تخصصين: تُنقل كل مواضيع التخصص الأول إلى الثاني، ثم يُحذف الأول.
 */
export async function mergeSpecialtiesAction(formData: FormData) {
  await requireAdmin();
  const fromId = String(formData.get("fromId") ?? "");
  const toId = String(formData.get("toId") ?? "");
  if (!fromId || !toId || fromId === toId) return;
  await prisma.topic.updateMany({
    where: { specialtyId: fromId },
    data: { specialtyId: toId },
  });
  await prisma.specialty.delete({ where: { id: fromId } });
  revalidateAll();
}

/**
 * حذف تخصص — مسموح فقط إذا لم يكن مرتبطًا بأي موضوع (ادمجه أولًا).
 */
export async function deleteSpecialtyAction(id: string) {
  await requireAdmin();
  const count = await prisma.topic.count({ where: { specialtyId: id } });
  if (count > 0) {
    throw new Error("لا يمكن حذف تخصص مرتبط بمواضيع — ادمجه أولًا");
  }
  await prisma.specialty.delete({ where: { id } });
  revalidateAll();
}

/**
 * حذف جامعة — مسموح فقط إذا لم تكن مرتبطة بأي موضوع.
 */
export async function deleteUniversityAction(id: string) {
  await requireAdmin();
  const count = await prisma.topic.count({ where: { universityId: id } });
  if (count > 0) {
    throw new Error("لا يمكن حذف جامعة مرتبطة بمواضيع — احذف مواضيعها أولًا");
  }
  await prisma.university.delete({ where: { id } });
  revalidateAll();
}

/* ==================== التحليل بالذكاء الاصطناعي ==================== */

export type AiPairVerdict = {
  a: string;
  b: string;
  duplicate: boolean;
  confidence: number;
  reason: string;
};

export type AiCompareResult =
  | { ok: true; pairs: AiPairVerdict[]; recommendation: string }
  | { ok: false; error: string };

type ProblemLike = { problemNumber: number; statement: string };

/**
 * يرسل مجموعة مواضيع متشابهة إلى Mistral ليحكم أي أزواج منها مكررة فعلًا
 * بناءً على محتوى التمارين نفسها وليس العناوين فقط.
 */
export async function aiCompareGroupAction(
  topicIds: string[],
): Promise<AiCompareResult> {
  try {
    await requireAdmin();
    if (topicIds.length < 2 || topicIds.length > 8) {
      return { ok: false, error: "المقارنة تدعم من 2 إلى 8 مواضيع في المجموعة" };
    }
    const found = await prisma.topic.findMany({
      where: { id: { in: topicIds } },
    });
    const ordered = topicIds
      .map((id) => found.find((t) => t.id === id))
      .filter((t): t is (typeof found)[number] => t != null);
    if (ordered.length < 2) {
      return { ok: false, error: "لم يتم العثور على المواضيع" };
    }

    const blocks = ordered.map((t, i) => {
      const problems = t.problems as unknown as ProblemLike[];
      const body = problems
        .slice(0, 4)
        .map(
          (p) =>
            "تمرين " +
            p.problemNumber +
            ": " +
            String(p.statement || "").replace(/\s+/g, " ").slice(0, 450),
        )
        .join("\n");
      const num =
        t.examNumber != null ? " — رقم الموضوع: " + t.examNumber : "";
      return "### T" + (i + 1) + ": " + t.title + num + "\n" + body;
    });

    const prompt =
      "أنت خبير في مسابقات الدكتوراه في الرياضيات. قارن بين المواضيع التالية وحدد أي أزواج منها نسخ مكررة لنفس الموضوع (نفس التمارين جوهريًا حتى لو اختلفت الصياغة أو التنسيق).\n\n" +
      blocks.join("\n\n") +
      '\n\nأجب حصريًا بصيغة JSON صالحة دون أي نص آخر بهذا الشكل:\n{"pairs":[ {"a":"T1","b":"T2","duplicate":true,"confidence":95,"reason":"سبب مختصر بالعربية"} ],"recommendation":"توصية مختصرة بالعربية: أي نسخة تُبقي وأيها تحذف ولماذا"}\nأدرج في pairs كل الأزواج الممكنة بين المواضيع.';

    const raw = await askLLM(prompt);
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end <= start) {
      return { ok: false, error: "تعذر تحليل رد النموذج — أعد المحاولة" };
    }
    const parsed = JSON.parse(raw.slice(start, end + 1)) as {
      pairs?: AiPairVerdict[];
      recommendation?: string;
    };
    return {
      ok: true,
      pairs: Array.isArray(parsed.pairs) ? parsed.pairs.slice(0, 30) : [],
      recommendation: String(parsed.recommendation ?? ""),
    };
  } catch (e) {
    return {
      ok: false,
      error: String(e instanceof Error ? e.message : e).slice(0, 200),
    };
  }
}
