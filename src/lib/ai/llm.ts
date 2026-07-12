// عميل بسيط لأي خدمة ذكاء اصطناعي متوافقة مع صيغة OpenAI (Mistral افتراضيًا)
// متغيرات البيئة: MISTRAL_API_KEY (أو MORPH_API_KEY) + POLISH_BASE_URL + POLISH_MODEL (اختيارية)

const API_KEY = process.env.MISTRAL_API_KEY || process.env.MORPH_API_KEY || "";

const BASE_URL =
  process.env.POLISH_BASE_URL ||
  (process.env.MISTRAL_API_KEY
    ? "https://api.mistral.ai/v1"
    : "https://api.morphllm.com/v1");

const MODEL =
  process.env.POLISH_MODEL ||
  (process.env.MISTRAL_API_KEY ? "mistral-large-latest" : "auto");

/** يرسل طلبًا واحدًا للنموذج ويرجع النص */
export async function askLLM(prompt: string): Promise<string> {
  if (!API_KEY) {
    throw new Error("أضف MISTRAL_API_KEY في متغيرات البيئة أولًا");
  }
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
    throw new Error(
      "AI HTTP " + res.status + ": " + (await res.text()).slice(0, 200),
    );
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const out = data.choices?.[0]?.message?.content;
  if (!out) throw new Error("رد فارغ من النموذج");
  return out.trim();
}
