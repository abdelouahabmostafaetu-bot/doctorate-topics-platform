// Legacy DSpace (JSPUI 5/6 and XMLUI) harvester.
//
// Why this file exists
// --------------------
// Several Algerian repositories have no usable OAI service:
//   * Biskra answers HTTP 500 to every verb -- the classic symptom of a Solr
//     "oai" core that was never populated (`dspace oai import` was never run).
//   * Blida, Adrar, Djelfa, Relizane and Mila expose no OAI endpoint at all.
//
// The DSpace 7 REST client in rest.ts is not an option either: these old
// installs are JSPUI/XMLUI and have no /server/api endpoint.
//
// Two routes were measured and rejected before settling on the one below:
//   * /htmlmap and /sitemap: 404 on all four servers (identical byte size to
//     the generic JSPUI error page), so `generate-sitemaps` was never run.
//   * OpenSearch: /open-search/description.xml answers 200 but is the stock
//     file, with no <Url template> element -- the feed is disabled in
//     dspace.cfg, and /open-search/discover returns 400 for every parameter
//     combination tried.
//
// The fast path: /handle/X/Y/browse
// ---------------------------------
// JSPUI exposes a browse listing per container that accepts `rpp`, and its
// table already carries issue date, title, handle and authors:
//
//   <td headers="t1"><em>2017</em></td>
//   <td headers="t2"><a href="/jspui/handle/123456789/8368">La 2-domination...</a></td>
//   <td headers="t3"><a href="...?type=author&value=...">Namoune., Maroua.</a></td>
//
// Measured live: Blida 123456789/60 answers "Showing results 1 to 100 of
// 1015" in a single 67 KB response. That is 11 requests for a department that
// used to cost 1015 item fetches plus 51 listing pages.
//
// The author column even marks supervisors -- "Boudjemaa, R. (promoteur)",
// "Zerrouki, B. (Co-promoteur)" -- which the item page does not always do.
//
// What browse does NOT give is the abstract, the subject keywords and
// citation_pdf_url. Those still require the item page, so the slow path below
// is kept for repositories where browse is unavailable (Adrar and Relizane
// answer it with an error page) and can later be used to enrich rows.
//
// Speed rules for the slow path
// -----------------------------
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
/** How many rows we ask /browse for. DSpace caps rpp; 100 is accepted. */
const BROWSE_PAGE = 100;
/** Hard stop, whatever the server claims the total to be. */
const MAX_PAGES = 300;
/** How deep we follow community -> sub-community -> collection. */
const MAX_DEPTH = 4;
/** Safety net so a cyclic breadcrumb cannot make us crawl a whole repository. */
const MAX_CONTAINERS = 400;
/** Listing pages are worth waiting for: losing one loses up to 100 items. */
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

// ---------------------------------------------------------------------------
// Fast path: /handle/X/Y/browse?type=title&rpp=100
// ---------------------------------------------------------------------------

export type BrowseRow = {
  handle: string;
  title: string;
  /** yearOf() returns null when no date could be parsed. */
  year: number | null;
  people: string[];
};

/** "Showing results 1 to 100 of 1015" -> 1015 */
export function browseTotal(html: string): number | null {
  const text = stripTags(html);
  const m = /\b\d+\s+to\s+\d+\s+of\s+(\d+)\b/i.exec(text);
  return m ? Number(m[1]) : null;
}

/**
 * Rows of a JSPUI browse table. Cells are identified by their `headers`
 * attribute (t1 = issue date, t2 = title + handle, t3 = authors), which is
 * stable across JSPUI themes -- unlike class names, which Blida, Mila and
 * Relizane all style differently.
 */
