import { thesesCol, type ThesisDoc } from "./db";
import { applySettings, thesesIndex, type ThesisHit } from "./meili";

const BATCH = 1000;

/** Meilisearch rejects document ids outside [A-Za-z0-9_-]. Mongo _id are
 *  repo-scoped strings that may contain ':' or '/', so they are encoded. */
export function toDocId(raw: string): string {
  return raw.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 500);
}

export function toHit(t: ThesisDoc): ThesisHit {
  return {
    id: toDocId(String(t._id)),
    title: t.title || "",
    abstract: (t.abstract || "").slice(0, 4000),
    authors: t.authors || [],
    supervisors: t.supervisors || [],
    keywords: t.keywords || [],
    year: t.year ?? null,
    degree: t.degree,
    degreeAr: t.degreeAr || "",
    branch: t.branch || "other",
    branchAr: t.branchAr || "",
    uniSlug: t.uniSlug,
    uniAr: t.uniAr || "",
    uniFr: t.uniFr || "",
    wilaya: t.wilaya || "",
    lang: t.lang || "fr",
    landingUrl: t.landingUrl || "",
    hasPdf: Boolean(t.pdfUrl),
  };
}

export type SyncResult = { sent: number; batches: number };

/**
 * Streams every status="ok" thesis into Meilisearch.
 * addDocuments upserts by primary key, so re-running only refreshes.
 */
export async function syncAll(
  log: (s: string) => void = () => {}
): Promise<SyncResult> {
  await applySettings();
  log("index settings applied");

  const col = await thesesCol();
  const index = await thesesIndex();
  const cursor = col.find({ status: "ok" });

  let buf: ThesisHit[] = [];
  let sent = 0;
  let batches = 0;

  const flush = async () => {
    if (!buf.length) return;
    await index.addDocuments(buf, { primaryKey: "id" });
    sent += buf.length;
    batches++;
    log("batch " + batches + " -> " + sent + " docs queued");
    buf = [];
  };

  for await (const doc of cursor) {
    buf.push(toHit(doc));
    if (buf.length >= BATCH) await flush();
  }
  await flush();

  return { sent, batches };
}
