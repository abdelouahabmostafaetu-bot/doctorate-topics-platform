// عميل بسيط لأي خدمة ذكاء اصطناعي متوافقة مع صيغة OpenAI (Mistral افتراضيًا)
// متغيرات البيئة: MISTRAL_API_KEY (أو MORPH_API_KEY) + POLISH_BASE_URL + POLISH_MODEL (اختيارية)
// يحترم حد Mistral المجاني (طلب واحد/الثانية): مباعدة بين الطلبات + إعادة محاولة عند 429

const API_KEY = process.env.MISTRAL_API_KEY || process.env.MORPH_API_KEY || "";

const BASE_URL =
  process.env.POLISH_BASE_URL ||
  (process.env.MISTRAL_API_KEY
    ? "https://api.mistral.ai/v1"
    : "https://api.morphllm.com/v1");

const MODEL =
  process.env.POLISH_MODEL ||
  (process.env.MISTRAL_API_KEY ? "mistral-large-latest" : "auto");

const MIN_GAP_MS = 1100; // مباعدة دنيا بين طلبين متتاليين
const MAX_ATTEMPTS = 4;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// طابور بسيط: كل الطلبات في نفس العملية تتباعد زمنيًا حتى لو استُدعيت بالتوازي
let lastCallAt = 0;
let chain: Promise<unknown> = Promise.resolve();

async function callOnce(prompt: string): Promise<string> {
  const res = await fetch(BASE_URL + "/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + API_KEY,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.1,
      messages: [ { role: "user", content: prompt } ],
    }),
  });
  if (!res.ok) {
    const err = new Error(
      "AI HTTP " + res.status + ": " + (await res.text()).slice(0, 200),
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

/** يرسل طلبًا للنموذج مع مباعدة وإعادة محاولة عند تجاوز الحد أو أعطال الخادم */
export async function askLLM(prompt: string): Promise<string> {
  if (!API_KEY) {
    throw new Error("أضف MISTRAL_API_KEY في متغيرات البيئة أولًا");
  }
  const run = chain.then(async () => {
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const wait = lastCallAt + MIN_GAP_MS - Date.now();
      if (wait > 0) await sleep(wait);
      lastCallAt = Date.now();
      try {
        return await callOnce(prompt);
      } catch (e) {
        lastError = e;
        const status = (e as { status?: number }).status ?? 0;
        const retryable = status === 429 || status >= 500;
        if (!retryable || attempt === MAX_ATTEMPTS) throw e;
        // تراجع متزايد: 2ث، 4ث، 8ث
        await sleep(1000 * Math.pow(2, attempt));
      }
    }
    throw lastError;
  });
  chain = run.catch(() => undefined);
  return run as Promise<string>;
}
