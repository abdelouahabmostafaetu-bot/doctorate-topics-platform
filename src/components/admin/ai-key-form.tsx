"use client";

// نموذج إضافة مفتاح ذكاء اصطناعي مع جلب النماذج المتاحة تلقائيًا:
// ضع الرابط والمفتاح ← 📡 جلب النماذج ← اختر من القائمة (👁 = يدعم الصور)

import { useState } from "react";
import { AI_TASKS } from "@/lib/ai/tasks";
import { addAiKeyAction } from "@/app/admin/ai/actions";

type ModelInfo = { id: string; vision: boolean };

export function AiKeyForm() {
  const [baseUrl, setBaseUrl] = useState("https://api.mistral.ai/v1");
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [manual, setManual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchModels() {
    setError("");
    if (!baseUrl.trim() || !apiKey.trim()) {
      setError("أدخل رابط الخدمة والمفتاح أولًا ثم اضغط جلب النماذج");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl, apiKey }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; models?: ModelInfo[] };
      if (!data.ok || !data.models || data.models.length === 0) {
        setError(data.error || "فشل جلب النماذج — تحقق من الرابط والمفتاح");
      } else {
        setModels(data.models);
        setManual(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const showSelect = models.length > 0 && !manual;

  return (
    <form action={addAiKeyAction} className="rounded-xl border p-4">
      <h3 className="text-sm font-bold">➕ إضافة مفتاح جديد (يُفحص تلقائيًا قبل الحفظ)</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs">
          <span className="font-bold">اسم وصفي</span>
          <input name="name" required placeholder="مثال: Mistral مجاني" className="w-full rounded-lg border px-3 py-2" />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-bold">المهمة</span>
          <select name="task" defaultValue="general" className="w-full rounded-lg border px-3 py-2">
            {AI_TASKS.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-bold">رابط الخدمة (Base URL)</span>
          <input
            name="baseUrl"
            required
            dir="ltr"
            list="ai-base-urls"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 font-mono"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-bold">مفتاح API</span>
          <input
            name="apiKey"
            required
            dir="ltr"
            type="password"
            autoComplete="off"
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 font-mono"
          />
        </label>
        <div className="space-y-1 text-xs sm:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold">النموذج</span>
            <button
              type="button"
              onClick={fetchModels}
              disabled={loading}
              className="rounded-lg border px-3 py-1 text-[11px] font-bold hover:bg-secondary disabled:opacity-60"
            >
              {loading ? "⏳ جارٍ جلب النماذج…" : "📡 جلب النماذج المتاحة"}
            </button>
            {models.length > 0 ? (
              <button
                type="button"
                onClick={() => setManual(!manual)}
                className="rounded-lg border px-3 py-1 text-[11px] hover:bg-secondary"
              >
                {manual ? "↩️ الرجوع للقائمة (" + models.length + ")" : "✍️ إدخال يدوي"}
              </button>
            ) : null}
          </div>
          {showSelect ? (
            <select name="model" required className="w-full rounded-lg border px-3 py-2 font-mono" dir="ltr">
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.vision ? m.id + " 👁 يدعم الصور" : m.id}
                </option>
              ))}
            </select>
          ) : (
            <input
              name="model"
              required
              dir="ltr"
              list="ai-models"
              placeholder="mistral-large-latest"
              className="w-full rounded-lg border px-3 py-2 font-mono"
            />
          )}
          <p className="text-[11px] text-muted-foreground">
            ضع الرابط والمفتاح ثم اضغط 📡 لتظهر قائمة النماذج وتختار منها — النماذج المعلّمة 👁 تصلح لمهمة قراءة الصور وPDF
          </p>
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded-lg border border-red-300 bg-red-50 p-2 text-xs text-red-700" dir="ltr">⚠️ {error}</div>
      ) : null}

      <datalist id="ai-base-urls">
        <option value="https://api.mistral.ai/v1" />
        <option value="https://api.groq.com/openai/v1" />
        <option value="https://api.cerebras.ai/v1" />
        <option value="https://openrouter.ai/api/v1" />
        <option value="https://api.morphllm.com/v1" />
        <option value="https://router.bynara.id/v1" />
      </datalist>
      <datalist id="ai-models">
        <option value="mistral-large-latest" />
        <option value="mistral-medium-latest" />
        <option value="mistral-small-latest" />
        <option value="llama-3.3-70b-versatile" />
        <option value="auto" />
      </datalist>

      <button type="submit" className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
        ➕ إضافة وفحص المفتاح
      </button>
    </form>
  );
}
