import { MongoClient, ObjectId } from "mongodb";

export type Opportunity = {
  _id: ObjectId;
  titleAr: string; titleEn: string; university: string; country: string; field: string;
  fundingType: "fully_funded" | "partially_funded" | "salary" | "unknown";
  fundingAr: string; fundingEn: string; eligibilityAr: string; eligibilityEn: string;
  documentsAr: string; documentsEn: string; applicationAr: string; applicationEn: string;
  descriptionAr: string; descriptionEn: string; deadline: string; deadlineTimezone: string;
  sourceUrl: string; applicationUrl: string; sourceName: string;
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
export function toObjectId(id: string) {
  return /^[a-f\d]{24}$/i.test(id) ? new ObjectId(id) : null;
}
export function displayStatus(item: Opportunity): "open" | "closing" | "closed" | "unknown" {
  if (item.sourceStatus === "closed") return "closed";
  if (!item.verifiedAt || Date.now() - new Date(item.verifiedAt).getTime() > 7 * 86_400_000) return "unknown";
  // Date-only deadlines do not imply a known time zone or closing time.
  if (!item.deadline || item.sourceStatus !== "open") return "unknown";
  const d = Date.parse(`${item.deadline}T00:00:00Z`);
  if (!Number.isFinite(d)) return "unknown";
  const days = (d - Date.now()) / 86_400_000;
  if (days < -1) return "unknown"; // Requires source re-check, not an invented closing time.
  return days <= 7 ? "closing" : "open";
}
