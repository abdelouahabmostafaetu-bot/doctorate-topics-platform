import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

// DocMath AI — مساعد الشاشة الرئيسية: بحث واقتراح فقط (قراءة فقط من قاعدة البيانات)
// الحد: 50 رسالة لكل مستخدم في كل نافذة 4 ساعات
const LIMIT = Number(process.env.ASSISTANT_MESSAGES ?? 50);
const WINDOW_HOURS = Number(process.env.ASSISTANT_WINDOW_HOURS ?? 4);
const WINDOW_MS = WINDOW_HOURS * 60 * 60 * 1000;
const SITE = "https://www.docmathdz.dev";
const MAX_TEXT_CHARS = 4000;

type Msg = { role: "user" | "assistant"; content: string };

function jsonError(
  message: string,
  code: string,
  status: number,
  extra: Record<string, unknown> = {},
) {
  return NextResponse.json({ error: message, code, ...extra }, { status });
}

// نماذج الاستدلال تكتب تفكيرها الداخلي — نحذفه من البث قبل وصوله للمستخدم
function createThinkFilter(startInThink = false) {
  let pending = "";
  let inThink = startInThink;
  const OPEN = "<think>";
  const CLOSE = "</think>";
  function holdback(s: string, tag: string): number {
    const max = Math.min(s.length, tag.length - 1);
    for (let k = max; k > 0; k--) {
      if (s.endsWith(tag.slice(0, k))) return k;
    }
    return 0;
  }
  return {
    push(chunk: string): string {
      pending += chunk;
      let out = "";
      for (;;) {
        if (inThink) {
          const end = pending.indexOf(CLOSE);
          if (end === -1) {
            pending = pending.slice(
              Math.max(0, pending.length - (CLOSE.length - 1)),
            );
            return out;
          }
          pending = pending.slice(end + CLOSE.length);
          inThink = false;
        } else {
          const start = pending.indexOf(OPEN);
          if (start === -1) {
            const keep = holdback(pending, OPEN);
            out += pending.slice(0, pending.length - keep);
            pending = pending.slice(pending.length - keep);
            return out;
          }
          out += pending.slice(0, start);
          pending = pending.slice(start + OPEN.length);
          inThink = true;
        }
      }
    },
    flush(): string {
      const rest = inThink ? "" : pending;
      pending = "";
      return rest;
    },
  };
}

// يجلب استهلاك المستخدم ويعيد فتح النافذة إذا مرت 4 ساعات
async function getUsage(userId: string) {
  const now = Date.now();
  let usage = await prisma.assistantUsage.findUnique({ where: { userId } });
  if (!usage || now - usage.windowStart.getTime() >= WINDOW_MS) {
    usage = await prisma.assistantUsage.upsert({
      where: { userId },
      update: { windowStart: new Date(now), count: 0 },
      create: { userId, windowStart: new Date(now), count: 0 },
    });
  }
  return usage;
}

// GET — حالة المستخدم: كم رسالة بقيت ومتى تُفتح النافذة من جديد
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return jsonError("Sign in to use DocMath AI.", "signin_required", 401);
  }
  const usage = await getUsage(userId);
  return NextResponse.json({
    name: session?.user?.name ?? "",
    limit: LIMIT,
    remaining: Math.max(0, LIMIT - usage.count),
    resetAt: new Date(usage.windowStart.getTime() + WINDOW_MS).toISOString(),
  });
}

const TOPIC_SELECT = {
  slug: true,
  title: true,
  year: true,
  university: { select: { nameAr: true } },
  specialty: { select: { nameAr: true } },
} as const;

