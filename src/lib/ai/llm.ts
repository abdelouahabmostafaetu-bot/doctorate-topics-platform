// طبقة الذكاء الاصطناعي الموحدة — تدعم أي خدمة متوافقة مع صيغة OpenAI
// ترتيب اختيار المفتاح لكل مهمة:
// 1) مفتاح مفعّل مخصص للمهمة من قاعدة البيانات (صفحة /admin/ai)
// 2) مفتاح مفعّل بمهمة "عام"
// 3) متغيرات البيئة MISTRAL_API_KEY / MORPH_API_KEY (توافق مع النسخ القديمة)
// مع مباعدة 1.1 ثانية بين الطلبات + إعادة محاولة عند 429/5xx

import { prisma } from "@/lib/prisma";
import type { AiTaskId } from "./tasks";

export type AiProvider = {
  baseUrl: string;
  model: string;
  apiKey: string;
  source: string; // مصدر الإعداد (اسم المفتاح أو متغيرات البيئة)
};

function normalizeBase(u: string): string {
  return u.trim().replace(/\/+$/, "");
}

const ENV_KEY = process.env.MISTRAL_API_KEY || process.env.MORPH_API_KEY || "";
const ENV_BASE =
  process.env.POLISH_BASE_URL ||
  (process.env.MISTRAL_API_KEY
    ? "https://api.mistral.ai/v1"
    : "https://api.morphllm.com/v1");
const ENV_MODEL =
  process.env.POLISH_MODEL ||
  (process.env.MISTRAL_API_KEY ? "mistral-large-latest" : "auto");

/** المفتاح الاحتياطي من متغيرات البيئة (إن وُجد) */
export function envProvider(): AiProvider | null {
  if (!ENV_KEY) return null;
  return {
    baseUrl: normalizeBase(ENV_BASE),
    model: ENV_MODEL,
    apiKey: ENV_KEY,
    source: "متغيرات البيئة (Vercel)",
  };
}

/** يحدد المزود المناسب لمهمة معينة */
export async function resolveProvider(task: AiTaskId): Promise<AiProvider | null> {
  try {
    const rows = await prisma.aiKey.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
    });
    const row =
      rows.find((r) => r.task === task) ??
      rows.find((r) => r.task === "general");
    if (row) {
      return {
        baseUrl: normalizeBase(row.baseUrl),
        model: row.model,
        apiKey: row.apiKey,
        source: row.name,
      };
    }
  } catch {
    // المجموعة غير موجودة بعد أو خطأ اتصال — نستخدم متغيرات البيئة
  }
  return envProvider();
}

const MIN_GAP_MS = 1100; // حد Mistral المجاني: طلب واحد/الثانية
const MAX_ATTEMPTS = 4;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

let lastCallAt = 0;
let chain: Promise<unknown> = Promise.resolve();

type ChatContent = string | Array<Record<string, unknown>>;

async function chatOnce(p: AiProvider, content: ChatContent): Promise<string> {
  const res = await fetch(p.baseUrl + "/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + p.apiKey,
    },
    body: JSON.stringify({
      model: p.model,
      temperature: 0.1,
      messages: [ { role: "user", content } ],
    }),
  });
  if (!res.ok) {
    const err = new Error(
      "AI HTTP " + res.status + " (" + p.source + "): " + (await res.text()).slice(0, 200),
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const out = data.choices?.[0]?.message?.content;
  if (!out) throw new Error("رد فارغ من النموذج");
  return out.trim();
}

/** طابور + مباعدة + إعادة محاولة لأي طلب ذكاء اصطناعي */
async function withPacing<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const wait = lastCallAt + MIN_GAP_MS - Date.now();
      if (wait > 0) await sleep(wait);
      lastCallAt = Date.now();
      try {
        return await fn();
      } catch (e) {
        lastError = e;
        const status = (e as { status?: number }).status ?? 0;
        const retryable = status === 429 || status >= 500;
        if (!retryable || attempt === MAX_ATTEMPTS) throw e;
        await sleep(1000 * Math.pow(2, attempt)); // 2ث ← 4ث ← 8ث
      }
    }
    throw lastError;
  });
  chain = run.catch(() => undefined);
  return run as Promise<T>;
}

