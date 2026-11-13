import "server-only";
import { MongoClient, ObjectId } from "mongodb";
import { createHmac } from "node:crypto";
import { privateSecurityStore, countClosedVisit, lastWeekClosedVisits } from "./security-store";

type PrivateMessage = { _id?: ObjectId; name: string; email: string; body: string; createdAt: Date; readAt: Date | null; replies: { body: string; sentAt: Date }[] };
const state = globalThis as unknown as { privateInboxClient?: MongoClient };
function collection() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("Database is not configured");
  state.privateInboxClient ||= new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  return state.privateInboxClient.db().collection<PrivateMessage>("private_inbox_messages");
}
export async function contactRateAllowed(client: string): Promise<boolean> {
  const key=process.env.PRIVATE_REPLAY_KEY; if (!key || key.length < 32) return false;
  try {
    const hour=Math.floor(Date.now()/3600_000), digest=createHmac("sha256",key).update(client).digest("hex");
    const expiration=new Date((hour+2)*3600_000);
    const [all,specific]=await Promise.all([
      privateSecurityStore.hit(`contact-global:${hour}`,expiration),
      privateSecurityStore.hit(`contact-client:${hour}:${digest}`,expiration),
    ]);
    return all<=100 && specific<=5;
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
  try { await countClosedVisit(); } catch { /* keep site closed if counters are unavailable */ }
}
export async function recentClosedPageViews() {
  try { return await lastWeekClosedVisits(); } catch { return null; }
}
