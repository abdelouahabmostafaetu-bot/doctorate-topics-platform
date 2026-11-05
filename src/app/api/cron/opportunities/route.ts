// Daily automatic collection of mathematics PhD opportunities (Vercel Cron).
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { runHarvest, lastHarvestRun } from "@/lib/opportunities/harvest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) return request.headers.get("authorization") === `Bearer ${secret}`;
  // Without CRON_SECRET only Vercel's scheduler is accepted (see middleware).
  return (request.headers.get("user-agent") ?? "").startsWith("vercel-cron/");
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // Cooldown: the job is idempotent, but never hammer the sources.
  const last = await lastHarvestRun();
  if (last && Date.now() - new Date(last.startedAt).getTime() < 30 * 60_000) {
    return NextResponse.json({ skipped: "cooldown", last });
  }
  const report = await runHarvest({ maxDetails: 6, deadlineMs: 50_000 });
  revalidatePath("/opportunities");
  return NextResponse.json(report);
}
