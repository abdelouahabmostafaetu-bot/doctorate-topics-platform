"use server";
import { auth } from "@/auth";
import { opportunitiesCollection, toObjectId, type Opportunity } from "@/lib/opportunities/store";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function saveOpportunity(form: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN" || session.user.blocked) throw new Error("Forbidden");
  const text = (key: string, max = 5000) => String(form.get(key) || "").trim().slice(0, max);
  const safeUrl = (key: string, required = false) => {
    const v = text(key, 2048); if (!v && !required) return "";
    let u: URL; try { u = new URL(v); } catch { throw new Error(`Invalid URL: ${key}`); }
    if (u.protocol !== "https:" || u.username || u.password) throw new Error(`HTTPS URL required: ${key}`);
    return u.toString();
  };
  const id = text("id", 24); const oid = id ? toObjectId(id) : null; if (id && !oid) throw new Error("Invalid ID");
  const titleAr = text("titleAr", 300), titleEn = text("titleEn", 300), university = text("university",300), country = text("country",150), sourceName = text("sourceName",200);
  if (!titleAr || !titleEn || !university || !country || !sourceName) throw new Error("Required fields missing");
  const sourceUrl = safeUrl("sourceUrl", true), applicationUrl = safeUrl("applicationUrl");
  const deadline = text("deadline", 10);
  if (deadline && (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || Number.isNaN(Date.parse(`${deadline}T00:00:00Z`)) || new Date(`${deadline}T00:00:00Z`).toISOString().slice(0,10) !== deadline)) throw new Error("Invalid date");
  const ft = text("fundingType"); const ss = text("sourceStatus");
  if (!["fully_funded","partially_funded","salary","unknown"].includes(ft) || !["open","closed","unknown"].includes(ss)) throw new Error("Invalid status");
  const published = form.get("published") === "on";
  if (published && form.get("confirmed") !== "on") throw new Error("Verify against the source before publication");
  const now = new Date();
  const doc = {titleAr,titleEn,university,country,sourceName,sourceUrl,applicationUrl,deadline,deadlineTimezone:text("deadlineTimezone",100),field:text("field",200), fundingType:ft as Opportunity["fundingType"], sourceStatus:ss as Opportunity["sourceStatus"], published,
    descriptionAr:text("descriptionAr"), descriptionEn:text("descriptionEn"), fundingAr:text("fundingAr"), fundingEn:text("fundingEn"), eligibilityAr:text("eligibilityAr"), eligibilityEn:text("eligibilityEn"), documentsAr:text("documentsAr"), documentsEn:text("documentsEn"), applicationAr:text("applicationAr"), applicationEn:text("applicationEn"), verifiedAt:now, updatedAt:now};
  const col = opportunitiesCollection();
  const duplicate = await col.findOne({sourceUrl, ...(oid ? {_id: {$ne: oid}} : {})});
  if (duplicate) throw new Error("An opportunity with this source URL already exists. Edit the existing record instead.");
  if (oid) { const result = await col.updateOne({_id:oid}, {$set:doc}); if (!result.matchedCount) throw new Error("Opportunity not found"); }
  else await col.insertOne({...doc, createdAt:now} as Opportunity);
  revalidatePath("/opportunities"); revalidatePath("/admin/opportunities");
  redirect("/admin/opportunities");
}