// بحث للقراءة فقط في قاعدة بيانات الموقع — لا حذف ولا تعديل أبدًا
async function searchSite(question: string): Promise<string> {
  const q = question.slice(0, 300);
  const tokens = q
    .split(/[\s،؟?.,;:!()[\]"'«»]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 8);
  const yearMatch = q.match(/(19|20)\d{2}/);
  const year = yearMatch ? Number(yearMatch[0]) : null;

  let universityIds: string[] = [];
  let specialtyIds: string[] = [];
  if (tokens.length > 0) {
    const [universities, specialties] = await Promise.all([
      prisma.university
        .findMany({
          where: {
            OR: tokens.flatMap((t) => [
              { name: { contains: t, mode: "insensitive" as const } },
              { nameAr: { contains: t } },
              { slug: { contains: t.toLowerCase() } },
              { city: { contains: t, mode: "insensitive" as const } },
            ]),
          },
          take: 3,
          select: { id: true },
        })
        .catch(() => []),
      prisma.specialty
        .findMany({
          where: {
            OR: tokens.flatMap((t) => [
              { name: { contains: t, mode: "insensitive" as const } },
              { nameAr: { contains: t } },
            ]),
          },
          take: 3,
          select: { id: true },
        })
        .catch(() => []),
    ]);
    universityIds = universities.map((u) => u.id);
    specialtyIds = specialties.map((s) => s.id);
  }

  const where: Record<string, unknown> = { status: "published" };
  if (universityIds.length > 0) where.universityId = { in: universityIds };
  if (specialtyIds.length > 0) where.specialtyId = { in: specialtyIds };
  if (year) where.year = year;

  let topics =
    universityIds.length > 0 || specialtyIds.length > 0 || year
      ? await prisma.topic
          .findMany({
            where,
            orderBy: [{ year: "desc" }, { examNumber: "asc" }],
            take: 8,
            select: TOPIC_SELECT,
          })
          .catch(() => [])
      : [];

  // لا نتائج مباشرة؟ نجرب البحث في العناوين
  if (topics.length === 0 && tokens.length > 0) {
    topics = await prisma.topic
      .findMany({
        where: {
          status: "published",
          OR: tokens.map((t) => ({
            title: { contains: t, mode: "insensitive" as const },
          })),
        },
        orderBy: { year: "desc" },
        take: 6,
        select: TOPIC_SELECT,
      })
      .catch(() => []);
  }

  if (topics.length === 0) return "";
  return topics
    .map(
      (t) =>
        `- ${t.title} — ${t.university.nameAr} ${t.year} (${t.specialty.nameAr}) → ${SITE}/topics/${t.slug}`,
    )
    .join("\n");
}

export async function POST(request: NextRequest) {
  try {
    // 1) للأعضاء فقط
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return jsonError("Sign in to use DocMath AI.", "signin_required", 401);
    }

    // 2) حد 50 رسالة لكل 4 ساعات
    const usage = await getUsage(userId);
    const resetAt = new Date(
      usage.windowStart.getTime() + WINDOW_MS,
    ).toISOString();
    if (usage.count >= LIMIT) {
      return jsonError(
        "Message limit reached. Try again later.",
        "limit_messages",
        429,
        { resetAt },
      );
    }

    // 3) تنظيف الرسائل — نصوص فقط
    const body = await request.json().catch(() => null);
    const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
    const messages: Msg[] = [];
    for (const m of rawMessages.slice(-12)) {
      const role = m?.role;
      if (
        (role === "user" || role === "assistant") &&
        typeof m?.content === "string" &&
        m.content.trim().length > 0
      ) {
        messages.push({ role, content: m.content.slice(0, MAX_TEXT_CHARS) });
      }
    }
    if (
      messages.length === 0 ||
      messages[messages.length - 1].role !== "user"
    ) {
      return jsonError("No valid messages.", "bad_request", 400);
    }

    const endpoint = (process.env.AZURE_OPENAI_ENDPOINT ?? "").replace(
      /\/+$/,
      "",
    );
    const apiKey = process.env.AZURE_OPENAI_API_KEY ?? "";
    // الصفحة الرئيسية = Kimi فقط
    const deployment =
      process.env.AZURE_OPENAI_DEPLOYMENT_KIMI ||
      process.env.AZURE_OPENAI_DEPLOYMENT_ASSISTANT ||
      process.env.AZURE_OPENAI_DEPLOYMENT_VISION ||
      "";
    if (!endpoint || !apiKey || !deployment) {
      return jsonError(
        "Kimi is not configured. Set AZURE_OPENAI_DEPLOYMENT_KIMI.",
        "not_configured",
        500,
      );
    }

    // 4) نحسب الرسالة قبل النداء
    await prisma.assistantUsage.update({
      where: { userId },
      data: { count: { increment: 1 } },
    });
    const remaining = Math.max(0, LIMIT - usage.count - 1);

    // 5) بحث قراءة-فقط في قاعدة البيانات ثم حقن النتائج للنموذج
    const question = messages[messages.length - 1].content;
    const searchResults = await searchSite(question).catch(() => "");
    const firstName =
      (session?.user?.name ?? "").trim().split(/\s+/)[0] || "friend";

    const systemPrompt = [
      `You are Mathora 🤖 — the built-in home assistant of DocMath DZ (${SITE}), a free archive of Algerian mathematics PhD entrance exams.`,
      `The user's name is "${firstName}". Address them by name naturally.`,
      "Personality: witty and playfully teasing but always kind, motivating, smart, and human-like. Use emojis naturally 😄 but don't overdo it.",
      "Language: reply in the user's language (usually Arabic). Keep product/AI terms in English (Mathora, link, search...).",
      "Your ONLY abilities: (1) search the site database — results are provided below — and share direct links, (2) suggest exercises and topics, (3) give study and exam-preparation advice when asked.",
      "You are strictly READ-ONLY. You can never delete, edit, create, or change anything on the site. If asked to, refuse with a light joke.",
      "Links: share ONLY the exact links listed in the search results below, formatted as [عنوان الموضوع](link). NEVER invent or guess a link.",
      "If the search results are empty, say you couldn't find matching topics and suggest the user browse " +
        SITE +
        "/topics or rephrase (university name, year, specialty).",
      "Formatting: plain short text with links only — no headings, no tables, no code blocks. Keep answers concise.",
      "Never mention the underlying AI model or provider (Kimi, DeepSeek, Phi, Azure…). You are simply Mathora.",
      "Never show hidden reasoning or chain-of-thought — output the final answer only.",
      "=== SITE DATABASE SEARCH RESULTS (read-only) ===",
      searchResults || "(no matching topics found)",
    ].join("\n");

    // 6) نداء Azure مع بث مباشر
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    const azureResponse = await fetch(endpoint + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: JSON.stringify({
        model: deployment,
        stream: true,
        max_tokens: 1500,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      }),
      signal: controller.signal,
    }).catch(() => null);

    if (!azureResponse || !azureResponse.ok || !azureResponse.body) {
      clearTimeout(timeout);
      return jsonError("AI service error.", "upstream_error", 502);
    }

    // 7) تحويل بث SSE إلى نص خام مع حذف التفكير الداخلي
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const azureBody = azureResponse.body;
    const stream = new ReadableStream({
      async start(streamController) {
        const reader = azureBody.getReader();
        const isReasoningModel = /reason|think|r1/i.test(deployment);
        const thinkFilter = createThinkFilter(isReasoningModel);
        let started = false;
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const payload = trimmed.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;
              try {
                const parsed: any = JSON.parse(payload);
                const delta = parsed?.choices?.[0]?.delta?.content;
                if (typeof delta === "string" && delta.length > 0) {
                  let text = thinkFilter.push(delta);
                  if (text && !started) {
                    text = text.replace(/^\s+/, "");
                    if (text) started = true;
                  }
                  if (text) streamController.enqueue(encoder.encode(text));
                }
              } catch {
                // نتجاهل الأجزاء غير المكتملة
              }
            }
          }
          const rest = thinkFilter.flush();
          if (rest) {
            const text = started ? rest : rest.replace(/^\s+/, "");
            if (text) streamController.enqueue(encoder.encode(text));
          }
        } catch {
          // انقطاع البث — نغلق بهدوء بما وصل
        } finally {
          clearTimeout(timeout);
          streamController.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
        "X-AI-Remaining": String(remaining),
        "X-AI-Reset": resetAt,
      },
    });
  } catch {
    return jsonError("Server error.", "server_error", 500);
  }
}
