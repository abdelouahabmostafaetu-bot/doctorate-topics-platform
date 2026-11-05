import { harvestRunsCollection, harvestSkipsCollection, opportunitiesCollection, type Opportunity, type OpportunityKind } from "./store";
import { translateOpportunity } from "./translate";

/**
 * Automatic collection of mathematics PhD positions and scholarships.
 *
 * Sources are public, machine-readable listings:
 *  - MathJobs.org (AMS): the full public job list + schema.org JobPosting
 *    data on each listing page. robots.txt asks for a 5 s crawl delay, so
 *    detail pages are fetched sequentially and only for new listings.
 *  - EURAXESS (European Commission): the public RSS job feed.
 *
 * Harvested records are published automatically with origin != "manual".
 * Once the SUPER_ADMIN edits a record it becomes manual and the harvester
 * never overwrites it again (it only refreshes lastSeenAt).
 */

const UA = "Mozilla/5.0 (compatible; DocMathDZ-opportunities/1.0; +https://www.docmathdz.dev)";
const MATHJOBS = "https://www.mathjobs.org";
const MATHJOBS_DELAY_MS = 5_000;

export type HarvestReport = {
  startedAt: Date;
  finishedAt: Date;
  sources: Record<string, { seen: number; created: number; updated: number; closed: number; error?: string }>;
};

type Candidate = {
  origin: "mathjobs" | "euraxess";
  sourceUrl: string;
  title: string;
  organization: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string, timeoutMs = 20_000) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

// ---------- text helpers ----------
const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
export function decodeEntities(s: string) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}
export function htmlToText(html: string) {
  return decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<(br|\/p|\/div|\/h\d|\/li|\/tr)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + "…" : s);

// ---------- classification ----------
const PHD_RX = /\b(ph\.?\s?d|doctoral|doctorate|doktorand|doctorant|th[eè]se|studentship)\b/i;
const SCHOLARSHIP_RX = /\b(scholarships?|fellowships? for (master|phd|doctoral)|bourses?)\b/i;
const EXCLUDE_RX = /\b(post[\s-]?doc|posdoc|hire\b|intern(ship)?\b|quant(itative)? (research|trad)|summit\b|lecturer|professor|faculty|tenure|director|manager|engineer(?!ing)|technician|(junior|senior|research) (fellow|scientist|associate)|member(ship)?s?\b)/i;
const MATH_RX = /\b(math|mathemat|statistic|probabilit|algebra|geometr|topolog|analysis|number theory|combinator|logic|pde|differential equation|numerical|optimi[sz]ation|dynamical system)/i;

export function classify(title: string): OpportunityKind | null {
  if (EXCLUDE_RX.test(title)) return null;
  if (PHD_RX.test(title)) return "phd";
  if (SCHOLARSHIP_RX.test(title)) return /master/i.test(title) ? "master" : "scholarship";
  return null;
}

export function detectFunding(text: string): Opportunity["fundingType"] {
  if (/fully[- ]funded|full (funding|scholarship)|fully financed|tuition (fee )?waiver.*(stipend|salary)/i.test(text)) return "fully_funded";
  if (/\b(salary|salaried|employment contract|TV-L|E ?13|gross (monthly|annual)|per (annum|month))\b/i.test(text)) return "salary";
  if (/\b(stipend|scholarship|funded position|funding is provided|bursary)\b/i.test(text)) return "fully_funded";
  if (/partial(ly)? fund/i.test(text)) return "partially_funded";
  return "unknown";
}

const regionAr = new Intl.DisplayNames(["ar"], { type: "region" });
const regionEn = new Intl.DisplayNames(["en"], { type: "region" });
let nameToCode: Map<string, string> | null = null;
function codeFromName(name: string) {
  if (!nameToCode) {
    nameToCode = new Map([["usa", "US"], ["u.s.a.", "US"], ["united states of america", "US"], ["uk", "GB"], ["england", "GB"], ["scotland", "GB"], ["korea", "KR"], ["south korea", "KR"], ["czech republic", "CZ"], ["russia", "RU"]]);
    for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      try { const n = regionEn.of(code); if (n && n !== code) nameToCode.set(n.toLowerCase(), code); } catch { /* invalid code */ }
    }
  }
  return nameToCode.get(name.replace(/\(.*?\)/g, "").trim().toLowerCase().replace(/\.$/, ""));
}
export function countryLabel(codeOrName?: string, fallback = "") {
  const raw = (codeOrName || "").trim();
  const c = /^[A-Za-z]{2}$/.test(raw) ? raw.toUpperCase() : codeFromName(raw);
  if (c) {
    try { return `${regionEn.of(c)} / ${regionAr.of(c)}`; } catch { /* ignore */ }
  }
  return raw || fallback || "Unspecified / غير محدد";
}

