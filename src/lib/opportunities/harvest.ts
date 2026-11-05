import { harvestRunsCollection, harvestSkipsCollection, opportunitiesCollection, type Opportunity } from "./store";
import { translateOpportunity } from "./translate";
import { ADAPTERS, type Adapter, type Draft } from "./sources";
import { AUTO_ORIGINS, SOURCE_INFO, type AutoOrigin } from "./source-info";
import { clip, detectFunding, isDeepUrl, normUrl, sleep, todayIso } from "./parse";

/**
 * Automatic collection of mathematics PhD positions and scholarships.
 *
 * Each source adapter (src/lib/opportunities/sources.ts) lists public, machine-readable
 * announcements (job boards of mathematical societies, RSS feeds, open APIs). The pipeline:
 *  1. refreshes lastSeenAt/verifiedAt of records still listed,
 *  2. closes records that disappeared from exhaustive listings or went stale,
 *  3. fetches details of new items (respecting each site's crawl delay),
 *  4. drops expired / duplicate items (same URLs or same title+organization across sources),
 *  5. inserts the rest as published records with origin = source id.
 * Records are written with $setOnInsert only: once the SUPER_ADMIN edits a record it becomes
 * "manual" and is never overwritten. Rejected items are remembered and never fetched again.
 */

type SourceStats = { seen: number; created: number; updated: number; closed: number; skipped: number; error?: string };
export type HarvestReport = { startedAt: Date; finishedAt: Date; sources: Partial<Record<AutoOrigin, SourceStats>> };

const STOP = new Set(["the", "and", "for", "with", "in", "of", "at", "to", "a", "an", "de", "des", "du", "la", "le", "et", "m/f/d", "m/w/d", "f/m/x", "m/f/x", "2026", "2027", "2028"]);
const ORG_STOP = new Set([...STOP, "university", "universität", "universite", "université", "institute", "institut", "department", "faculty", "school", "college", "mathematics", "mathematical", "sciences", "science", "technology", "national", "center", "centre", "main", "u"]);
const tokens = (s: string, stop: Set<string>) => new Set(s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9/]+/).filter((w) => w.length > 1 && !stop.has(w)));
const jaccard = (a: Set<string>, b: Set<string>) => { let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i || 1); };
const overlap = (a: Set<string>, b: Set<string>) => { let i = 0; for (const x of a) if (b.has(x)) i++; return i; };

type Known = { urls: Set<string>; items: { title: Set<string>; org: Set<string> }[] };

async function ensureIndexes() {
  const col = opportunitiesCollection();
  // v1 index was limited to two origins; v2 covers every harvested record (auto: true).
  await col.dropIndex("auto_source_unique").catch(() => undefined);
  await col.updateMany({ origin: { $in: [...AUTO_ORIGINS] }, auto: { $ne: true } }, { $set: { auto: true } });
  await col.createIndex({ sourceUrl: 1 }, { unique: true, partialFilterExpression: { auto: true }, name: "auto_source_unique_v2" }).catch(() => undefined);
  await col.createIndex({ published: 1, updatedAt: -1 }).catch(() => undefined);
  await harvestSkipsCollection().createIndex({ sourceUrl: 1 }, { unique: true }).catch(() => undefined);
}

async function loadKnown(): Promise<Known> {
  const { curatedOpportunities } = await import("./curated");
  const rows = await opportunitiesCollection()
    .find({}, { projection: { sourceUrl: 1, applicationUrl: 1, referenceUrl: 1, titleEn: 1, university: 1, sourceStatus: 1 } })
    .toArray();
  const known: Known = { urls: new Set(), items: [] };
  for (const r of [...rows, ...curatedOpportunities]) {
    if (r.sourceUrl) known.urls.add(normUrl(r.sourceUrl));
    for (const u of [r.applicationUrl, r.referenceUrl]) if (u && isDeepUrl(u)) known.urls.add(normUrl(u));
    // Title matching only against live records, so next year's call of a closed programme is accepted.
    if (r.sourceStatus !== "closed") known.items.push({ title: tokens(r.titleEn || "", STOP), org: tokens(r.university || "", ORG_STOP) });
  }
  return known;
}

