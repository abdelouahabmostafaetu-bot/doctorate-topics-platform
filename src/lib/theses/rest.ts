// DSpace 7 REST client.
// Two jobs:
//   1) harvest repositories whose OAI index is empty (SBA, Chlef)
//   2) resolve direct PDF (bitstream) links for any DSpace 7 repository
// Endpoint map adapted from the-library-code/dspace-rest-python.

import {
  buildSearchText,
  classify,
  DEGREE_AR,
  detectBranch,
  detectDegree,
  detectLang,
  norm,
  yearOf,
} from "./normalize";
import type { RepoDef, SetDef } from "./repos";
import type { ThesisDoc } from "./db";

export const UA = "docmathdz-harvester/1.0 (+https://www.docmathdz.dev)";
const PAGE = 100;

export type Json = Record<string, unknown>;

export function obj(v: unknown): Json {
  return v && typeof v === "object" ? (v as Json) : {};
}

export function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

export function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function restBase(repo: RepoDef): string {
  if (repo.rest) return repo.rest.replace(/\/+$/, "");
  return repo.site.replace(/\/+$/, "") + "/server/api";
}

export async function fetchJson(url: string, tries = 3): Promise<unknown> {
  let last: unknown = null;
  for (let i = 0; i < tries; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60000);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        signal: ctrl.signal,
        redirect: "follow",
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } catch (e) {
      clearTimeout(timer);
      last = e;
      await sleep(1500 * (i + 1));
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

function md(item: Json, key: string): string[] {
  const m = obj(item.metadata);
  return arr(m[key])
    .map((e) => str(obj(e).value))
    .filter(Boolean);
}

function cleanPeople(list: string[], uniFr: string): string[] {
  const bad = norm(uniFr);
  const out: string[] = [];
  for (const raw of list) {
    const v = raw.replace(/\s+/g, " ").trim();
    if (!v || v.length > 120) continue;
    const n = norm(v);
    if (!n || n === bad) continue;
    if (/^(universite|university|faculte|departement|jamiaa|\u062c\u0627\u0645\u0639\u0647|\u0643\u0644\u064a\u0647|\u0642\u0633\u0645)/.test(n)) continue;
    if (!out.some((x) => norm(x) === n)) out.push(v);
  }
  return out.slice(0, 12);
}

// "col_123456789_141" -> "123456789/141"
export function specToHandle(spec: string): string {
  const m = /^(?:col|com)_(.+)$/.exec(spec);
  if (!m) return "";
  const rest = m[1];
  const i = rest.lastIndexOf("_");
  if (i < 0) return "";
  return rest.slice(0, i) + "/" + rest.slice(i + 1);
}

export async function scopeUuid(base: string, handle: string): Promise<string> {
  const j = obj(
    await fetchJson(base + "/pid/find?id=hdl:" + encodeURIComponent(handle))
  );
  return str(j.uuid) || str(j.id);
}

export function itemToDoc(
  item: Json,
  repo: RepoDef,
  set: SetDef
): ThesisDoc | null {
  const uuid = str(item.uuid) || str(item.id);
  const handle = str(item.handle);
  const title = md(item, "dc.title")[0] || str(item.name);
  if (!uuid || !title) return null;

  const authors = cleanPeople(md(item, "dc.contributor.author"), repo.nameFr);
  const supervisors = cleanPeople(
    [
      ...md(item, "dc.contributor.advisor"),
      ...md(item, "dc.contributor.other"),
      ...md(item, "dc.contributor"),
    ],
    repo.nameFr
  );
  const keywords = md(item, "dc.subject").slice(0, 30);
  const abstract =
    md(item, "dc.description.abstract")[0] || md(item, "dc.description")[0] || "";
  const types = md(item, "dc.type");
  const year = yearOf([...md(item, "dc.date.issued"), ...md(item, "dc.date")]);

  const rawText = [title, abstract, keywords.join(" "), types.join(" "), set.label].join(" ");
  const text = norm(rawText);
  const verdict = classify(text, set.purity);
  const degree = detectDegree([set.label, types.join(" "), title], set.degree);
  const branch = detectBranch(text);

  return {
    _id: repo.key + "|rest:" + uuid,
    repo: repo.key,
    uniFr: repo.nameFr,
    uniAr: repo.nameAr,
    uniSlug: repo.slug,
    wilaya: repo.wilaya,
    oaiId: "rest:" + uuid,
    setSpecs: [set.spec],
    title,
    abstract: abstract.slice(0, 4000),
    authors,
    supervisors,
    keywords,
    year,
    degree,
    degreeAr: DEGREE_AR[degree],
    branch: branch.key,
    branchAr: branch.ar,
    lang: detectLang(title + " " + abstract),
    landingUrl: handle
      ? repo.site.replace(/\/+$/, "") + "/handle/" + handle
      : repo.site.replace(/\/+$/, "") + "/items/" + uuid,
    itemUuid: uuid,
    st: buildSearchText(
      title,
      abstract,
      authors,
      supervisors,
      keywords,
      repo.nameAr,
      repo.nameFr
    ),
    status: verdict.status,
    reason: verdict.reason,
    datestamp: str(item.lastModified),
    updatedAt: new Date(),
  };
}

export async function restHarvestSet(
  repo: RepoDef,
  set: SetDef,
  sink: (docs: ThesisDoc[]) => Promise<void>,
  log: (s: string) => void
): Promise<number> {
  const base = restBase(repo);
  const handle = specToHandle(set.spec);
  if (!handle) {
    log("    " + set.spec + " -> bad spec");
    return 0;
  }

  let uuid = "";
  try {
    uuid = await scopeUuid(base, handle);
  } catch (e) {
    log("    " + set.spec + " -> scope error: " + (e instanceof Error ? e.message : String(e)));
    return 0;
  }
  if (!uuid) {
    log("    " + set.spec + " -> scope not found");
    return 0;
  }

  let count = 0;
  for (let p = 0; p < 200; p++) {
    const url =
      base +
      "/discover/search/objects?dsoType=item&scope=" +
      uuid +
      "&page=" +
      p +
      "&size=" +
      PAGE;
    const j = obj(await fetchJson(url));
    const sr = obj(obj(j._embedded).searchResult);
    const objects = arr(obj(sr._embedded).objects);

    const docs: ThesisDoc[] = [];
    for (const o of objects) {
      const item = obj(obj(obj(o)._embedded).indexableObject);
      const d = itemToDoc(item, repo, set);
      if (d) docs.push(d);
    }
    if (docs.length) await sink(docs);
    count += docs.length;

    const pageInfo = obj(sr.page);
    const totalPages = Number(pageInfo.totalPages || 0);
    if (!objects.length || p + 1 >= totalPages) break;
    await sleep(500);
  }

  log("    " + set.spec + " -> " + count);
  return count;
}
