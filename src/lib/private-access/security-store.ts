import "server-only";
import { MongoClient } from "mongodb";

type Entry = {_id: string; count: number; expiresAt: Date};
type State = { client?: MongoClient; indexReady?: Promise<string> };
const state = globalThis as unknown as { privateSecurityStore?: State };
const shared = state.privateSecurityStore ||= {};
async function collection() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("Security database unavailable");
  shared.client ||= new MongoClient(uri, {serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000});
  const col = shared.client.db().collection<Entry>("private_security_counters");
  if (!shared.indexReady) shared.indexReady = col.createIndex({expiresAt:1}, {expireAfterSeconds:0}).catch(error => {shared.indexReady = undefined; throw error;});
  await shared.indexReady;
  return col;
}
/** MongoDB's atomic per-key counters work across serverless instances. */
async function hit(key: string, expiresAt: Date): Promise<number> {
  const result = await (await collection()).findOneAndUpdate({_id:key}, {$inc:{count:1}, $setOnInsert:{expiresAt}}, {upsert:true, returnDocument:"after"});
  if (!result) throw new Error("Security counter unavailable");
  return result.count;
}
export type PrivateSecurityStore = { hit: (key: string, expiresAt: Date) => Promise<number>; claim: (key: string, expiresAt: Date) => Promise<boolean> };
export const privateSecurityStore: PrivateSecurityStore = {
  hit,
  async claim(key, expiresAt) {
    try { await (await collection()).insertOne({_id:key,count:1,expiresAt}); return true; }
    catch (error) { if ((error as {code?:number}).code === 11000) return false; throw error; }
  },
};
export async function countClosedVisit() {
  const now = new Date(), day = now.toISOString().slice(0,10);
  await hit(`visits:${day}`, new Date(now.getTime() + 30*86400_000));
}
export async function lastWeekClosedVisits() {
  const col = await collection();
  const days = Array.from({length:7}, (_,i)=>new Date(Date.now()-i*86400_000).toISOString().slice(0,10));
  const found = await col.find({_id:{$in:days.map(d=>`visits:${d}`)}}).toArray();
  return days.map(day=>({day,count:found.find(x=>x._id===`visits:${day}`)?.count || 0}));
}
