"use client";

// ✨ زر التحسين الذكي (للمديرين فقط) — يحسّن كود LaTeX للموضوع الحالي
// الوضع الافتراضي: مفاتيح لوحة /admin/ai — وعند أي خلل أو فشل اتصال تظهر
// واجهة أنيقة لإدخال مفتاح يدوي مع جلب النماذج المجانية المتاحة تلقائيًا
import { useState } from "react";

type ModelItem = { id: string; vision: boolean };
type PolishResp = { ok?: boolean; error?: string; reviewUrl?: string };

export function TopicAiPolish({ topicId }: { topicId: string }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"ask" | "manual">("ask");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const [baseUrl, setBaseUrl] = useState("https://api.mistral.ai/v1");
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState<ModelItem[]>([]);
  const [model, setModel] = useState("");
  const [fetching, setFetching] = useState(false);

  function close() {
    setOpen(false);
    setView("ask");
    setWorking(false);
    setError("");
  }

  async function run(payload: Record<string, string>) {
    setWorking(true);
    setError("");
    try {
      const res = await fetch("/api/ai/polish-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, ...payload }),
      });
      const raw = await res.text();
      let data: PolishResp;
      try {
        data = JSON.parse(raw) as PolishResp;
      } catch {
        throw new Error(
          "رد غير متوقع من الخادم (HTTP " + res.status + ") — أعد المحاولة",
        );
      }
      if (!data.ok || !data.reviewUrl) {
        throw new Error(data.error || "فشل التحسين — أعد المحاولة");
      }
      // نجاح — ننتقل لصفحة المراجعة لاعتماد النتيجة
      window.location.href = data.reviewUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setView("manual"); // عند الخلل: واجهة المفتاح اليدوي البسيطة
      setWorking(false);
    }
  }

  async function fetchModels() {
    if (!baseUrl.trim() || !apiKey.trim()) {
      setError("أدخل رابط الخدمة والمفتاح أولًا");
      return;
    }
    setFetching(true);
    setError("");
    setModels([]);
    setModel("");
    try {
      const res = await fetch("/api/ai/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl, apiKey }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        models?: ModelItem[];
      };
      if (!data.ok || !data.models || data.models.length === 0) {
        throw new Error(
          data.error || "لم يتم العثور على نماذج مجانية بهذا المفتاح",
        );
      }
      setModels(data.models);
      setModel(data.models[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setFetching(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border px-3 py-2 text-xs focus:border-violet-500 focus:outline-none";

  return (
    <>
      <button
        type="button"
        title="تحسين كود LaTeX لهذا الموضوع بالذكاء الاصطناعي"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-full border border-violet-400/50 px-3 py-1 text-xs font-medium text-violet-600 transition hover:bg-violet-600 hover:text-white"
      >
        ✨ تحسين ذكي
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-background p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">✨ التحسين الذكي لكود LaTeX</h3>
              <button
                type="button"
                onClick={close}
                disabled={working}
                className="px-2 text-sm text-muted-foreground transition hover:text-destructive disabled:opacity-40"
              >
                ✕
              </button>
            </div>

            {error ? (
              <div className="mt-3 rounded-lg border border-red-300 bg-red-50 p-2 text-[11px] leading-5 text-red-700">
                ⚠️ {error}
              </div>
            ) : null}

            {working ? (
              <div className="mt-6 pb-4 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                <p className="mt-3 text-xs text-muted-foreground">
                  جارٍ تحسين التمارين… قد يستغرق دقائق حسب حجم الموضوع — لا تغلق
                  الصفحة
                </p>
              </div>
            ) : view === "ask" ? (
              <div className="mt-4 space-y-2">
                <p className="text-xs leading-6 text-muted-foreground">
                  كيف تريد تنفيذ التحسين؟ ستظهر النتيجة في صفحة المراجعة
                  لاعتمادها قبل النشر.
                </p>
                <button
                  type="button"
                  onClick={() => run({})}
                  className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-violet-700"
                >
                  ▶️ استمرار — استخدام مفاتيح لوحة الذكاء الاصطناعي
                </button>
                <button
                  type="button"
                  onClick={() => setView("manual")}
                  className="w-full rounded-lg border px-4 py-2.5 text-xs font-medium transition hover:border-violet-500 hover:text-violet-600"
                >
                  🔑 إدخال مفتاح API يدويًا
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <label className="block space-y-1 text-xs">
                  <span className="font-bold">رابط الخدمة (Base URL)</span>
                  <input
                    dir="ltr"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    list="polish-base-urls"
                    className={inputClass}
                  />
                  <datalist id="polish-base-urls">
                    <option value="https://api.mistral.ai/v1" />
                    <option value="https://api.groq.com/openai/v1" />
                    <option value="https://api.cerebras.ai/v1" />
                    <option value="https://openrouter.ai/api/v1" />
                    <option value="https://generativelanguage.googleapis.com/v1beta/openai" />
                  </datalist>
                </label>
                <label className="block space-y-1 text-xs">
                  <span className="font-bold">مفتاح API</span>
                  <input
                    dir="ltr"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className={inputClass}
                  />
                </label>

                <button
                  type="button"
                  onClick={fetchModels}
                  disabled={fetching}
                  className="w-full rounded-lg border px-4 py-2 text-xs font-medium transition hover:border-violet-500 hover:text-violet-600 disabled:opacity-50"
                >
                  {fetching
                    ? "📡 جارٍ جلب النماذج…"
                    : "📡 جلب النماذج المجانية المتاحة"}
                </button>

                {models.length > 0 && (
                  <label className="block space-y-1 text-xs">
                    <span className="font-bold">
                      النموذج ({models.length} متاح)
                    </span>
                    <select
                      dir="ltr"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className={inputClass}
                    >
                      {models.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.id}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <button
                  type="button"
                  disabled={!model || !apiKey.trim() || !baseUrl.trim()}
                  onClick={() => run({ baseUrl, apiKey, model })}
                  className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-violet-700 disabled:opacity-50"
                >
                  ✨ ابدأ التحسين بهذا المفتاح
                </button>

                <button
                  type="button"
                  onClick={() => setView("ask")}
                  className="w-full text-center text-[11px] text-muted-foreground transition hover:text-violet-600"
                >
                  → رجوع
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
