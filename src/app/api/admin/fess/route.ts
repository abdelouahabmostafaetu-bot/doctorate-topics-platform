import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  auditFessPdfs,
  getFessAdminOverview,
  startFessScheduler,
} from "@/lib/fess";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function allowed() {
  return (await auth())?.user?.role === "SUPER_ADMIN";
}

export async function GET() {
  if (!(await allowed())) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
  }
  const overview = await getFessAdminOverview();
  return NextResponse.json(overview, {
    status: overview.available ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  if (!(await allowed())) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as {
    action?: string;
    id?: string;
    query?: string;
    limit?: number;
  } | null;

  try {
    if (body?.action === "audit") {
      const report = await auditFessPdfs(
        String(body.query || "").slice(0, 180),
        Math.min(20, Math.max(1, Number(body.limit) || 12)),
      );
      return NextResponse.json(report, {
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (body?.action === "start" && body.id) {
      const result = await startFessScheduler(body.id);
      return NextResponse.json({ ok: true, result });
    }
    return NextResponse.json({ error: "إجراء غير صالح." }, { status: 400 });
  } catch (error) {
    console.error("[fess] admin action failed:", error);
    return NextResponse.json(
      { error: "فشل تنفيذ العملية في Fess." },
      { status: 502 },
    );
  }
}