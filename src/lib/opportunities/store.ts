import { MongoClient, ObjectId } from "mongodb";

export type OpportunityKind = "phd" | "scholarship" | "master";
export type OpportunityOrigin = "manual" | "mathjobs" | "euraxess";

export type Opportunity = {
  _id: ObjectId;
  /** manual = written/edited by the SUPER_ADMIN; others are harvested automatically. */
  origin?: OpportunityOrigin;
  kind?: OpportunityKind;
  lastSeenAt?: Date;
  titleAr: string; titleEn: string; university: string; country: string; field: string;
  fundingType: "fully_funded" | "partially_funded" | "salary" | "unknown";
  fundingAr: string; fundingEn: string; eligibilityAr: string; eligibilityEn: string;
  documentsAr: string; documentsEn: string; applicationAr: string; applicationEn: string;
  descriptionAr: string; descriptionEn: string; deadline: string; deadlineTimezone: string;
  sourceUrl: string; applicationUrl: string; sourceName: string;
  referenceUrl?: string; fundingUrl?: string;
  sourceStatus: "open" | "closed" | "unknown"; published: boolean;
  verifiedAt: Date; updatedAt: Date; createdAt: Date;
};

const globalForMongo = globalThis as unknown as { opportunitiesClient?: MongoClient };
export function opportunitiesCollection() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL is required");
  if (!globalForMongo.opportunitiesClient) globalForMongo.opportunitiesClient = new MongoClient(uri);
  return globalForMongo.opportunitiesClient.db().collection<Opportunity>("math_phd_opportunities");
}
export function harvestRunsCollection<T extends object>() {
  opportunitiesCollection();
  return globalForMongo.opportunitiesClient!.db().collection<T>("math_phd_opportunity_runs");
}
/** Listings the harvester inspected and rejected (postdoc, expired, not math) — never re-fetched. */
export function harvestSkipsCollection() {
  opportunitiesCollection();
  return globalForMongo.opportunitiesClient!.db().collection<{ sourceUrl: string; reason: string; at: Date }>("math_phd_opportunity_skips");
}
export const isAuto = (item: Pick<Opportunity, "origin">) => item.origin === "mathjobs" || item.origin === "euraxess";
export function toObjectId(id: string) {
  return /^[a-f\d]{24}$/i.test(id) ? new ObjectId(id) : null;
}
export function displayStatus(item: Opportunity): "open" | "closing" | "closed" | "unknown" {
  if (item.sourceStatus === "closed") return "closed";
  // Automatic records are re-checked daily; manual ones need a fresh review every 7 days.
  const maxAge = (isAuto(item) ? 3 : 7) * 86_400_000;
  if (!item.verifiedAt || Date.now() - new Date(item.verifiedAt).getTime() > maxAge) return "unknown";
  // Date-only deadlines do not imply a known time zone or closing time.
  if (item.sourceStatus !== "open") return "unknown";
  if (!item.deadline) return isAuto(item) ? "open" : "unknown";
  const d = Date.parse(`${item.deadline}T00:00:00Z`);
  if (!Number.isFinite(d)) return "unknown";
  const days = (d - Date.now()) / 86_400_000;
  if (days < 0) return "unknown"; // Requires source re-check, not an invented closing time.
  return days <= 7 ? "closing" : "open";
}

export async function listPublicOpportunities() {
  const { curatedOpportunities } = await import("./curated");
  const collection = opportunitiesCollection();
  const [published, overrides] = await Promise.all([
    collection.find({ published: true }).sort({ updatedAt: -1 }).limit(500).toArray(),
    collection.find({ _id: { $in: curatedOpportunities.map(item => item._id) } }).toArray(),
  ]);
  const overrideIds = new Set(overrides.map(item => item._id.toString()));
  const existingIds = new Set(published.map(item => item._id.toString()));
  const visibleOverrides = overrides.filter(item => item.published && !existingIds.has(item._id.toString()));
  const fallback = curatedOpportunities.filter(item => !overrideIds.has(item._id.toString()) && !published.some(row => row.sourceUrl === item.sourceUrl));
  // Open first (nearest deadline first), then needs-verification, then closed.
  const rank = { closing: 0, open: 1, unknown: 2, closed: 3 } as const;
  const dl = (i: Opportunity) => (i.deadline ? Date.parse(`${i.deadline}T00:00:00Z`) : Number.MAX_SAFE_INTEGER);
  return [...published, ...visibleOverrides, ...fallback]
    .sort((a, b) => rank[displayStatus(a)] - rank[displayStatus(b)] || dl(a) - dl(b) || b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 500);
}

export async function getOpportunity(id: ObjectId, publishedOnly = true) {
  const stored = await opportunitiesCollection().findOne({ _id: id });
  if (stored) return !publishedOnly || stored.published ? stored : null;
  const { curatedOpportunities } = await import("./curated");
  const seed = curatedOpportunities.find(item => item._id.equals(id));
  return seed && (!publishedOnly || seed.published) ? seed : null;
}