function isDuplicate(d: Draft, known: Known) {
  const urls = [d.sourceUrl, d.applyUrl, d.referenceUrl, ...(d.links || [])].filter((u): u is string => !!u && isDeepUrl(u)).map(normUrl);
  if (urls.some((u) => known.urls.has(u))) return true;
  const t = tokens(d.title, STOP);
  const o = tokens(d.organization, ORG_STOP);
  return known.items.some((k) => {
    const j = jaccard(t, k.title);
    const ov = overlap(o, k.org);
    return (j >= 0.8 && ov >= 1) || (j >= 0.6 && ov >= 2);
  });
}
function remember(d: Draft, known: Known) {
  for (const u of [d.sourceUrl, d.applyUrl, d.referenceUrl]) if (u && isDeepUrl(u)) known.urls.add(normUrl(u));
  known.items.push({ title: tokens(d.title, STOP), org: tokens(d.organization, ORG_STOP) });
}

function toRecord(a: Adapter, d: Draft): Omit<Opportunity, "_id"> {
  const t = new Date();
  const text = [d.title, d.description, d.funding].filter(Boolean).join("\n");
  const funding = detectFunding(text);
  // A scholarship stipend "per annum/month" is not a salaried position.
  const fundingType = funding === "salary" && d.kind && d.kind !== "phd" ? "fully_funded" : funding;
  return {
    titleEn: d.title, titleAr: "", university: d.organization || "—", country: d.country || "Unspecified / غير محدد",
    field: "Mathematics / الرياضيات", kind: d.kind || "phd", fundingType,
    descriptionEn: clip(d.description || "", 2500), descriptionAr: "",
    fundingEn: clip(d.funding || "", 1200), fundingAr: "", eligibilityEn: clip(d.eligibility || "", 1500), eligibilityAr: "",
    documentsEn: (d.documents || []).map((x, i) => `${i + 1}. ${x}`).join("\n"), documentsAr: "",
    applicationEn: d.applicationEn || a.applicationEn, applicationAr: d.applicationAr || (d.applicationEn ? "" : a.applicationAr),
    deadline: d.deadline || "", deadlineTimezone: d.deadlineTimezone || "",
    sourceUrl: d.sourceUrl, applicationUrl: d.applyUrl || d.sourceUrl, sourceName: SOURCE_INFO[a.id].name,
    referenceUrl: d.referenceUrl || "", fundingUrl: "",
    sourceStatus: "open", published: true, origin: a.id, auto: true, lastSeenAt: t,
    verifiedAt: t, updatedAt: t, createdAt: t,
  };
}

