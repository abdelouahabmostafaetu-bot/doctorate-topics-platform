// فحص صحّي دوري للخدمات التلقائية (FR-705) — يستدعيه Vercel Cron كل 5 دقائق
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkMailHealth } from "@/lib/mail";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // لم يُعرّف سر بعد — لا نمنع الاستخدام محليًا
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;
  const querySecret = request.nextUrl.searchParams.get("secret");
  return querySecret === secret;
}

async function checkDatabase(): Promise<"operational" | "degraded" | "down"> {
  try {
    const start = Date.now();
    await prisma.$runCommandRaw({ ping: 1 });
    return Date.now() - start > 2000 ? "degraded" : "operational";
  } catch {
    return "down";
  }
}

function checkStorage(): "operational" | "degraded" | "down" {
  const configured =
    process.env.STORAGE_ENDPOINT &&
    process.env.STORAGE_ACCESS_KEY &&
    process.env.STORAGE_SECRET_KEY &&
    process.env.STORAGE_BUCKET;
  return configured ? "operational" : "down";
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [databaseState, emailState] = await Promise.all([
    checkDatabase(),
    checkMailHealth(),
  ]);
  const storageState = checkStorage();

  const results: Array<{ key: string; state: string }> = [
    { key: "database", state: databaseState },
    { key: "email", state: emailState },
    { key: "storage", state: storageState },
  ];

  await Promise.all(
    results.map((r) =>
      prisma.serviceStatus.updateMany({
        where: { key: r.key as never, mode: "auto" },
        data: { state: r.state as never, lastCheckedAt: new Date() },
      }),
    ),
  );

  return NextResponse.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    results,
  });
}
