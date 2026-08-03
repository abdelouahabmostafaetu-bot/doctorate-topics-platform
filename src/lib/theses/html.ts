// Legacy DSpace (JSPUI 5/6) harvester.
//
// Why this file exists
// --------------------
// Biskra's OAI service answers HTTP 500 to every verb -- ListIdentifiers and
// ListRecords, globally and per set. That is the classic symptom of a Solr
// "oai" core that was never populated (`dspace oai import` was never run by
// the administrators). No amount of retrying, backoff or TLS tuning on our
// side can fix a 500 produced by their Solr.
//
// The DSpace 7 REST client in rest.ts is not an option either: these old
// installs are JSPUI and have no /server/api endpoint at all.
//
// What DOES still work is the public web interface. A collection page lists
// its items 20 at a time via ?offset=N, and every item page carries Dublin
// Core and Google Scholar <meta> tags -- enough to build a full ThesisDoc,
// direct PDF link included (citation_pdf_url).
//
// harvest.ts calls this automatically when OAI harvesting returns nothing
// but errors, so no registry change is needed for future breakages.

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
import { getText } from "./http";
import { specToHandle } from "./rest";

/** JSPUI collection listings are paginated 20 by 20. */
const PAGE = 20;
/** Hard stop, whatever the server claims the total to be. */
const MAX_PAGES = 300;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_m, h: string) =>
      String.fromCodePoint(parseInt(h, 16))
    )
    .replace(/&#(\d+);/g, (_m, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n: string) => NAMED[n.toLowerCase()] ?? m);
}

function clean(s: string): string {
  return decodeEntities(s).replace(/\s+/g, " ").trim();
}

function stripTags(s: string): string {
  return clean(s.replace(/<[^>]*>/g, " "));
}

/** Every <meta> tag of a page, keyed by lower-cased name. */
export function metaTags(html: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const re = /<meta\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tag = m[0];
    // name= and content= may appear in either order.
    const name = /\bname\s*=\s*["']([^"']+)["']/i.exec(tag);
    const content = /\bcontent\s*=\s*["']([^"']*)["']/i.exec(tag);
    if (!name || !content) continue;
    const v = clean(content[1]);
    if (!v) continue;
    const k = name[1].toLowerCase();
    const list = out.get(k);
    if (list) list.push(v);
    else out.set(k, [v]);
  }
  return out;
}

/** First non-empty list among the given meta names. */
function pick(meta: Map<string, string[]>, ...keys: string[]): string[] {
  for (const k of keys) {
    const v = meta.get(k);
    if (v && v.length) return v;
  }
  return [];
}

/**
 * Item handles ("123456789/1234") linked from a collection listing page.
 * Only <table> regions are scanned, so breadcrumbs and sidebar facets -- which
 * point at communities, not items -- are ignored.
 */
export function itemHandles(html: string, self: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>([self]);
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) || [];
  const scope = tables.length ? tables.join("\n") : html;
  const re = /\/handle\/(\d+\/\d+)["'#?]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(scope))) {
    const h = m[1];
    if (seen.has(h)) continue;
    seen.add(h);
    out.push(h);
  }
  return out;
}

