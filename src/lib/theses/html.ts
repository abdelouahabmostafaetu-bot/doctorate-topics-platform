// Legacy DSpace (JSPUI 5/6 and XMLUI) harvester.
//
// Why this file exists
// --------------------
// Several Algerian repositories have no usable OAI service:
//   * Biskra answers HTTP 500 to every verb -- the classic symptom of a Solr
//     "oai" core that was never populated (`dspace oai import` was never run).
//   * Blida, Adrar, Djelfa and Relizane expose no OAI endpoint at all.
//
// The DSpace 7 REST client in rest.ts is not an option either: these old
// installs are JSPUI/XMLUI and have no /server/api endpoint.
//
// What DOES still work is the public web interface. A collection page lists
// its items 20 at a time via ?offset=N, and every item page carries Dublin
// Core and Google Scholar <meta> tags -- enough to build a full ThesisDoc,
// direct PDF link included (citation_pdf_url).
//
// Containers vs collections
// -------------------------
// A registry entry such as "Departement de Mathematique" is very often a
// *community* holding collections, not a collection holding items. Confirmed
// on Blida 123456789/56, Relizane 123456789/27 and Adrar 123456789/111: the
// page says "Community home page" and links to "Memoires de Licence",
// "Memoires de Master", "Theses de Doctorat"... We walk down that tree instead
// of giving up.
//
// Speed
// -----
// These servers are slow and drop connections under load: Blida timed out on
// most item pages, and with retries enabled a single failure cost 122 s. One
// department alone (123456789/60) announces 1015 items, so that is unusable.
// Three rules keep the run bounded:
//   1. item pages get a short timeout and NO retry -- a page this server
//      cannot serve in 25 s will not be served in 60 s either;
//   2. the harvest is resumable: handles already stored are never re-fetched,
//      so re-running the command keeps making progress;
//   3. a circuit breaker abandons a container after too many failures in a
//      row instead of grinding through a thousand timeouts.
//
// harvest.ts calls this for mode "html", and automatically as a fallback when
// OAI harvesting returns nothing but errors.

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
import { thesesCol, type ThesisDoc } from "./db";
import { getText } from "./http";
import { specToHandle } from "./rest";

/** JSPUI collection listings are paginated 20 by 20. */
const PAGE = 20;
/** Hard stop, whatever the server claims the total to be. */
const MAX_PAGES = 300;
/** How deep we follow community -> sub-community -> collection. */
const MAX_DEPTH = 4;
/** Safety net so a cyclic breadcrumb cannot make us crawl a whole repository. */
const MAX_CONTAINERS = 400;
/** Listing pages are worth waiting for: losing one loses 20 items. */
const LIST_TIMEOUT = 60000;
/** Item pages are cheap to lose and can be picked up on the next run. */
const ITEM_TIMEOUT = 25000;
/** Consecutive item failures before we give up on a container. */
const MAX_STREAK = 20;

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

/** Breadcrumb / trail regions: they link to ancestors, never to children. */
const BREADCRUMB_RE =
  /<(ol|ul|div|p)\b[^>]*(?:breadcrumb|trail)[^>]*>[\s\S]*?<\/\1>/gi;

/**
 * Handles ("123456789/1234") that this page links *down* to: items when it is
 * a collection, sub-collections when it is a community.
 *
 * Selecting by enclosing element does not work -- probe-html.ts showed that
 * Blida, Relizane and Adrar put their child links in bare <div>s while their
 * facet links sit in <ul class="list-group">. What reliably separates them is
 * the URL suffix:
 *
 *   /handle/123456789/65               -> a child, keep
 *   /handle/123456789/56/statistics    -> a view of this page, skip
 *   /handle/123456789/56/simple-search -> a facet of this page, skip
 *   /handle/123456789/27?locale=fr     -> this page again, skip
 *
 * So: keep a handle only when nothing follows it, and drop everything linked
 * from the breadcrumb.
 */
export function itemHandles(html: string, self: string): string[] {
  const ancestors = new Set<string>();
  for (const region of html.match(BREADCRUMB_RE) || []) {
    const re = /\/handle\/(\d+\/\d+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(region))) ancestors.add(m[1]);
  }

  const out: string[] = [];
  const seen = new Set<string>([self]);
  const re = /\/handle\/(\d+\/\d+)([\s\S]?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const h = m[1];
    const next = m[2];
    // Anything but the end of the URL means it is a sub-page of the handle.
    if (next === "/" || next === "?" || next === "&" || next === ";") continue;
    if (seen.has(h) || ancestors.has(h)) continue;
    seen.add(h);
    out.push(h);
  }
  return out;
}

/** "Collection's Items ... : 1 to 20 of 175" -> 175 */
export function totalItems(html: string): number | null {
  const text = stripTags(html);
  const m =
    /\b\d+\s+to\s+\d+\s+of\s+(\d+)\b/i.exec(text) ||
    // XMLUI phrasing: "Now showing items 1-20 of 27"
    /showing\s+items?\s+\d+\s*-\s*\d+\s+of\s+(\d+)/i.exec(text);
  return m ? Number(m[1]) : null;
}

/**
 * True when a /handle/ page is a community (or any container listing other
 * containers) rather than a collection listing items.
 */
