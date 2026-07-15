import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// عدّادات صفحة القهوة: زيارة الصفحة ونسخ حساب CCP
const KEYS: Record<string, string> = {
  view: "coffee_view",
  copy: "coffee_copy",
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as {
      type?: string;
    } | null;
    const key = KEYS[body?.type ?? ""];
    if (!key) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    await prisma.counter.upsert({
      where: { key },
      update: { value: { increment: 1 } },
      create: { key, value: 1 },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