// ---------- MathJobs ----------
async function mathjobsCandidates(): Promise<Candidate[]> {
  const html = await get(`${MATHJOBS}/jobs?joblst-0-0------`);
  const out: Candidate[] = [];
  // Each employer block: <h3 ...><a ...>Employer</a></h3><ol ...> <li>[<a href="/jobs/list/ID">CODE</a>] <span>Title</span>
  const blocks = html.split(/<h3[^>]*>/i).slice(1);
  for (const block of blocks) {
    const org = htmlToText((block.match(/^([\s\S]*?)<\/h3>/i)?.[1] || "")).trim();
    for (const m of block.matchAll(/href="\/jobs\/list\/(\d+)"[^>]*>[^<]*<\/a>\]\s*<span[^>]*>([\s\S]*?)<\/span>/gi)) {
      const title = htmlToText(m[2]);
      if (!classify(title) || /\(filled\)/i.test(title)) continue;
      out.push({ origin: "mathjobs", sourceUrl: `${MATHJOBS}/jobs/list/${m[1]}`, title, organization: org });
    }
  }
  return out;
}

type JobPosting = {
  title?: string; description?: string; datePosted?: string; validThrough?: string;
  hiringOrganization?: { name?: string; sameAs?: string };
  jobLocation?: { address?: { addressCountry?: string; addressLocality?: string } };
};

/** Value cell that follows a `<b>Label:</b>` cell on a MathJobs listing page. */
function mjField(html: string, label: string) {
  // Labels are prefixed by the listing type: "Position Location", "Scholarship Location", ...
  const m = html.match(new RegExp(`<b>(?:[A-Za-z]+ )?${label}:</b></div>\\s*<div[^>]*>([\\s\\S]*?)</div>`, "i"));
  return m ? m[1] : "";
}

async function mathjobsDetail(c: Candidate) {
  const html = await get(c.sourceUrl);
  // Some responses carry schema.org JobPosting JSON-LD; the HTML table is always present.
  const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i)?.[1];
  let job: JobPosting = {};
  try { job = ld ? JSON.parse(ld) : {}; } catch { job = {}; }
  const section = html.match(/<h3 class="sr-only">[A-Za-z]+ Description<\/h3>([\s\S]*?)<\/section>/i)?.[1] || "";
  const description = htmlToText(job.description || section);
  const materials = html.match(/Application Materials Required:[\s\S]*?<ul>([\s\S]*?)<\/ul>/i)?.[1];
  const documents = materials ? htmlToText(materials).replace(/^•\s*/gm, "").split("\n").map((s) => s.trim()).filter(Boolean) : [];
  const applyExternal = mjField(html, "Description").match(/href="(https?:\/\/(?!www\.mathjobs\.org)[^"]+)"/i)?.[1] || "";
  const further = html.match(/<b>Further Info:<\/b>[\s\S]{0,300}?href="(https?:\/\/[^"]+)"/i)?.[1] || applyExternal;
  const deadlineRaw = htmlToText(mjField(html, "Appl Deadline"));
  const ymd = deadlineRaw.match(/^\s*(\d{4})\/(\d{2})\/(\d{2})/); // not the "(posted …)" date
  const deadline = (job.validThrough || (ymd ? `${ymd[1]}-${ymd[2]}-${ymd[3]}` : "")).slice(0, 10);
  const locText = htmlToText(mjField(html, "Location")).replace(/\[\s*map\s*\]/i, "").trim();
  const locParts = locText.split(",").map((x) => x.trim()).filter(Boolean);
  const loc = job.jobLocation?.address;
  const countryRaw = loc?.addressCountry || locParts.at(-1) || "";
  const city = loc?.addressLocality || (locParts.length > 1 ? locParts[0] : "");
  const title = job.title || htmlToText(mjField(html, "Title")) || c.title;
  return {
    title,
    positionType: htmlToText(mjField(html, "Type")),
    organization: job.hiringOrganization?.name || c.organization,
    country: countryLabel(countryRaw, city),
    city,
    description,
    documents,
    deadline: /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? deadline : "",
    deadlineTime: /\d{2}:\d{2}/.test(deadlineRaw) ? deadlineRaw.match(/\d{2}:\d{2}/)![0] + " (US Eastern, per MathJobs)" : "",
    furtherInfo: further,
    applyUrl: applyExternal,
  };
}

