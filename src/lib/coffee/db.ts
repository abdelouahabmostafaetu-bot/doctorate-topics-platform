import { MongoClient, Collection } from "mongodb"
import type { DailyDrop } from "./types"

/**
 * ☕ Resilient MongoDB access for /coffee.
 * - Env vars are read at CALL time (not import time) so a missing var can
 *   never crash the whole page at module load.
 * - A failed connection is NOT cached, so the next request retries cleanly.
 * - getTodayDrop() NEVER throws: it logs and returns null, and the page
 *   renders the friendly "لم تُنشَر قهوة اليوم بعد" card instead of the 500 screen.
 */

let clientPromise: Promise<MongoClient> | null =
  (global as any)._dmClientPromise ?? null
let indexEnsured = false

function dbName(): string {
  return process.env.MONGODB_DB || "docmathdz"
}

async function getClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error("missing_env: MONGODB_URI is not set on the server")

  if (!clientPromise) {
    clientPromise = new MongoClient(uri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    }).connect()
    ;(global as any)._dmClientPromise = clientPromise
  }

  try {
    return await clientPromise
  } catch (err) {
    // do not poison the cache with a rejected promise — retry next request
    clientPromise = null
    ;(global as any)._dmClientPromise = null
    throw err
  }
}

export async function drops(): Promise<Collection<DailyDrop>> {
  const c = await getClient()
  const col = c.db(dbName()).collection<DailyDrop>("dailydrops")
  if (!indexEnsured) {
    indexEnsured = true
    // best effort, non-blocking — never let index creation break a request
    col.createIndex({ date: -1 }, { unique: true }).catch(() => {})
  }
  return col
}

/** Today in Algiers — never use UTC, or the drop flips at 1am local. */
export function todayAlgiers(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Algiers",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

/** Pretty Arabic date: "الأحد 26 جويلية 2026" */
export function arabicDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ar-DZ", {
      timeZone: "Africa/Algiers",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(`${iso}T12:00:00Z`))
  } catch {
    return iso
  }
}

/**
 * Latest published drop for today, falling back to the most recent one.
 * NEVER throws — returns null on any failure (page shows the fallback card).
 */
export async function getTodayDrop(): Promise<DailyDrop | null> {
  try {
    const col = await drops()
    const today = todayAlgiers()
    return (
      (await col.findOne({ date: today, published: true })) ??
      (await col.findOne(
        { published: true, date: { $lte: today } },
        { sort: { date: -1 } },
      ))
    )
  } catch (err) {
    console.error("[coffee] getTodayDrop failed:", err)
    return null
  }
}

/** Diagnostic used by /api/coffee/daily to tell you WHY it failed. */
export async function coffeeHealth(): Promise<{
  ok: boolean
  hasUri: boolean
  db: string
  error?: string
}> {
  const hasUri = Boolean(process.env.MONGODB_URI)
  try {
    const c = await getClient()
    await c.db(dbName()).command({ ping: 1 })
    return { ok: true, hasUri, db: dbName() }
  } catch (err: any) {
    return {
      ok: false,
      hasUri,
      db: dbName(),
      error: String(err?.message ?? err).slice(0, 300),
    }
  }
}
