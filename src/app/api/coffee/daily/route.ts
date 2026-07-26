import { NextResponse } from "next/server"
import { getTodayDrop, coffeeHealth } from "@/lib/coffee/db"

export const dynamic = "force-dynamic"

/**
 * GET /api/coffee/daily — public: today's drop.
 * If the database is unreachable, this returns a diagnostic instead of crashing,
 * so you can open this URL in the browser and read the real reason.
 */
export async function GET() {
  const drop = await getTodayDrop()

  if (drop) {
    return NextResponse.json(
      { drop: { ...drop, _id: drop._id?.toString() } },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    )
  }

  // No drop — either nothing published yet, or the DB is unreachable.
  const health = await coffeeHealth()
  return NextResponse.json(
    {
      drop: null,
      reason: health.ok
        ? "no_published_drop"
        : health.hasUri
          ? "db_unreachable"
          : "missing_env_DATABASE_URL_or_MONGODB_URI",
      db: health.db,
      error: health.ok ? undefined : health.error,
    },
    { status: 200 },
  )
}
