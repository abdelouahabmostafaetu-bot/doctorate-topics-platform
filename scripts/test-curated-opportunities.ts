import assert from "node:assert/strict";
import { MongoClient } from "mongodb";
import { curatedOpportunities } from "../src/lib/opportunities/curated";
import { listPublicOpportunities, getOpportunity, displayStatus, type Opportunity } from "../src/lib/opportunities/store";

// Deterministic in-memory driver stand-in; no live database is contacted.
let rows: Opportunity[] = [];
(MongoClient.prototype as any).db = () => ({collection: () => ({
  find: (q: any) => ({sort: () => ({limit: () => ({toArray: async () => rows.filter(x => x.published)})}), toArray: async () => rows.filter(x => q._id.$in.some((id: any) => x._id.equals(id)))}),
  findOne: async (q: any) => rows.find(x => x._id.equals(q._id)) ?? null,
})});
process.env.DATABASE_URL = "mongodb://localhost:27017/test";
(async () => {
  const seed = curatedOpportunities[0];
  assert.equal(seed.deadline, "2027-01-08"); assert.equal(seed.deadlineTimezone, "15:00 CET");
  assert.equal((await listPublicOpportunities()).length, 1);
  assert.equal((await getOpportunity(seed._id))?.sourceUrl, seed.sourceUrl);
  rows = [{...seed, published:false}];
  assert.equal((await listPublicOpportunities()).length, 0);
  assert.equal(await getOpportunity(seed._id), null);
  assert.equal((await getOpportunity(seed._id, false))?.published, false);
  rows = [{...seed, titleEn:"Edited", published:true}];
  const edited = await listPublicOpportunities(); assert.equal(edited.length, 1); assert.equal(edited[0].titleEn, "Edited");
  assert.equal(displayStatus({...seed, sourceStatus:"closed"}), "closed");
  console.log("Curated entry, override, unpublish, and deadline checks passed");
})().catch(e => {console.error(e); process.exitCode = 1;});