// ---------- EURAXESS ----------
async function euraxessCandidates(): Promise<(Candidate & { summary: string; posted?: string })[]> {
  const xml = await get("https://euraxess.ec.europa.eu/job-feed");
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);
  const tag = (s: string, t: string) => decodeEntities((s.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, "i"))?.[1] || "").replace(/<!\[CDATA\[|\]\]>/g, "")).trim();
  return items
    .map((it) => ({
      origin: "euraxess" as const,
      sourceUrl: tag(it, "link"),
      title: htmlToText(tag(it, "title")),
      organization: htmlToText(tag(it, "dc:creator")),
      summary: htmlToText(tag(it, "description")),
      posted: tag(it, "pubDate"),
    }))
    .filter((c) => /^https:\/\/euraxess\.ec\.europa\.eu\/jobs\/\d+$/.test(c.sourceUrl))
    .filter((c) => (classify(c.title) || PHD_RX.test(c.summary)) && !EXCLUDE_RX.test(c.title) && MATH_RX.test(`${c.title} ${c.summary}`));
}

// ---------- persistence ----------
function todayIso() { return new Date().toISOString().slice(0, 10); }

async function ensureIndexes() {
  const col = opportunitiesCollection();
  await col.createIndex({ sourceUrl: 1 }, { unique: true, partialFilterExpression: { origin: { $in: ["mathjobs", "euraxess"] } }, name: "auto_source_unique" }).catch(() => undefined);
  await col.createIndex({ published: 1, updatedAt: -1 }).catch(() => undefined);
}

