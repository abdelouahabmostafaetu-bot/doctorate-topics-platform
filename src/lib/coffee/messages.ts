import { MongoClient, Collection, ObjectId } from "mongodb"

export type CoffeeMessage = {
  _id?: ObjectId
  name: string | null
  email: string | null
  body: string
  userId: string | null
  userName: string | null
  createdAt: Date
  readAt: Date | null
}

export const MAX_COFFEE_MESSAGE_LENGTH = 2000

let clientPromise: Promise<MongoClient> | null =
  (global as any)._dmCoffeeMessagesClientPromise ?? null
let indexEnsured = false

function connectionUri(): string {
  return process.env.MONGODB_URI || process.env.DATABASE_URL || ""
}

function dbName(): string {
  if (process.env.MONGODB_DB) return process.env.MONGODB_DB
  const m = connectionUri().match(/\/([A-Za-z0-9_-]+)(\?|$)/)
  if (m && m[1] && !m[1].includes(".")) return m[1]
  return "doctorate_platform"
}

async function getClient(): Promise<MongoClient> {
  const uri = connectionUri()
  if (!uri) throw new Error("missing_env: DATABASE_URL / MONGODB_URI is not set")

  if (!clientPromise) {
    clientPromise = new MongoClient(uri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    }).connect()
    ;(global as any)._dmCoffeeMessagesClientPromise = clientPromise
  }

  try {
    return await clientPromise
  } catch (err) {
    clientPromise = null
    ;(global as any)._dmCoffeeMessagesClientPromise = null
    throw err
  }
}

export async function coffeeMessagesCol(): Promise<Collection<CoffeeMessage>> {
  const c = await getClient()
  const col = c.db(dbName()).collection<CoffeeMessage>("coffeemessages")
  if (!indexEnsured) {
    indexEnsured = true
    col.createIndex({ createdAt: -1 }).catch(() => {})
    col.createIndex({ readAt: 1, createdAt: -1 }).catch(() => {})
  }
  return col
}

export async function addCoffeeMessage(input: {
  name?: string | null
  email?: string | null
  body: string
  userId?: string | null
  userName?: string | null
}): Promise<CoffeeMessage> {
  const doc: CoffeeMessage = {
    name: input.name?.trim() || null,
    email: input.email?.trim().toLowerCase() || null,
    body: input.body.trim().slice(0, MAX_COFFEE_MESSAGE_LENGTH),
    userId: input.userId || null,
    userName: input.userName?.trim() || null,
    createdAt: new Date(),
    readAt: null,
  }
  const col = await coffeeMessagesCol()
  const result = await col.insertOne(doc as any)
  return { ...doc, _id: result.insertedId }
}

export async function listCoffeeMessages(): Promise<CoffeeMessage[]> {
  const col = await coffeeMessagesCol()
  return col.find({}).sort({ createdAt: -1 }).limit(500).toArray()
}

export async function markCoffeeMessageRead(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false
  const result = await (await coffeeMessagesCol()).updateOne(
    { _id: new ObjectId(id) },
    { $set: { readAt: new Date() } },
  )
  return result.matchedCount > 0
}

export async function deleteCoffeeMessage(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false
  const result = await (await coffeeMessagesCol()).deleteOne({ _id: new ObjectId(id) })
  return result.deletedCount > 0
}