export function browseRows(html: string): BrowseRow[] {
  const out: BrowseRow[] = [];
  for (const row of html.split(/<tr\b/i).slice(1)) {
    const t2 =
      /<td[^>]*headers\s*=\s*["']?t2["']?[^>]*>([\s\S]*?)<\/td>/i.exec(row);
    if (!t2) continue;
    const link =
      /<a\b[^>]*href\s*=\s*["'][^"']*\/handle\/(\d+\/\d+)["'][^>]*>([\s\S]*?)<\/a>/i.exec(
        t2[1]
      );
    if (!link) continue;
    const title = stripTags(link[2]);
    if (!title) continue;

    const t1 =
      /<td[^>]*headers\s*=\s*["']?t1["']?[^>]*>([\s\S]*?)<\/td>/i.exec(row);
    const t3 =
      /<td[^>]*headers\s*=\s*["']?t3["']?[^>]*>([\s\S]*?)<\/td>/i.exec(row);

    const people: string[] = [];
    if (t3) {
      const re = /<a\b[^>]*>([\s\S]*?)<\/a>/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(t3[1]))) {
        const v = stripTags(m[1]);
        if (v) people.push(v);
      }
      // Some themes print the authors as plain text with no links.
      if (!people.length) {
        for (const v of stripTags(t3[1]).split(";")) {
          const s = v.trim();
          if (s) people.push(s);
        }
      }
    }

    out.push({
      handle: link[1],
      title,
      year: yearOf([stripTags(t1?.[1] || "")]),
      people,
    });
  }
  return out;
}

/**
 * The author column mixes authors and supervisors, but Algerian deposits
 * annotate the latter: "Boudjemaa, R. (promoteur)", "Zerrouki, B.
 * (Co-promoteur)", "(encadreur)", "(directeur de these)".
 */
const SUPERVISOR_RE =
  /\((?:\s*co[\s-]*)?(?:promot|encadr|direct|supervis|rapporteur|\u0645\u0634\u0631\u0641)/i;

/** Build a ThesisDoc from a browse row -- no item page fetched. */
export function rowToDoc(
  row: BrowseRow,
  repo: RepoDef,
  set: SetDef
): ThesisDoc | null {
  if (!row.title) return null;

  const people = cleanPeople(row.people, repo.nameFr);
  const supervisors = people.filter((p) => SUPERVISOR_RE.test(p));
  const authors = people.filter((p) => !SUPERVISOR_RE.test(p));

  const text = norm([row.title, set.label].join(" "));
  const verdict = classify(text, set.purity);
  const degree = detectDegree([set.label, row.title], set.degree);
  const branch = detectBranch(text);
  const site = repo.site.replace(/\/+$/, "");

  return {
    _id: repo.key + "|html:" + row.handle,
    repo: repo.key,
    uniFr: repo.nameFr,
    uniAr: repo.nameAr,
    uniSlug: repo.slug,
    wilaya: repo.wilaya,
    oaiId: "html:" + row.handle,
    setSpecs: [set.spec],
    title: row.title,
    abstract: "",
    authors,
    supervisors,
    keywords: [],
    year: row.year,
    degree,
    degreeAr: DEGREE_AR[degree],
    branch: branch.key,
    branchAr: branch.ar,
    lang: detectLang(row.title),
    landingUrl: site + "/handle/" + row.handle,
    st: buildSearchText(
      row.title,
      "",
      authors,
      supervisors,
      [],
      repo.nameAr,
      repo.nameFr
    ),
    status: verdict.status,
    reason: verdict.reason,
    datestamp: "",
    updatedAt: new Date(),
  };
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
 * Harvests a container through its browse listing.
 *
 * Returns the number of items stored, or null when this server does not serve
 * a usable browse table for that handle -- Adrar and Relizane answer it with
 * a ~7 KB error page -- so the caller can fall back to the slow path.
 *
 * At community level browse returns every item underneath, which is exactly
 * what we want: no tree walk needed when it works.
 */
async function browseContainer(ctx: Ctx, handle: string): Promise<number | null> {
  const { site, repo, set, sink, log } = ctx;
  const base =
    site +
    "/handle/" +
    handle +
    "/browse?type=title&sort_by=1&order=ASC&etal=-1&rpp=" +
    BROWSE_PAGE +
    "&offset=";

  let total = Number.POSITIVE_INFINITY;
  let count = 0;

  for (let p = 0; p < MAX_PAGES; p++) {
    const offset = p * BROWSE_PAGE;
    if (offset >= total) break;

    let html: string;
    try {
      html = await fetchPage(base + offset, LIST_TIMEOUT, 2);
    } catch (e) {
      // Failing on the very first page means browse is not usable here.
      if (p === 0) return null;
      log("      browse offset=" + offset + " -> " + (e instanceof Error ? e.message : String(e)));
      break;
    }

    const rows = browseRows(html);
    if (p === 0) {
      if (!rows.length) return null;
      const t = browseTotal(html);
      if (t !== null) total = t;
      log(
        "    " + handle + " -> browse: " + (t ?? rows.length) + " items, " +
          BROWSE_PAGE + " par requete"
      );
    }
    if (!rows.length) break;

    const docs: ThesisDoc[] = [];
    for (const r of rows) {
      if (ctx.seenItems.has(r.handle)) continue;
      ctx.seenItems.add(r.handle);
      if (ctx.known.has(r.handle)) {
        ctx.resumed++;
        continue;
      }
      const d = rowToDoc(r, repo, set);
      if (d) docs.push(d);
    }

    if (docs.length) await sink(docs);
    count += docs.length;
    await sleep(300);
  }

  return count;
}

/**
 * Walks one container: paginates its items, and queues every child container
 * it links to. Returns the number of items stored.
 */
async function walkContainer(ctx: Ctx, handle: string, depth: number): Promise<number> {
  const { site, repo, set, sink, log } = ctx;

  // Fast path first. One request per 100 items instead of one per item.
  const viaBrowse = await browseContainer(ctx, handle);
  if (viaBrowse !== null) return viaBrowse;

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
      if (t !== null) log("    " + handle + " -> " + t + " items annonces (lent)");
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