export async function runHarvest(opts: { maxDetails?: number; deadlineMs?: number } = {}): Promise<HarvestReport> {
  const startedAt = new Date();
  const stopAt = Date.now() + (opts.deadlineMs ?? 50_000);
  const maxDetails = opts.maxDetails ?? 6;
  const col = opportunitiesCollection();
  await ensureIndexes();
  const report: HarvestReport = { startedAt, finishedAt: startedAt, sources: {} };
  const now = () => new Date();

  // ---- MathJobs ----
  const mj = { seen: 0, created: 0, updated: 0, closed: 0 } as HarvestReport["sources"][string];
  report.sources.mathjobs = mj;
  try {
    const cands = await mathjobsCandidates();
    mj.seen = cands.length;
    const urls = cands.map((c) => c.sourceUrl);
    const existing = await col.find({ sourceUrl: { $in: urls } }, { projection: { sourceUrl: 1, origin: 1 } }).toArray();
    const known = new Set(existing.map((e) => e.sourceUrl));
    // Listings already covered by a curated/manual record (via referenceUrl) are skipped.
    const { curatedOpportunities } = await import("./curated");
    for (const r of curatedOpportunities) if (r.referenceUrl) known.add(r.referenceUrl);
    for (const r of await col.find({ referenceUrl: { $in: urls } }, { projection: { referenceUrl: 1 } }).toArray()) { if (r.referenceUrl) known.add(r.referenceUrl); };
    const skips = harvestSkipsCollection();
    for (const r of await skips.find({ sourceUrl: { $in: urls } }).toArray()) known.add(r.sourceUrl);
    const skip = (sourceUrl: string, reason: string) => skips.updateOne({ sourceUrl }, { $set: { sourceUrl, reason, at: now() } }, { upsert: true });
    // Still listed → refresh lastSeen/verifiedAt (auto records only).
    if (existing.length) {
      const r = await col.updateMany({ sourceUrl: { $in: urls }, origin: "mathjobs" }, { $set: { lastSeenAt: now(), verifiedAt: now() } });
      mj.updated = r.modifiedCount;
    }
    // No longer listed → closed.
    const gone = await col.updateMany({ origin: "mathjobs", sourceUrl: { $nin: urls }, sourceStatus: { $ne: "closed" } }, { $set: { sourceStatus: "closed", updatedAt: now() } });
    mj.closed = gone.modifiedCount;

    let fetched = 0;
    for (const c of cands.filter((c) => !known.has(c.sourceUrl))) {
      if (fetched >= maxDetails || Date.now() + MATHJOBS_DELAY_MS + 15_000 > stopAt) break;
      if (fetched > 0) await sleep(MATHJOBS_DELAY_MS);
      fetched++;
      const d = await mathjobsDetail(c);
      const kind = classify(d.title);
      const text = `${d.title}\n${d.description}`;
      if (!kind || /post[\s-]?doc/i.test(d.positionType)) { await skip(c.sourceUrl, "not-phd"); continue; }
      if (!MATH_RX.test(`${text} ${d.organization}`)) { await skip(c.sourceUrl, "not-math"); continue; }
      if (d.deadline && d.deadline < todayIso()) { await skip(c.sourceUrl, "expired"); continue; }
      const t = now();
      const base: Omit<Opportunity, "_id"> = {
        titleEn: d.title, titleAr: "", university: d.organization, country: d.country,
        field: "Mathematics / الرياضيات", kind, fundingType: detectFunding(text),
        descriptionEn: clip(d.description, 2500), descriptionAr: "",
        fundingEn: "", fundingAr: "", eligibilityEn: "", eligibilityAr: "",
        documentsEn: d.documents.map((x, i) => `${i + 1}. ${x}`).join("\n"), documentsAr: "",
        applicationEn: d.applyUrl
          ? "Applications are submitted on the employer's own website (Apply button below). The MathJobs announcement is kept as the source."
          : "Apply online through MathJobs (official AMS job board) using the button below, and check the employer's page for any additional instructions.",
        applicationAr: d.applyUrl
          ? "يتم التقديم عبر الموقع الرسمي للجهة المعلنة (زر التقديم أدناه)، مع إبقاء إعلان MathJobs كمصدر."
          : "قدّم إلكترونيًا عبر منصة MathJobs (التابعة للجمعية الأمريكية للرياضيات) من الزر أدناه، وراجع صفحة الجهة المعلنة لأي تعليمات إضافية.",
        deadline: d.deadline, deadlineTimezone: d.deadlineTime,
        sourceUrl: c.sourceUrl, applicationUrl: d.applyUrl || c.sourceUrl, sourceName: "MathJobs.org (AMS)",
        referenceUrl: d.furtherInfo, fundingUrl: "",
        sourceStatus: "open",
        published: true, origin: "mathjobs", lastSeenAt: t,
        verifiedAt: t, updatedAt: t, createdAt: t,
      };
      const ar = await translateOpportunity(base);
      await col.updateOne({ sourceUrl: c.sourceUrl }, { $setOnInsert: { ...base, ...ar } }, { upsert: true });
      mj.created++;
    }
  } catch (e) {
    mj.error = e instanceof Error ? e.message : String(e);
  }

  // ---- EURAXESS ----
  const ex = { seen: 0, created: 0, updated: 0, closed: 0 } as HarvestReport["sources"][string];
  report.sources.euraxess = ex;
  try {
    const cands = await euraxessCandidates();
    ex.seen = cands.length;
    for (const c of cands) {
      if (Date.now() + 10_000 > stopAt) break;
      const exists = await col.findOne({ sourceUrl: c.sourceUrl }, { projection: { _id: 1 } });
      if (exists) { await col.updateOne({ _id: exists._id, origin: "euraxess" }, { $set: { lastSeenAt: now(), verifiedAt: now() } }); ex.updated++; continue; }
      const t = now();
      const base: Omit<Opportunity, "_id"> = {
        titleEn: c.title, titleAr: "", university: c.organization || "—", country: "Europe / أوروبا",
        field: "Mathematics / الرياضيات", kind: classify(c.title) || "phd", fundingType: detectFunding(`${c.title} ${c.summary}`),
        descriptionEn: c.summary, descriptionAr: "", fundingEn: "", fundingAr: "", eligibilityEn: "", eligibilityAr: "",
        documentsEn: "", documentsAr: "",
        applicationEn: "Open the EURAXESS announcement for the full description, eligibility and the application link.",
        applicationAr: "افتح إعلان EURAXESS للاطلاع على الوصف الكامل والشروط ورابط التقديم.",
        deadline: "", deadlineTimezone: "", sourceUrl: c.sourceUrl, applicationUrl: c.sourceUrl,
        sourceName: "EURAXESS (European Commission)", referenceUrl: "", fundingUrl: "",
        sourceStatus: "open", published: true, origin: "euraxess", lastSeenAt: t,
        verifiedAt: t, updatedAt: t, createdAt: t,
      };
      const ar = await translateOpportunity(base);
      await col.updateOne({ sourceUrl: c.sourceUrl }, { $setOnInsert: { ...base, ...ar } }, { upsert: true });
      ex.created++;
    }
    // EURAXESS feed only keeps ~20 latest items: expire auto records after 60 days unseen.
    const old = await col.updateMany({ origin: "euraxess", sourceStatus: { $ne: "closed" }, lastSeenAt: { $lt: new Date(Date.now() - 60 * 86_400_000) } }, { $set: { sourceStatus: "closed", updatedAt: now() } });
    ex.closed = old.modifiedCount;
  } catch (e) {
    ex.error = e instanceof Error ? e.message : String(e);
  }

  // Deadline passed → closed (auto records).
  await col.updateMany({ origin: { $in: ["mathjobs", "euraxess"] }, sourceStatus: "open", deadline: { $gt: "", $lt: todayIso() } }, { $set: { sourceStatus: "closed" } });

  report.finishedAt = new Date();
  await harvestRunsCollection<HarvestReport>().insertOne({ ...report }).catch(() => undefined);
  return report;
}

export async function lastHarvestRun(): Promise<HarvestReport | null> {
  try {
    return (await harvestRunsCollection<HarvestReport>().find({}).sort({ startedAt: -1 }).limit(1).next()) ?? null;
  } catch { return null; }
}
