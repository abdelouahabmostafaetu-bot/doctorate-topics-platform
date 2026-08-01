// تشخيص محرّك PDF — للإدارة فقط
// افتح https://www.docmathdz.dev/api/pdf/diag وأنت مسجّل كمسؤول لترى سبب فشل التحميل بالنص الصريح
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { pdfDiagnostics } from "@/lib/pdf/generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const report = await pdfDiagnostics();
  return NextResponse.json(report, {
    headers: { "Cache-Control": "no-store" },
  });
}
