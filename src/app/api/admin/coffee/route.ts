import { NextRequest, NextResponse } from "next/server"
import { drops } from "@/lib/coffee/db"
import { requireAdmin } from "@/lib/coffee/auth"
import type { DailyDropInput } from "@/lib/coffee/types"

export const dynamic = "force-dynamic"

// GET /api/admin/coffee?limit=60 — list all drops (newest first)
export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (guard) return guard

  const limit = Number(new URL(req.url).searchParams.get("limit") ?? 60)
  const col = await drops()
  const items = await col.find({}).sort({ date: -1 }).limit(limit).toArray()

  return NextResponse.json({
    items: items.map((d) => ({ ...d, _id: d._id?.toString() })),
  })
}

// POST /api/admin/coffee — create or overwrite the drop for a given date
export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if (guard) return guard

  const body = (await req.json()) as DailyDropInput

  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date))
    return NextResponse.json({ error: "التاريخ غير صالح (YYYY-MM-DD)" }, { status: 400 })
  if (!body.problem?.statement?.trim())
    return NextResponse.json({ error: "نص المسألة مطلوب" }, { status: 400 })
  if (!body.idea?.text?.trim())
    return NextResponse.json({ error: "فكرة اليوم مطلوبة" }, { status: 400 })
  if (!body.quote?.text?.trim())
    return NextResponse.json({ error: "مقولة اليوم مطلوبة" }, { status: 400 })

  const now = new Date()
  const col = await drops()
  await col.updateOne(
    { date: body.date },
    { $set: { ...body, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  )

  return NextResponse.json({ ok: true })
}
