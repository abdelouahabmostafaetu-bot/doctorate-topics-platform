import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

// Mathora — مساعد الموقع: بحث واقتراح فقط (قراءة فقط من قاعدة البيانات)
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
      create: {
        userId,
        windowStart: new Date(now),
        count: 0,
        totalCount: 0,
      },
    });
  }
  return usage;
}

// GET — حالة المستخدم: كم رسالة بقيت ومتى تُفتح النافذة من جديد
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return jsonError("Sign in to use Mathora.", "signin_required", 401);
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
  examNumber: true,
  university: { select: { nameAr: true, name: true, slug: true } },
  specialty: { select: { nameAr: true, name: true, slug: true } },
} as const;

// كلمات عامة لا تفيد البحث (عربي/فرنسي/إنجليزي)
const STOP_WORDS = new Set(
  [
    "امتحان",
    "امتحانات",
    "موضوع",
    "مواضيع",
    "مسابقة",
    "مسابقات",
    "دكتوراه",
    "رياضيات",
    "رياضة",
    "جامعة",
    "جامعات",
    "الجامعة",
    "أريد",
    "اريد",
    "عطني",
    "عطيني",
    "ابحث",
    "ابحثي",
    "بحث",
    "عن",
    "في",
    "من",
    "على",
    "الى",
    "إلى",
    "هل",
    "عندك",
    "عندكم",
    "لديك",
    "لديكم",
    "وين",
    "اين",
    "أين",
    "كل",
    "جميع",
    "liste",
    "list",
    "exam",
    "exams",
    "sujet",
    "sujets",
    "concours",
    "doctorat",
    "phd",
    "math",
    "maths",
    "mathematics",
    "mathematiques",
    "mathématiques",
    "universite",
    "université",
    "university",
    "please",
    "show",
    "find",
    "give",
    "me",
    "des",
    "les",
    "une",
    "un",
    "la",
    "le",
    "de",
    "du",
    "the",
    "for",
    "and",
    "or",
    "with",
    "topic",
    "topics",
  ].map((w) => w.toLowerCase()),
);

// مرادفات شائعة للمدن/الجامعات الجزائرية → كلمات بحث لاتينية/عربية
const ALIASES: Record<string, string[]> = {
  عنابة: ["annaba", "عنابة", "badji", "mokhtar"],
  annaba: ["annaba", "عنابة"],
  البليدة: ["blida", "البليدة", "بليدة"],
  بليدة: ["blida", "البليدة", "بليدة"],
  blida: ["blida", "البليدة"],
  الجزائر: ["alger", "الجزائر", "usthb", "bab"],
  alger: ["alger", "الجزائر", "usthb"],
  usthb: ["usthb", "boumediene", "boumediène", "houari", "باب الزوار"],
  "باب الزوار": ["usthb", "boumediene", "باب"],
  قسنطينة: ["constantine", "قسنطينة", "mentouri"],
  constantine: ["constantine", "قسنطينة"],
  وهران: ["oran", "وهران", "usto"],
  oran: ["oran", "وهران"],
  usto: ["usto", "oran"],
  تلمسان: ["tlemcen", "تلمسان"],
  tlemcen: ["tlemcen", "تلمسان"],
  سطيف: ["setif", "sétif", "سطيف"],
  setif: ["setif", "sétif", "سطيف"],
  sétif: ["setif", "sétif", "سطيف"],
  بجاية: ["bejaia", "béjaia", "béjaïa", "بجاية"],
  bejaia: ["bejaia", "béjaïa", "بجاية"],
  باتنة: ["batna", "باتنة"],
  batna: ["batna", "باتنة"],
  بسكرة: ["biskra", "بسكرة"],
  biskra: ["biskra", "بسكرة"],
  ورقلة: ["ouargla", "ورقلة"],
  ouargla: ["ouargla", "ورقلة"],
  الأغواط: ["laghouat", "الأغواط", "اغواط"],
  laghouat: ["laghouat", "الأغواط"],
  تيارت: ["tiaret", "تيارت"],
  tiaret: ["tiaret", "تيارت"],
  سكيكدة: ["skikda", "سكيكدة"],
  skikda: ["skikda", "سكيكدة"],
  جيجل: ["jijel", "جيجل"],
  jijel: ["jijel", "جيجل"],
  مستغانم: ["mostaganem", "مستغانم"],
  mostaganem: ["mostaganem", "مستغانم"],
  الشلف: ["chlef", "الشلف"],
  chlef: ["chlef", "الشلف"],
  المدية: ["medea", "médéa", "المدية"],
  medea: ["medea", "médéa", "المدية"],
  بومرداس: ["boumerdes", "boumerdès", "بومرداس"],
  boumerdes: ["boumerdes", "بومرداس"],
  تيزي: ["tizi", "ouzou", "تيزي"],
  ouzou: ["tizi", "ouzou", "تيزي"],
  "تيزي وزو": ["tizi", "ouzou", "تيزي"],
  ensm: ["ensm", "école", "mathématiques"],
  تحليل: ["analyse", "analysis", "تحليل"],
  analyse: ["analyse", "analysis", "تحليل"],
  جبر: ["algebre", "algèbre", "algebra", "جبر"],
  algebre: ["algebre", "algèbre", "جبر"],
  احتمالات: ["probabil", "احتمال"],
  probability: ["probabil", "احتمال"],
  إحصاء: ["statist", "إحصاء", "احصاء"],
  statistics: ["statist", "إحصاء"],
  معادلات: ["equation", "équations", "pde", "ode", "معادلات"],
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[_\-]+/g, " ")
    .trim();
}

