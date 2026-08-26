import { thesesCol, type ThesisDoc } from "./db";
import { norm } from "./normalize";

function hostHandle(url: string): string {
  const m = String(url || "").match(/^https?:\/\/([^/]+)[\s\S]*\/handle\/(\d+\/\d+)/i);
  if (!m) return "";
  const host = m[1].toLowerCase().replace(/^www\./, "").replace(/:\d+$/, "");
  return host + "|" + m[2];
}

function peopleKey(list: string[]): string {
  return [...new Set((list || []).map(norm).filter(Boolean))].sort().join("|");
}

function fingerprint(d: ThesisDoc): string {
  const title = norm(d.title);
  const authors = peopleKey(d.authors || []);
  if (title.length < 20 || !authors || d.year === null || d.year === undefined) return "";
  return [d.uniSlug || "", d.degree || "autre", d.year, title, authors].join("::");
}

function richness(d: ThesisDoc): number {
  return (
    (d.repo === "ta" ? 0 : 100000) +
    (d.status === "ok" ? 10000 : 0) +
    (d.pdfUrl ? 5000 : 0) +
    Math.min(String(d.abstract || "").length, 4000) +
    (d.keywords?.length || 0) * 50 +
    (d.supervisors?.length || 0) * 25
  );
}

function unionFind(ids: string[]) {
  const parent = new Map<string, string>();
  for (const id of ids) parent.set(id, id);
  const find = (id: string): string => {
    const p = parent.get(id);
    if (!p || p === id) return id;
    const root = find(p);
    parent.set(id, root);
    return root;
  };
  const join = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  };
  return { find, join };
}

function mergeDocs(docs: ThesisDoc[]): ThesisDoc {
  const ordered = [...docs].sort((a, b) => richness(b) - richness(a));
  const base = { ...ordered[0] };
  const all = <T>(pick: (d: ThesisDoc) => T[]): T[] => {
    const out: T[] = [];
    for (const d of ordered) {
      for (const value of pick(d) || []) {
        if (!out.some((x) => norm(String(x)) === norm(String(value)))) out.push(value);
      }
    }
    return out;
  };

  base.authors = all((d) => d.authors || []).slice(0, 12);
  base.supervisors = all((d) => d.supervisors || []).slice(0, 12);
  base.keywords = all((d) => d.keywords || []).slice(0, 30);
  base.abstract = ordered.find((d) => String(d.abstract || "").length > 0)?.abstract || "";
  base.year = ordered.find((d) => d.year !== null && d.year !== undefined)?.year ?? null;
  base.landingUrl = ordered.find((d) => d.repo !== "ta" && d.landingUrl)?.landingUrl || base.landingUrl;
  const pdf = ordered.find((d) => d.pdfUrl)?.pdfUrl;
  if (pdf) {
    base.pdfUrl = pdf;
    base.pdfAt = ordered.find((d) => d.pdfUrl)?.pdfAt || new Date();
  }
  base.updatedAt = new Date();
  return base;
}

/**
 * Merge high-confidence duplicate records in batches. A duplicate is linked
 * by canonical university host+handle or by the conservative key consisting
 * of university, degree, year, normalized title, and authors.
 */
export async function dedupeTheses(log: (message: string) => void = () => {}): Promise<{
  groups: number;
  merged: number;
  byHandle: number;
  byFingerprint: number;
}> {
  const col = await thesesCol();
  const docs = (await col.find({}).toArray()) as unknown as ThesisDoc[];
  const ids = docs.map((d) => String(d._id));
  const uf = unionFind(ids);
  const groupsByKey = new Map<string, { kind: "handle" | "fingerprint"; ids: string[] }>();

  for (const d of docs) {
    const id = String(d._id);
    const keys: Array<["handle" | "fingerprint", string]> = [];
    const h = hostHandle(d.landingUrl);
    const f = fingerprint(d);
    if (h) keys.push(["handle", h]);
    if (f) keys.push(["fingerprint", f]);
    for (const [kind, key] of keys) {
      const full = kind + "|" + key;
      const entry = groupsByKey.get(full);
      if (entry) entry.ids.push(id);
      else groupsByKey.set(full, { kind, ids: [id] });
    }
  }

  for (const entry of groupsByKey.values()) {
    const first = entry.ids[0];
    for (const id of entry.ids.slice(1)) uf.join(first, id);
  }

  const groups = new Map<string, ThesisDoc[]>();
  for (const d of docs) {
    const root = uf.find(String(d._id));
    const list = groups.get(root);
    if (list) list.push(d);
    else groups.set(root, [d]);
  }

  const updates: ThesisDoc[] = [];
  const doomed: string[] = [];
  let byHandle = 0;
  let byFingerprint = 0;
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const hasHandle = group.some((d) => Boolean(hostHandle(d.landingUrl)));
    const canonical = mergeDocs(group);
    updates.push(canonical);
    const duplicates = group.map((d) => String(d._id)).filter((id) => id !== String(canonical._id));
    doomed.push(...duplicates);
    if (hasHandle) byHandle += duplicates.length;
    else byFingerprint += duplicates.length;
  }

  for (let i = 0; i < updates.length; i += 500) {
    await col.bulkWrite(
      updates.slice(i, i + 500).map((doc) => ({ replaceOne: { filter: { _id: doc._id }, replacement: doc } })),
      { ordered: false }
    );
  }
  for (let i = 0; i < doomed.length; i += 500) {
    await col.deleteMany({ _id: { $in: doomed.slice(i, i + 500) } });
  }

  const result = { groups: updates.length, merged: doomed.length, byHandle, byFingerprint };
  log(
    "dedupe -> " + result.merged + " merged into " + result.groups +
      " groups (handle=" + result.byHandle + ", fingerprint=" + result.byFingerprint + ")"
  );
  return result;
}