async function runAdapter(a: Adapter, ctx: { known: Known; skipped: Set<string>; stopAt: number; maxDetails: number }): Promise<SourceStats> {
  const stats: SourceStats = { seen: 0, created: 0, updated: 0, closed: 0, skipped: 0 };
  const col = opportunitiesCollection();
  const skips = harvestSkipsCollection();
  const now = () => new Date();
  const skip = async (sourceUrl: string, reason: string) => {
    stats.skipped++;
    ctx.skipped.add(sourceUrl);
    await skips.updateOne({ sourceUrl }, { $set: { sourceUrl, reason, origin: a.id, at: now() } }, { upsert: true });
  };
  try {
    const listed = [...new Map((await a.list()).filter((d) => d.sourceUrl && d.title).map((d) => [d.sourceUrl, d])).values()];
    stats.seen = listed.length;
    const urls = listed.map((d) => d.sourceUrl);
    if (urls.length) {
      const r = await col.updateMany({ origin: a.id, sourceUrl: { $in: urls } }, { $set: { lastSeenAt: now(), verifiedAt: now() } });
      stats.updated = r.modifiedCount;
    }
    if (a.complete && urls.length) {
      const r = await col.updateMany({ origin: a.id, sourceUrl: { $nin: urls }, sourceStatus: { $ne: "closed" } }, { $set: { sourceStatus: "closed", updatedAt: now() } });
      stats.closed += r.modifiedCount;
    }
    if (a.staleDays) {
      const r = await col.updateMany({ origin: a.id, sourceStatus: { $ne: "closed" }, lastSeenAt: { $lt: new Date(Date.now() - a.staleDays * 86_400_000) } }, { $set: { sourceStatus: "closed", updatedAt: now() } });
      stats.closed += r.modifiedCount;
    }

    let fetched = 0;
    const maxDetails = Math.min(a.maxDetails ?? ctx.maxDetails, ctx.maxDetails);
    for (const item of listed) {
      if (ctx.known.urls.has(normUrl(item.sourceUrl)) || ctx.skipped.has(item.sourceUrl)) continue;
      let d: Draft | null = item;
      if (a.detail) {
        if (fetched >= maxDetails || Date.now() + (a.delayMs ?? 0) + 15_000 > ctx.stopAt) break;
        if (fetched > 0 && a.delayMs) await sleep(a.delayMs);
        fetched++;
        try { d = await a.detail(item); } catch { continue; } // transient: retry next run
        if (!d) { await skip(item.sourceUrl, "not-relevant"); continue; }
      }
      if (Date.now() + 5_000 > ctx.stopAt) break;
      if (d.deadline && d.deadline < todayIso()) { await skip(d.sourceUrl, "expired"); continue; }
      if (isDuplicate(d, ctx.known)) { await skip(d.sourceUrl, "duplicate"); continue; }
      remember(d, ctx.known);
      const base = toRecord(a, d);
      const ar = Date.now() + 30_000 < ctx.stopAt ? await translateOpportunity(base) : {};
      const r = await col.updateOne({ sourceUrl: d.sourceUrl, auto: true }, { $setOnInsert: { ...base, ...ar } }, { upsert: true });
      if (r.upsertedCount) stats.created++;
    }
  } catch (e) {
    stats.error = e instanceof Error ? e.message : String(e);
  }
  return stats;
}

export async function runHarvest(opts: { maxDetails?: number; deadlineMs?: number; only?: AutoOrigin[] } = {}): Promise<HarvestReport> {
  const startedAt = new Date();
  const stopAt = Date.now() + (opts.deadlineMs ?? 50_000);
  await ensureIndexes();
  const [known, skipRows] = await Promise.all([loadKnown(), harvestSkipsCollection().find({}, { projection: { sourceUrl: 1 } }).toArray()]);
  const ctx = { known, skipped: new Set(skipRows.map((r) => r.sourceUrl)), stopAt, maxDetails: opts.maxDetails ?? 6 };
  const adapters = ADAPTERS.filter((a) => !opts.only || opts.only.includes(a.id));
  // Sources run in parallel; each one paces its own requests.
  const results = await Promise.all(adapters.map((a) => runAdapter(a, ctx)));
  const report: HarvestReport = { startedAt, finishedAt: startedAt, sources: {} };
  adapters.forEach((a, i) => { report.sources[a.id] = results[i]; });

  // Deadline passed → closed (all harvested records).
  await opportunitiesCollection().updateMany({ auto: true, origin: { $in: [...AUTO_ORIGINS] }, sourceStatus: "open", deadline: { $gt: "", $lt: todayIso() } }, { $set: { sourceStatus: "closed", updatedAt: new Date() } });

  report.finishedAt = new Date();
  await harvestRunsCollection<HarvestReport>().insertOne({ ...report }).catch(() => undefined);
  return report;
}

export async function lastHarvestRun(): Promise<HarvestReport | null> {
  try {
    return (await harvestRunsCollection<HarvestReport>().find({}).sort({ startedAt: -1 }).limit(1).next()) ?? null;
  } catch { return null; }
}