export function isContainerPage(html: string): boolean {
  const text = stripTags(html);
  return (
    /Collections?\s+in\s+this\s+community/i.test(text) ||
    /Sub-?communit(y|ies)\s+within/i.test(text) ||
    /Community\s+home\s+page/i.test(text) ||
    /\u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0627\u062a\s+\u0641\u064a\s+\u0647\u0630\u0627/.test(text)
  );
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

/**
 * Handles already stored for this repository, so a second run does not pay
 * for them again. Failure is not fatal: we simply re-harvest everything.
 */
async function knownHandles(repoKey: string, log: (s: string) => void): Promise<Set<string>> {
  const out = new Set<string>();
  try {
    const col = await thesesCol();
    const cur = col.find(
      { repo: repoKey, oaiId: { $regex: "^html:" } },
      { projection: { oaiId: 1 } }
    );
    for await (const d of cur) {
      const id = String((d as { oaiId?: string }).oaiId || "");
      if (id.startsWith("html:")) out.add(id.slice(5));
    }
  } catch (e) {
    log("    (reprise impossible: " + (e instanceof Error ? e.message : String(e)) + ")");
  }
  return out;
}

type Ctx = {
  repo: RepoDef;
  set: SetDef;
  site: string;
  sink: (docs: ThesisDoc[]) => Promise<void>;
  log: (s: string) => void;
  /** Handles already stored by a previous run. */
  known: Set<string>;
  /** Handles already fetched as an item page during this run. */
  seenItems: Set<string>;
  /** Handles already walked as a container. */
  seenContainers: Set<string>;
  /** Child containers discovered while paginating, walked afterwards. */
  queue: Array<{ handle: string; depth: number }>;
  /** Items skipped because a previous run already stored them. */
  resumed: number;
};

function fetchPage(url: string, timeoutMs: number, tries: number) {
  return getText(url, {
    accept: "text/html,application/xhtml+xml,*/*",
    timeoutMs,
    tries,
  });
}

/**
 * Walks one container: paginates its items, and queues every child container
 * it links to. Returns the number of items stored.
 */
async function walkContainer(ctx: Ctx, handle: string, depth: number): Promise<number> {
  const { site, repo, set, sink, log } = ctx;
  let count = 0;
  let streak = 0;
  let total = Number.POSITIVE_INFINITY;
  const childCandidates = new Set<string>();

  for (let p = 0; p < MAX_PAGES; p++) {
    const offset = p * PAGE;
    if (offset >= total) break;

    const listUrl = site + "/handle/" + handle + (offset ? "?offset=" + offset : "");
    let list: string;
    try {
      list = await fetchPage(listUrl, LIST_TIMEOUT, 2);
    } catch (e) {
      if (p === 0) throw e;
      log("      " + listUrl + " -> " + (e instanceof Error ? e.message : String(e)));
      break;
    }

    if (p === 0) {
      const t = totalItems(list);
      if (t !== null) total = t;
      // A community lists containers only: no point paginating it.
      if (isContainerPage(list) && t === null) {
        const kids = itemHandles(list, handle);
        for (const h of kids) childCandidates.add(h);
        log("    " + handle + " -> communaute, " + kids.length + " enfant(s)");
        break;
      }
      if (t !== null) log("    " + handle + " -> " + t + " items annonces");
    }

    const all = itemHandles(list, handle);
    // Nothing new on this page means the server is repeating itself: stop.
    const fresh = all.filter((h) => !ctx.seenItems.has(h));
    if (!fresh.length) break;

    const docs: ThesisDoc[] = [];
    for (const h of fresh) {
      ctx.seenItems.add(h);
      // Already harvested by an earlier run: do not pay for it twice.
      if (ctx.known.has(h)) {
        ctx.resumed++;
        continue;
      }
      try {
        const page = await fetchPage(site + "/handle/" + h, ITEM_TIMEOUT, 1);
        streak = 0;
        const d = pageToDoc(page, h, repo, set);
        if (d) docs.push(d);
        // Not an item: it is a sub-community or sub-collection, walk it later.
        else if (!ctx.seenContainers.has(h)) childCandidates.add(h);
      } catch (e) {
        streak++;
        log("      " + h + " -> " + (e instanceof Error ? e.message : String(e)));
        if (streak >= MAX_STREAK) {
          log("      " + handle + " -> " + streak + " echecs de suite, on abandonne ce conteneur");
          break;
        }
      }
    }

    if (docs.length) await sink(docs);
    count += docs.length;
    if (streak >= MAX_STREAK) break;
    await sleep(300);
  }

  if (depth < MAX_DEPTH) {
    for (const h of childCandidates) {
      if (ctx.seenContainers.has(h)) continue;
      ctx.queue.push({ handle: h, depth: depth + 1 });
    }
  }

  return count;
}

export async function htmlHarvestSet(
  repo: RepoDef,
  set: SetDef,
  sink: (docs: ThesisDoc[]) => Promise<void>,
  log: (s: string) => void
): Promise<number> {
  const site = repo.site.replace(/\/+$/, "");
  const root = specToHandle(set.spec);
  if (!root) {
    log("    " + set.spec + " -> bad spec");
    return 0;
  }

  const ctx: Ctx = {
    repo,
    set,
    site,
    sink,
    log,
    known: await knownHandles(repo.key, log),
    seenItems: new Set<string>(),
    seenContainers: new Set<string>(),
    queue: [{ handle: root, depth: 0 }],
    resumed: 0,
  };

  let count = 0;
  let walked = 0;

  while (ctx.queue.length && walked < MAX_CONTAINERS) {
    const next = ctx.queue.shift();
    if (!next) break;
    if (ctx.seenContainers.has(next.handle)) continue;
    ctx.seenContainers.add(next.handle);
    walked++;
    try {
      count += await walkContainer(ctx, next.handle, next.depth);
    } catch (e) {
      // The root failing is a real error; a child failing is not fatal.
      if (next.handle === root) throw e;
      log("    " + next.handle + " -> " + (e instanceof Error ? e.message : String(e)));
    }
  }

  log(
    "    " + set.spec + " -> " + count + " (html, " + walked + " conteneur" +
      (walked > 1 ? "s" : "") +
      (ctx.resumed ? ", " + ctx.resumed + " deja en base" : "") + ")"
  );
  return count;
}
