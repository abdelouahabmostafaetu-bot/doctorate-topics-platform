// جلب النماذج المتاحة لمفتاح API معين (للمديرين فقط)
// يستدعي نقطة GET /models القياسية في الخدمات المتوافقة مع صيغة OpenAI

import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

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

    const data = (await res.json()) as {
      data?: Array<{ id?: string; capabilities?: { vision?: boolean } }>;
    };
    const list = Array.isArray(data.data) ? data.data : [];
    const seen = new Set<string>();
    const models: Array<{ id: string; vision: boolean }> = [];
    for (const m of list) {
      const id = String(m?.id ?? "").trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      models.push({ id, vision: Boolean(m?.capabilities?.vision) });
    }
    models.sort((a, b) => a.id.localeCompare(b.id));

    if (models.length === 0) {
      return NextResponse.json({ ok: false, error: "الخدمة لم تُرجع أي نموذج — تحقق من المفتاح" });
    }
    return NextResponse.json({ ok: true, models });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
