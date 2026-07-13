// جلب النماذج المتاحة لمفتاح API معين (للمديرين فقط)
// يستدعي نقطة GET /models القياسية ويصفّي النتائج:
// - النماذج المجانية فقط (إن كانت الخدمة تعرض الأسعار مثل OpenRouter)
// - نماذج المحادثة فقط (تُستبعد نماذج embeddings/OCR/الصوت/التصنيف...)

import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

type RawModel = {
  id?: string;
  capabilities?: { vision?: boolean; completion_chat?: boolean };
  pricing?: {
    prompt?: string | number;
    completion?: string | number;
    request?: string | number;
    image?: string | number;
  };
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
  };
};

// نماذج متخصصة لا تصلح للمهام النصية — تُستبعد دائمًا
const SKIP_ID = /(embed|moderat|rerank|ocr|tts|whisper|transcrib|audio|voxtral|classif|guard)/i;

function toCost(v: unknown): number {
  const n = parseFloat(String(v ?? "0"));
  return Number.isFinite(n) ? n : 0;
}

function isFree(m: RawModel): boolean {
  const p = m.pricing;
  // خدمات لا تعرض الأسعار (Mistral، Groq...) — مفتاحك يغطيها فتُعتبر متاحة
  if (!p) return true;
  return (
    toCost(p.prompt) === 0 &&
    toCost(p.completion) === 0 &&
    toCost(p.request) === 0 &&
    toCost(p.image) === 0
  );
}

function isChat(m: RawModel): boolean {
  if (m.capabilities && m.capabilities.completion_chat === false) return false;
  const out = m.architecture?.output_modalities;
  if (Array.isArray(out) && out.length > 0 && !out.includes("text")) return false;
  return true;
}

function isVision(m: RawModel): boolean {
  if (m.capabilities?.vision) return true;
  const inp = m.architecture?.input_modalities;
  if (Array.isArray(inp) && inp.includes("image")) return true;
  return String(m.architecture?.modality ?? "").includes("image");
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const role = session?.user?.role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ ok: false, error: "غير مصرح" });
    }

    const body = (await req.json()) as { baseUrl?: string; apiKey?: string };
    const baseUrl = String(body.baseUrl ?? "").trim().replace(/\/+$/, "");
    const apiKey = String(body.apiKey ?? "").trim();
    if (!/^https:\/\//.test(baseUrl) || !apiKey) {
      return NextResponse.json({ ok: false, error: "أدخل رابط الخدمة والمفتاح أولًا" });
    }

    const res = await fetch(baseUrl + "/models", {
      headers: { Authorization: "Bearer " + apiKey },
    });
    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        error: "HTTP " + res.status + ": " + (await res.text()).slice(0, 160),
      });
    }

    const data = (await res.json()) as { data?: RawModel[] };
    const list = Array.isArray(data.data) ? data.data : [];
    const seen = new Set<string>();
    const models: Array<{ id: string; vision: boolean }> = [];
    for (const m of list) {
      const id = String(m?.id ?? "").trim();
      if (!id || seen.has(id)) continue;
      if (SKIP_ID.test(id)) continue; // نموذج متخصص لا يصلح للمحادثة
      if (!isChat(m)) continue;
      if (!isFree(m)) continue; // مدفوع — يُستبعد
      seen.add(id);
      models.push({ id, vision: isVision(m) });
    }
    // النماذج التي تدعم الصور أولًا، ثم أبجديًا
    models.sort((a, b) => {
      if (a.vision !== b.vision) return a.vision ? -1 : 1;
      return a.id.localeCompare(b.id);
    });

    if (models.length === 0) {
      return NextResponse.json({
        ok: false,
        error: "لا توجد نماذج مجانية متاحة بهذا المفتاح — جرّب خدمة أخرى أو أدخل اسم النموذج يدويًا",
      });
    }
    return NextResponse.json({ ok: true, models });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
