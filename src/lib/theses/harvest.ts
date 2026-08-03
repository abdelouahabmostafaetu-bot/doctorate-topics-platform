import { blocks, firstValue, headerIsDeleted, oaiError, resumption, values } from "./xml";
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
import { enabledRepos, repoByKey, type RepoDef, type SetDef } from "./repos";
import { ensureIndexes, repoStateCol, thesesCol, type ThesisDoc } from "./db";
import { restHarvestSet } from "./rest";
import { htmlHarvestSet } from "./html";
import { getText } from "./http";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Uses the tolerant node:http(s) layer: many .dz certificates are expired and
// global fetch() would only say "fetch failed".
async function fetchXml(url: string, tries = 3): Promise<string> {
  return getText(url, {
    accept: "application/xml,text/xml,*/*",
    timeoutMs: 90000,
    tries,
  });
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

function pickLanding(ids: string[], repo: RepoDef): string {
  const urls = ids.filter((i) => /^https?:\/\//i.test(i));
  const handle = urls.find((u) => /\/handle\/|\/items\/|hdl\.handle\.net/.test(u));
  return handle || urls[0] || repo.site;
}

function toDoc(recordXml: string, repo: RepoDef, set: SetDef): ThesisDoc | null {
  const oaiId = firstValue(recordXml, "identifier");
  const title = values(recordXml, "dc:title")[0] || "";
  if (!oaiId || !title) return null;

  const datestamp = firstValue(recordXml, "datestamp");
  const setSpecs = values(recordXml, "setSpec");
  const authors = cleanPeople(values(recordXml, "dc:creator"), repo.nameFr);
  const supervisors = cleanPeople(values(recordXml, "dc:contributor"), repo.nameFr);
  const keywords = values(recordXml, "dc:subject").slice(0, 30);
  const descs = values(recordXml, "dc:description");
  const abstract = descs.sort((a, b) => b.length - a.length)[0] || "";
  const types = values(recordXml, "dc:type");
  const dcIds = values(recordXml, "dc:identifier");
  const year = yearOf(values(recordXml, "dc:date"));

  const rawText = [title, abstract, keywords.join(" "), types.join(" "), set.label].join(" ");
  const text = norm(rawText);
  const verdict = classify(text, set.purity);
  const degree = detectDegree([set.label, types.join(" "), title], set.degree);
  const branch = detectBranch(text);

  return {
    _id: repo.key + "|" + oaiId,
    repo: repo.key,
    uniFr: repo.nameFr,
    uniAr: repo.nameAr,
    uniSlug: repo.slug,
    wilaya: repo.wilaya,
    oaiId,
    setSpecs,
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
    landingUrl: pickLanding(dcIds, repo),
    st: buildSearchText(title, abstract, authors, supervisors, keywords, repo.nameAr, repo.nameFr),
    status: verdict.status,
    reason: verdict.reason,
    datestamp,
    updatedAt: new Date(),
  };
}

export type HarvestSummary = {
  repo: string;
  found: number;
  saved: number;
  review: number;
  rejected: number;
  bySet: Record<string, number>;
  mode?: string;
  error?: string;
};

async function harvestSet(
  repo: RepoDef,
  set: SetDef,
  sink: (docs: ThesisDoc[]) => Promise<void>,
  log: (s: string) => void
): Promise<number> {
  let url = repo.oai + "?verb=ListRecords&metadataPrefix=oai_dc&set=" + encodeURIComponent(set.spec);
  let count = 0;
  let guard = 0;
  while (url && guard++ < 400) {
    const xml = await fetchXml(url);
    const err = oaiError(xml);
    if (err) {
      if (err === "noRecordsMatch") return 0;
      throw new Error("OAI error: " + err);
    }
    const recs = blocks(xml, "record");
    const docs: ThesisDoc[] = [];
    for (const r of recs) {
      if (headerIsDeleted(r)) continue;
      const d = toDoc(r, repo, set);
      if (d) docs.push(d);
    }
    if (docs.length) await sink(docs);
    count += docs.length;
    const { token } = resumption(xml);
    url = token
      ? repo.oai + "?verb=ListRecords&resumptionToken=" + encodeURIComponent(token)
      : "";
    if (url) await sleep(700);
  }
  log("    " + set.spec + " -> " + count);
  return count;
}

// Fallback: harvest everything and keep only records whose setSpec is in our whitelist.
async function harvestFullFiltered(
  repo: RepoDef,
  sink: (docs: ThesisDoc[]) => Promise<void>,
  log: (s: string) => void
): Promise<number> {
  const wanted = new Map(repo.sets.map((s) => [s.spec, s]));
  let url = repo.oai + "?verb=ListRecords&metadataPrefix=oai_dc";
  let count = 0;
  let guard = 0;
  while (url && guard++ < 800) {
    const xml = await fetchXml(url);
    const err = oaiError(xml);
    if (err) {
      if (err === "noRecordsMatch") return 0;
      throw new Error("OAI error: " + err);
    }
    const docs: ThesisDoc[] = [];
    for (const r of blocks(xml, "record")) {
      if (headerIsDeleted(r)) continue;
      const specs = values(r, "setSpec");
      let hit: SetDef | undefined;
      for (const s of specs) {
        const w = wanted.get(s);
        if (w) {
          hit = w;
          break;
        }
      }
      if (!hit) continue;
      const d = toDoc(r, repo, hit);
      if (d) docs.push(d);
    }
    if (docs.length) await sink(docs);
    count += docs.length;
    const { token } = resumption(xml);
    url = token
      ? repo.oai + "?verb=ListRecords&resumptionToken=" + encodeURIComponent(token)
      : "";
    if (url) await sleep(700);
  }
  log("    full+filter -> " + count);
  return count;
}

export async function harvestRepo(
  repo: RepoDef,
  log: (s: string) => void = () => {}
): Promise<HarvestSummary> {
  const col = await thesesCol();
  const mode = repo.mode || "oai";
  const sum: HarvestSummary = {
    repo: repo.key,
    found: 0,
    saved: 0,
    review: 0,
    rejected: 0,
    bySet: {},
    mode,
  };

  const sink = async (docs: ThesisDoc[]) => {
    sum.found += docs.length;
    const ops = docs.map((d) => ({
      replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true },
    }));
    if (ops.length) await col.bulkWrite(ops, { ordered: false });
    for (const d of docs) {
      if (d.status === "ok") sum.saved++;
      else if (d.status === "review") sum.review++;
      else sum.rejected++;
    }
  };

  // One broken set must not kill the whole repository.
  let setErrors: string[] = [];

  try {
    let total = 0;
    for (const set of repo.sets) {
      const before = sum.found;
      try {
        const n =
          mode === "rest"
            ? await restHarvestSet(repo, set, sink, log)
            : await harvestSet(repo, set, sink, log);
        total += n;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setErrors.push(set.spec + ": " + msg);
        log("    " + set.spec + " -> ERROR " + msg);
      }
      sum.bySet[set.spec] = sum.found - before;
    }

    if (total === 0 && mode === "oai") {
      if (!setErrors.length) {
        log("  sets empty -> trying full harvest with filter");
        total += await harvestFullFiltered(repo, sink, log);
      } else {
        // Not one broken set but a dead OAI service: Biskra answers HTTP 500
        // to every verb because its Solr "oai" core was never imported, and
        // it is far too old for the DSpace 7 REST client. Its public JSPUI
        // pages are fine, so scrape those instead.
        log("  OAI unusable -> HTML fallback");
        const htmlErrors: string[] = [];
        for (const set of repo.sets) {
          const before = sum.found;
          try {
            total += await htmlHarvestSet(repo, set, sink, log);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            htmlErrors.push(set.spec + ": " + msg);
            log("    " + set.spec + " -> HTML ERROR " + msg);
          }
          sum.bySet[set.spec] = sum.found - before;
        }
        if (total > 0) {
          sum.mode = "oai->html";
          setErrors = htmlErrors;
        }
      }
    }
  } catch (e) {
    sum.error = e instanceof Error ? e.message : String(e);
  }

  if (!sum.error && setErrors.length) {
    sum.error = setErrors.join(" | ").slice(0, 600);
  }

  const state = await repoStateCol();
  await state.updateOne(
    { _id: repo.key },
    {
      $set: {
        lastRunAt: new Date(),
        ...(sum.error ? { error: sum.error } : { error: undefined, lastOkAt: new Date() }),
        found: sum.found,
        saved: sum.saved,
        rejected: sum.rejected,
        review: sum.review,
      },
    },
    { upsert: true }
  );

  return sum;
}

export async function harvestAll(
  only?: string,
  log: (s: string) => void = () => {}
): Promise<HarvestSummary[]> {
  await ensureIndexes();
  const list = only
    ? [repoByKey(only)].filter(Boolean as unknown as (r: RepoDef | undefined) => r is RepoDef)
    : enabledRepos();
  const out: HarvestSummary[] = [];
  for (const repo of list) {
    log("== " + repo.key + " (" + repo.nameFr + ") [" + (repo.mode || "oai") + "]");
    const s = await harvestRepo(repo, log);
    log(
      "   found=" + s.found + " ok=" + s.saved + " review=" + s.review + " rejected=" + s.rejected +
        (s.error ? " ERROR=" + s.error : "")
    );
    out.push(s);
  }
  return out;
}
