import "server-only";
import { MongoClient, ObjectId } from "mongodb";
import { createHmac } from "node:crypto";
import { privateRedis } from "./verify";

type PrivateMessage = { _id?: ObjectId; name: string; email: string; body: string; createdAt: Date; readAt: Date | null; replies: { body: string; sentAt: Date }[] };
const state = globalThis as unknown as { privateInboxClient?: MongoClient };
function collection() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("Database is not configured");
  state.privateInboxClient ||= new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  return state.privateInboxClient.db().collection<PrivateMessage>("private_inbox_messages");
}
const counterScript = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]); end; return n";
export async function contactRateAllowed(client: string): Promise<boolean> {
  const redis = privateRedis(), key = process.env.PRIVATE_REPLAY_KEY;
  if (!redis || !key || key.length < 32) return false;
  try {
    const digest = createHmac("sha256", key).update(client).digest("hex");
    const [all, specific] = await Promise.all([
      redis.eval<number[],number>(counterScript, ["private:contact:global"], [3600]),
      redis.eval<number[],number>(counterScript, [`private:contact:client:${digest}`], [3600]),
    ]);
    return all <= 100 && specific <= 5;
  } catch { return false; }
}
export async function addPrivateMessage(data: {name: string; email: string; body: string}) {
  await collection().insertOne({ ...data, createdAt: new Date(), readAt: null, replies: [] });
}
export async function listPrivateMessages() {
  return collection().find({}).sort({createdAt:-1}).limit(200).toArray();
}
export async function getPrivateMessage(id: string) {
  return /^[a-f\d]{24}$/i.test(id) ? collection().findOne({_id: new ObjectId(id)}) : null;
}
export async function markPrivateRead(id: string) {
  if (/^[a-f\d]{24}$/i.test(id)) await collection().updateOne({_id: new ObjectId(id)}, {$set: {readAt: new Date()}});
}
export async function recordPrivateReply(id: string, body: string) {
  if (!/^[a-f\d]{24}$/i.test(id)) return;
  await collection().updateOne({_id: new ObjectId(id)}, {$push: {replies: {body, sentAt: new Date()}}, $set: {readAt: new Date()}});
}
export async function recordClosedPageView() {
  const redis = privateRedis(); if (!redis) return;
  try {
    const day = new Date().toISOString().slice(0,10);
    await redis.eval<number[],number>(counterScript,[`private:visits:${day}`],[30 * 86400]);
  } catch { /* site remains closed if counters are unavailable */ }
}
export async function recentClosedPageViews() {
  const redis = privateRedis(); if (!redis) return null;
  try {
    const days = Array.from({length: 7}, (_, i) => new Date(Date.now()-i*86400000).toISOString().slice(0,10));
    return await Promise.all(days.map(async day => ({day, count: Number(await redis.get(`private:visits:${day}`) || 0)})));
  } catch { return null; }
}
