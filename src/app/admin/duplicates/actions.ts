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

/* ==================== التحقق بالذكاء الاصطناعي ==================== */

export type AiPairVerdict = {
  a: string;
  b: string;
  duplicate: boolean;
  confidence: number;
  reason: string;
};

export type AiVerifyResult =
  | {
      ok: true;
      pairs: AiPairVerdict[];
      recommendation: string;
      autoDeleted: string[];
    }
  | { ok: false; error: string };

type ProblemLike = { problemNumber: number; statement: string };

/** وضع علامة «تم التحقق» على كل مواضيع المجموعة لإخفائها من قائمة الاشتباه */
export async function markGroupCheckedAction(topicIds: string[]) {
  await requireAdmin();
  await prisma.topic.updateMany({
    where: { id: { in: topicIds } },
    data: { dupReview: "checked" },
  });
  revalidatePath("/admin/duplicates");
}

/** إعادة مجموعة إلى قائمة الاشتباه */
export async function unmarkGroupCheckedAction(topicIds: string[]) {
  await requireAdmin();
  await prisma.topic.updateMany({
    where: { id: { in: topicIds } },
    data: { dupReview: null },
  });
  revalidatePath("/admin/duplicates");
}

/**
 * تحقق ذكي من مجموعة: يقارن Mistral محتوى التمارين نفسها،
 * يحذف تلقائيًا النسخة الأحدث عند تطابق 100%، ويعيد بقية الأزواج للمراجعة.
 */
export async function aiVerifyGroupAction(
  topicIds: string[],
): Promise<AiVerifyResult> {
  try {
    await requireAdmin();
    if (topicIds.length < 2) {
      return { ok: false, error: "المجموعة غير كافية للمقارنة" };
    }
    if (topicIds.length > 20) {
      return {
        ok: false,
        error:
          "المقارنة تدعم حتى 20 موضوعًا في المجموعة — استخدم الوضع الأدق (نفس التخصص) لتصغير المجموعة",
      };
    }
    const big = topicIds.length > 8;

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
        .slice(0, big ? 2 : 4)
        .map(
          (p) =>
            "تمرين " +
            p.problemNumber +
            ": " +
            String(p.statement || "")
              .replace(/\s+/g, " ")
              .slice(0, big ? 220 : 450),
        )
        .join("\n");
      const num =
        t.examNumber != null ? " — رقم الموضوع: " + t.examNumber : "";
      return "### T" + (i + 1) + ": " + t.title + num + "\n" + body;
    });

    const prompt =
      "أنت خبير في مسابقات الدكتوراه في الرياضيات. قارن بين المواضيع التالية وحدد أي أزواج منها نسخ مكررة لنفس الموضوع (نفس التمارين جوهريًا حتى لو اختلفت الصياغة أو التنسيق).\n\n" +
      blocks.join("\n\n") +
      '\n\nأجب حصريًا بصيغة JSON صالحة دون أي نص آخر بهذا الشكل:\n{"pairs":[ {"a":"T1","b":"T2","duplicate":true,"confidence":95,"reason":"سبب مختصر بالعربية"} ],"recommendation":"توصية مختصرة بالعربية"}\nقواعد الثقة: أعطِ confidence 100 فقط إذا كانت التمارين متطابقة تمامًا في المحتوى الرياضي (سيُحذف تلقائيًا)، و90-99 لتشابه شبه تام، وأقل من 90 عند أي شك.\n' +
      (big
        ? "أدرج في pairs فقط الأزواج المكررة أو المشتبه بها بقوة — لا تدرج الأزواج المختلفة بوضوح، وإن لم يوجد تكرار أرجع pairs مصفوفة فارغة."
        : "أدرج في pairs كل الأزواج الممكنة بين المواضيع.");

    const raw = await askLLM(prompt, "duplicates");
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end <= start) {
      return { ok: false, error: "تعذر تحليل رد النموذج — أعد المحاولة" };
    }
    const parsed = JSON.parse(raw.slice(start, end + 1)) as {
      pairs?: AiPairVerdict[];
      recommendation?: string;
    };
    const pairs = Array.isArray(parsed.pairs) ? parsed.pairs.slice(0, 40) : [];

    // الحذف التلقائي عند تطابق 100% — نحذف الأحدث ونُبقي الأقدم
    const keyToTopic = new Map<string, (typeof ordered)[number]>();
    ordered.forEach((t, i) => keyToTopic.set("T" + (i + 1), t));
    const deletedIds = new Set<string>();
    const autoDeleted: string[] = [];
    for (const pair of pairs) {
      if (!pair.duplicate || pair.confidence < 100) continue;
      const ta = keyToTopic.get(pair.a);
      const tb = keyToTopic.get(pair.b);
      if (!ta || !tb || ta.id === tb.id) continue;
      if (deletedIds.has(ta.id) || deletedIds.has(tb.id)) continue;
      const toDelete = ta.createdAt <= tb.createdAt ? tb : ta;
      await deleteTopicAction(toDelete.id);
      deletedIds.add(toDelete.id);
      autoDeleted.push(toDelete.title);
    }
    if (autoDeleted.length > 0) revalidateAll();

    return {
      ok: true,
      pairs,
      recommendation: String(parsed.recommendation ?? ""),
      autoDeleted,
    };
  } catch (e) {
    return {
      ok: false,
      error: String(e instanceof Error ? e.message : e).slice(0, 200),
    };
  }
}