function expandTokens(raw: string): string[] {
  const base = raw
    .split(/[\s،,؟?!.؛;:()\[\]"'«»/\\|+]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  const out = new Set<string>();
  for (const t of base) {
    const n = normalize(t);
    if (!n || STOP_WORDS.has(n) || STOP_WORDS.has(t.toLowerCase())) continue;
    // أرقام السنوات تُعالج منفصلة
    if (/^(19|20)\d{2}$/.test(t)) continue;
    out.add(t);
    out.add(n);
    const aliasKey = Object.keys(ALIASES).find(
      (k) => normalize(k) === n || k.toLowerCase() === t.toLowerCase(),
    );
    if (aliasKey) {
      for (const a of ALIASES[aliasKey]) out.add(a);
    }
    // مطابقة جزئية للمفاتيح (مثل "عناب" داخل النص)
    for (const [k, vals] of Object.entries(ALIASES)) {
      if (n.includes(normalize(k)) || normalize(k).includes(n)) {
        for (const a of vals) out.add(a);
      }
    }
  }
  return [...out].slice(0, 24);
}

function haystackOf(parts: Array<string | null | undefined>): string {
  return normalize(parts.filter(Boolean).join(" "));
}

function scoreMatch(hay: string, tokens: string[]): number {
  let score = 0;
  for (const t of tokens) {
    const n = normalize(t);
    if (!n) continue;
    if (hay.includes(n)) score += n.length >= 4 ? 3 : 2;
  }
  return score;
}

// بحث للقراءة فقط في قاعدة بيانات الموقع — لا حذف ولا تعديل أبدًا
// يعيد نصًا جاهزًا بروابط markdown مباشرة للامتحانات
async function searchSite(question: string): Promise<string> {
  const q = question.slice(0, 300);
  const tokens = expandTokens(q);
  const yearMatch = q.match(/\b((?:19|20)\d{2})\b/);
  const year = yearMatch ? Number(yearMatch[1]) : null;
  const examNumMatch = q.match(
    /(?:exam(?:en)?|sujet|موضوع|امتحان)\s*#?\s*(\d{1,2})\b|\b(\d{1,2})\s*(?:(?:ème|e|th)\s*)?(?:exam|sujet)?/i,
  );
  const examNumber =
    examNumMatch && (examNumMatch[1] || examNumMatch[2])
      ? Number(examNumMatch[1] || examNumMatch[2])
      : null;

  const [universities, specialties] = await Promise.all([
    prisma.university
      .findMany({
        select: {
          id: true,
          name: true,
          nameAr: true,
          slug: true,
          city: true,
        },
      })
      .catch(() => []),
    prisma.specialty
      .findMany({
        select: { id: true, name: true, nameAr: true, slug: true },
      })
      .catch(() => []),
  ]);

  // رتّب الجامعات/التخصصات حسب تطابق الكلمات
  const uniScored = universities
    .map((u) => ({
      u,
      score: scoreMatch(haystackOf([u.name, u.nameAr, u.slug, u.city]), tokens),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const specScored = specialties
    .map((s) => ({
      s,
      score: scoreMatch(haystackOf([s.name, s.nameAr, s.slug]), tokens),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const universityIds = uniScored.slice(0, 4).map((x) => x.u.id);
  const specialtyIds = specScored.slice(0, 4).map((x) => x.s.id);
  const bestUni = uniScored[0]?.u ?? null;
  const bestSpec = specScored[0]?.s ?? null;

  type TopicRow = {
    slug: string;
    title: string;
    year: number;
    examNumber: number | null;
    university: { nameAr: string; name: string; slug: string };
    specialty: { nameAr: string; name: string; slug: string };
  };

  let topics: TopicRow[] = [];

  // 1) بحث مفلتر بالجامعة و/أو التخصص و/أو السنة
  if (universityIds.length || specialtyIds.length || year) {
    const and: Record<string, unknown>[] = [{ status: "published" }];
    if (universityIds.length) and.push({ universityId: { in: universityIds } });
    if (specialtyIds.length) and.push({ specialtyId: { in: specialtyIds } });
    if (year) and.push({ year });
    if (examNumber && examNumber > 0 && examNumber < 30) {
      and.push({ examNumber });
    }

    topics = await prisma.topic
      .findMany({
        where: { AND: and },
        orderBy: [{ year: "desc" }, { examNumber: "asc" }],
        take: 12,
        select: TOPIC_SELECT,
      })
      .catch(() => []);

    // إن ضيّقنا زيادة (جامعة+تخصص) ولم نجد — أرخِ التخصص
    if (topics.length === 0 && universityIds.length && specialtyIds.length) {
      topics = await prisma.topic
        .findMany({
          where: {
            status: "published",
            universityId: { in: universityIds },
            ...(year ? { year } : {}),
          },
          orderBy: [{ year: "desc" }, { examNumber: "asc" }],
          take: 12,
          select: TOPIC_SELECT,
        })
        .catch(() => []);
    }
  }

  // 2) بحث في العنوان/الـ slug بالكلمات المتبقية
  if (topics.length === 0 && tokens.length > 0) {
    const or = tokens.flatMap((t) => [
      { title: { contains: t, mode: "insensitive" as const } },
      { slug: { contains: t.toLowerCase() } },
    ]);
    topics = await prisma.topic
      .findMany({
        where: {
          status: "published",
          OR: or,
          ...(year ? { year } : {}),
        },
        orderBy: { year: "desc" },
        take: 10,
        select: TOPIC_SELECT,
      })
      .catch(() => []);
  }

  // 3) آخر المواضيع المنشورة كاحتياط خفيف إذا ذُكرت سنة فقط
  if (topics.length === 0 && year) {
    topics = await prisma.topic
      .findMany({
        where: { status: "published", year },
        orderBy: [{ examNumber: "asc" }],
        take: 8,
        select: TOPIC_SELECT,
      })
      .catch(() => []);
  }

  const lines: string[] = [];

  if (topics.length > 0) {
    lines.push(
      `FOUND ${topics.length} EXAM(S) — copy these EXACT markdown links:`,
    );
    for (const t of topics) {
      const url = `${SITE}/topics/${t.slug}`;
      const label = `${t.title} — ${t.university.nameAr} ${t.year}${t.examNumber ? ` (#${t.examNumber})` : ""} · ${t.specialty.nameAr}`;
      lines.push(`- [${label}](${url})`);
      // رابط خام إضافي لضمان ظهوره حتى لو تجاهل النموذج تنسيق markdown
      lines.push(`  Direct URL: ${url}`);
    }
  } else {
    lines.push("NO_EXAMS_FOUND");
  }

  // روابط تصفّح مفيدة (بحث/جامعة)
  if (bestUni) {
    const params = new URLSearchParams();
    params.set("university", bestUni.slug);
    if (year) params.set("year", String(year));
    if (bestSpec) params.set("specialty", bestSpec.slug);
    lines.push(
      `BROWSE: [${bestUni.nameAr}${year ? ` ${year}` : ""}](${SITE}/search?${params.toString()})`,
    );
    lines.push(
      `UNIVERSITY PAGE: [${bestUni.nameAr}](${SITE}/universities/${bestUni.slug})`,
    );
  } else if (year) {
    lines.push(`BROWSE YEAR: [مواضيع ${year}](${SITE}/search?year=${year})`);
  } else {
    lines.push(`BROWSE ALL: [كل المواضيع](${SITE}/topics)`);
    lines.push(`SEARCH PAGE: [بحث متقدم](${SITE}/search)`);
  }

  return lines.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    // 1) للأعضاء فقط
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return jsonError("Sign in to use Mathora.", "signin_required", 401);
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
    try {
      await prisma.assistantUsage.update({
        where: { userId },
        data: {
          count: { increment: 1 },
          totalCount: { increment: 1 },
        },
      });
    } catch {
      // totalCount قد لا يكون في الـ schema بعد — نسجّل العدّاد فقط
      await prisma.assistantUsage.update({
        where: { userId },
        data: { count: { increment: 1 } },
      });
    }
    const remaining = Math.max(0, LIMIT - usage.count - 1);

    // 5) بحث قراءة-فقط في قاعدة البيانات ثم حقن النتائج للنموذج
    const question = messages[messages.length - 1].content;
    const searchResults = await searchSite(question).catch(() => "");
    const firstName =
      (session?.user?.name ?? "").trim().split(/\s+/)[0] || "friend";

    const systemPrompt = [
      `You are Mathora 🤖 — the built-in site assistant of DocMath DZ (${SITE}), a free archive of Algerian mathematics PhD entrance exams.`,
      `The user's name is "${firstName}". Address them by name naturally.`,
      "Personality: witty and playfully teasing but always kind, motivating, smart, and human-like. Use emojis naturally 😄 but don't overdo it.",
      "Language: reply in the user's language (usually Arabic). Keep product/AI terms in English (Mathora, link, search...).",
      "Your ONLY abilities: (1) search the site database — results are provided below — and share DIRECT clickable exam links, (2) suggest exercises and topics, (3) give study and exam-preparation advice when asked.",
      "You are strictly READ-ONLY. You can never delete, edit, create, or change anything on the site. If asked to, refuse with a light joke.",
      "CRITICAL — LINKS:",
      "- When the block below contains FOUND exams, you MUST paste the exact markdown links [title](url) from that block into your answer.",
      "- Also paste the raw Direct URL lines so the user can open them immediately.",
      "- NEVER invent, guess, rewrite, shorten, or change a slug/URL. Copy/paste only.",
      "- Prefer listing 3–8 best matches with one short intro line, then the links.",
      "- If the block says NO_EXAMS_FOUND, say you couldn't find matching exams and share the BROWSE / SEARCH links from the block. Suggest rephrasing with university + year (e.g. عنابة 2023).",
      "Formatting: plain short text with markdown links only — no headings, no tables, no code blocks. Keep answers concise.",
      "Never mention the underlying AI model or provider (Kimi, DeepSeek, Phi, Azure…). You are simply Mathora.",
      "Never show hidden reasoning or chain-of-thought — output the final answer only.",
      "=== SITE DATABASE SEARCH RESULTS (read-only, authoritative) ===",
      searchResults || "NO_EXAMS_FOUND",
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
        temperature: 0.4,
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
