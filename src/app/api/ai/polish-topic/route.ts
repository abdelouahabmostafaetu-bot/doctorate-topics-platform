// تحسين LaTeX لموضوع واحد من صفحته مباشرة (للمديرين فقط)
// الوضع الافتراضي: مفاتيح لوحة /admin/ai — أو مفتاح يدوي (baseUrl + apiKey + model)
// النتيجة تُحفظ كمسودة بانتظار المراجعة في /admin/latex-review
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { polishProblems, type ProblemInput } from "@/lib/ai/latex-polish";

export const runtime = "nodejs";
export const maxDuration = 300;

type Body = {
  topicId?: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
};

export async function POST(req: Request) {
  try {
    const session = await auth();
    const role = session?.user?.role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { ok: false, error: "غير مصرح — هذه الميزة للمديرين فقط" },
        { status: 403 },
      );
    }

    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return NextResponse.json({ ok: false, error: "طلب غير صالح" });
    }

    const topicId = String(body.topicId ?? "").trim();
    if (!topicId) {
      return NextResponse.json({ ok: false, error: "موضوع غير معروف" });
    }

    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) {
      return NextResponse.json({ ok: false, error: "الموضوع غير موجود" });
    }

    // مفتاح يدوي كامل؟ نستخدمه بدل مفاتيح قاعدة البيانات
    const manual =
      body.baseUrl && body.apiKey && body.model
        ? {
            baseUrl: String(body.baseUrl).trim(),
            apiKey: String(body.apiKey).trim(),
            model: String(body.model).trim(),
          }
        : undefined;

    const res = await polishProblems(
      topic.problems as unknown as ProblemInput[],
      manual,
    );

    const payload = {
      problems: res.problems,
      model: manual
        ? manual.model + " (مفتاح يدوي)"
        : "مفاتيح لوحة الذكاء الاصطناعي",
      at: new Date().toISOString(),
      anyChange: res.anyChange,
    };

    await prisma.topic.update({
      where: { id: topic.id },
      data: {
        polished: JSON.parse(JSON.stringify(payload)),
        latexReview: "pending",
      },
    });

    revalidatePath("/admin/latex-review");
    return NextResponse.json({
      ok: true,
      reviewUrl: "/admin/latex-review/" + topic.id,
    });
  } catch (e) {
    const msg = String(e instanceof Error ? e.message : e).slice(0, 200);
    return NextResponse.json({ ok: false, error: msg });
  }
}
