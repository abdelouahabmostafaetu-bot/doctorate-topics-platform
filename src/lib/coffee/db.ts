import { MongoClient, Collection } from "mongodb"
import type { DailyDrop } from "./types"

const uri = process.env.MONGODB_URI!
const dbName = process.env.MONGODB_DB || "docmathdz"

// cached across hot reloads / lambda invocations
let client: MongoClient | null = (global as any)._dmClient ?? null

async function getClient() {
  if (!client) {
    client = new MongoClient(uri)
    await client.connect()
    ;(global as any)._dmClient = client
  }
  return client
}

export async function drops(): Promise<Collection<DailyDrop>> {
  const c = await getClient()
  const col = c.db(dbName).collection<DailyDrop>("dailydrops")
  await col.createIndex({ date: -1 }, { unique: true })
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
  return new Intl.DateTimeFormat("ar-DZ", {
    timeZone: "Africa/Algiers",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${iso}T12:00:00Z`))
}

/** Latest published drop for today, falling back to the most recent one. */
export async function getTodayDrop() {
  const col = await drops()
  const today = todayAlgiers()
  return (
    (await col.findOne({ date: today, published: true })) ??
    (await col.findOne({ published: true, date: { $lte: today } }, { sort: { date: -1 } }))
  )
}