/** طلب نصي عادي — مرّر اسم المهمة ليُستخدم المفتاح المخصص لها */
export async function askLLM(prompt: string, task: AiTaskId = "general"): Promise<string> {
  const p = await resolveProvider(task);
  if (!p) {
    throw new Error(
      "لا يوجد مفتاح ذكاء اصطناعي — أضف مفتاحًا من لوحة الإدارة ← الذكاء الاصطناعي",
    );
  }
  return withPacing(() => chatOnce(p, prompt));
}

/** طلب نصي بمزود يدوي محدد — يتجاوز مفاتيح قاعدة البيانات (لواجهة التحسين اليدوية) */
export async function askProvider(
  p: { baseUrl: string; model: string; apiKey: string; source?: string },
  prompt: string,
): Promise<string> {
  const prov: AiProvider = {
    baseUrl: normalizeBase(p.baseUrl),
    model: p.model,
    apiKey: p.apiKey,
    source: p.source ?? "مفتاح يدوي",
  };
  return withPacing(() => chatOnce(prov, prompt));
}

/** طلب برؤية صور (لمهمة القراءة) — الصور كـ data URLs */
export async function askVision(prompt: string, imageDataUrls: string[]): Promise<string> {
  const p = await resolveProvider("vision");
  if (!p) {
    throw new Error(
      "لا يوجد مفتاح لمهمة قراءة الصور — أضف مفتاحًا بمهمة (قراءة الصور وPDF) من صفحة /admin/ai",
    );
  }
  const content: Array<Record<string, unknown>> = [ { type: "text", text: prompt } ];
  for (const url of imageDataUrls) {
    content.push({ type: "image_url", image_url: { url } });
  }
  return withPacing(() => chatOnce(p, content));
}

/** استخراج نص ملف PDF — متوفر فقط عبر خدمة Mistral OCR */
export async function ocrPdf(pdfDataUrl: string): Promise<string> {
  const p = await resolveProvider("vision");
  if (!p) {
    throw new Error("لا يوجد مفتاح لمهمة القراءة — أضف مفتاحًا من صفحة /admin/ai");
  }
  if (!p.baseUrl.includes("mistral.ai")) {
    throw new Error(
      "قراءة PDF تتطلب مفتاح Mistral (خدمة OCR). أضف مفتاح Mistral لمهمة القراءة، أو ارفع صورًا بدل PDF",
    );
  }
  const doOcr = async () => {
    const res = await fetch(p.baseUrl + "/ocr", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + p.apiKey,
      },
      body: JSON.stringify({
        model: "mistral-ocr-latest",
        document: { type: "document_url", document_url: pdfDataUrl },
      }),
    });
    if (!res.ok) {
      const err = new Error(
        "OCR HTTP " + res.status + ": " + (await res.text()).slice(0, 200),
      ) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    const data = (await res.json()) as { pages?: Array<{ markdown?: string }> };
    const text = (data.pages ?? [])
      .map((pg) => pg.markdown ?? "")
      .join("\n\n")
      .trim();
    if (!text) throw new Error("لم يستخرج OCR أي نص من الملف");
    return text;
  };
  return withPacing(doOcr);
}

/** فحص سريع لمفتاح: يرسل طلبًا صغيرًا جدًا ويتأكد من الرد */
export async function testProvider(p: {
  baseUrl: string;
  model: string;
  apiKey: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(normalizeBase(p.baseUrl) + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + p.apiKey,
      },
      body: JSON.stringify({
        model: p.model,
        max_tokens: 10,
        messages: [ { role: "user", content: "Reply with exactly: OK" } ],
      }),
    });
    if (!res.ok) {
      return {
        ok: false,
        error: "HTTP " + res.status + ": " + (await res.text()).slice(0, 160),
      };
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const out = data.choices?.[0]?.message?.content;
    if (!out) return { ok: false, error: "رد فارغ من النموذج" };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
