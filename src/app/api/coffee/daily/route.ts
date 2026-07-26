import { NextResponse } from "next/server"
import { getTodayDrop } from "@/lib/coffee/db"

export const dynamic = "force-dynamic"

// GET /api/coffee/daily — public: today's drop
export async function GET() {
  const drop = await getTodayDrop()
  if (!drop) return NextResponse.json({ drop: null }, { status: 200 })
  return NextResponse.json(
    { drop: { ...drop, _id: drop._id?.toString() } },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  )
}