/** "Collection's Items ... : 1 to 20 of 175" -> 175 */
export function totalItems(html: string): number | null {
  const m = /\b\d+\s+to\s+\d+\s+of\s+(\d+)\b/i.exec(stripTags(html));
  return m ? Number(m[1]) : null;
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

function splitKeywords(list: string[]): string[] {
  const out: string[] = [];
  for (const raw of list) {
    const parts = raw.includes(";") ? raw.split(";") : [raw];
    for (const p of parts) {
      const v = p.trim();
      if (v && !out.includes(v)) out.push(v);
    }
  }
  return out.slice(0, 30);
}

export function pageToDoc(
  html: string,
  handle: string,
  repo: RepoDef,
  set: SetDef
): ThesisDoc | null {
  // Collection and community pages also live under /handle/, skip them.
  if (/(Collection|Community)\s+home\s+page/i.test(html)) return null;

  const meta = metaTags(html);

  const title =
    pick(meta, "citation_title", "dc.title", "dcterms.title")[0] ||
    stripTags(/<title>([\s\S]*?)<\/title>/i.exec(html)?.[1] || "").replace(
      /^[^:]{0,60}Repository:\s*/i,
      ""
    );
  if (!title) return null;

  const authors = cleanPeople(
    pick(meta, "citation_author", "dc.creator", "dc.contributor.author"),
    repo.nameFr
  );
  const supervisors = cleanPeople(
    [
      ...pick(meta, "dc.contributor.advisor"),
      ...pick(meta, "dc.contributor.other"),
      ...pick(meta, "dc.contributor"),
    ],
    repo.nameFr
  );
  const keywords = splitKeywords(
    pick(meta, "dc.subject", "dcterms.subject", "citation_keywords")
  );
  const abstract =
    pick(
      meta,
      "dcterms.abstract",
      "dc.description.abstract",
      "citation_abstract",
      "dc.description"
    )[0] || "";
  const types = pick(meta, "dc.type", "dcterms.type");
  const year = yearOf(
    pick(meta, "citation_date", "dcterms.issued", "dc.date.issued", "dc.date")
  );
  const pdfUrl = pick(meta, "citation_pdf_url")[0] || "";

  const rawText = [title, abstract, keywords.join(" "), types.join(" "), set.label].join(" ");
  const text = norm(rawText);
  const verdict = classify(text, set.purity);
  const degree = detectDegree([set.label, types.join(" "), title], set.degree);
  const branch = detectBranch(text);
  const site = repo.site.replace(/\/+$/, "");

  return {
    _id: repo.key + "|html:" + handle,
    repo: repo.key,
    uniFr: repo.nameFr,
    uniAr: repo.nameAr,
    uniSlug: repo.slug,
    wilaya: repo.wilaya,
    oaiId: "html:" + handle,
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
    landingUrl: site + "/handle/" + handle,
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
    datestamp: "",
    updatedAt: new Date(),
    ...(pdfUrl ? { pdfUrl, pdfAt: new Date() } : {}),
  };
}

export async function htmlHarvestSet(
  repo: RepoDef,
  set: SetDef,
  sink: (docs: ThesisDoc[]) => Promise<void>,
  log: (s: string) => void
): Promise<number> {
  const site = repo.site.replace(/\/+$/, "");
  const handle = specToHandle(set.spec);
  if (!handle) {
    log("    " + set.spec + " -> bad spec");
    return 0;
  }

  const seen = new Set<string>();
  let count = 0;
  let total = Number.POSITIVE_INFINITY;

  for (let p = 0; p < MAX_PAGES; p++) {
    const offset = p * PAGE;
    if (offset >= total) break;

    const listUrl =
      site + "/handle/" + handle + (offset ? "?offset=" + offset : "");
    const list = await getText(listUrl, {
      accept: "text/html,application/xhtml+xml,*/*",
      timeoutMs: 90000,
      tries: 3,
    });

    if (p === 0) {
      const t = totalItems(list);
      if (t !== null) {
        total = t;
        log("    " + set.spec + " -> " + t + " items announced");
      }
    }

    const fresh = itemHandles(list, handle).filter((h) => !seen.has(h));
    if (!fresh.length) break;

    const docs: ThesisDoc[] = [];
    for (const h of fresh) {
      seen.add(h);
      try {
        const page = await getText(site + "/handle/" + h, {
          accept: "text/html,application/xhtml+xml,*/*",
          timeoutMs: 60000,
          tries: 2,
        });
        const d = pageToDoc(page, h, repo, set);
        if (d) docs.push(d);
      } catch (e) {
        log("      " + h + " -> " + (e instanceof Error ? e.message : String(e)));
      }
    }

    if (docs.length) await sink(docs);
    count += docs.length;
    await sleep(400);
  }

  log("    " + set.spec + " -> " + count + " (html)");
  return count;
}
