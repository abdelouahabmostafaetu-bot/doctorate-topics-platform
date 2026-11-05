import type { Opportunity, OpportunityKind } from "./store";

/** Shared fetch / parsing helpers for the opportunity harvesters. */

export const UA = "Mozilla/5.0 (compatible; DocMathDZ-opportunities/1.0; +https://www.docmathdz.dev)";
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const todayIso = () => new Date().toISOString().slice(0, 10);

export async function get(url: string, timeoutMs = 20_000, accept = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8") {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: accept }, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}
export async function getJson<T>(url: string, timeoutMs = 20_000): Promise<T> {
  return JSON.parse(await get(url, timeoutMs, "application/json")) as T;
}

// ---------- text ----------
const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…" };
export function decodeEntities(s: string) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}
export function htmlToText(html: string) {
  return decodeEntities(
    html
      .replace(/<!\[CDATA\[|\]\]>/g, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<(br|\/p|\/div|\/h\d|\/li|\/tr)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\r/g, "")
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
export const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + "…" : s);
/** Absolute http(s) links inside an HTML fragment. */
const SHARE_RX = /^https?:\/\/(www\.)?(twitter\.com|x\.com|facebook\.com|linkedin\.com\/(share|sharing)|api\.whatsapp\.com|wa\.me|t\.me\/share|reddit\.com\/submit|mailto:)/i;
export const hrefs = (html: string) => [...new Set([...html.matchAll(/href="(https?:\/\/[^"]+)"/gi)].map((m) => decodeEntities(m[1])).filter((u) => !SHARE_RX.test(u)))];
/** URL comparison key: no protocol, www, query, hash or trailing slash. */
export function normUrl(u: string) {
  return u.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/[?#].*$/, "").replace(/\/+$/, "");
}
/** True when the URL points to a specific page rather than a bare domain. */
export const isDeepUrl = (u: string) => normUrl(u).includes("/");

// ---------- RSS ----------
export type RssItem = { title: string; link: string; description: string; content: string; categories: string[]; pubDate: string; creator: string };
export function rssItems(xml: string): RssItem[] {
  const tag = (s: string, t: string) => (s.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, "i"))?.[1] || "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(([, it]) => ({
    title: htmlToText(decodeEntities(tag(it, "title"))),
    link: decodeEntities(tag(it, "link")),
    description: decodeEntities(tag(it, "description")),
    content: tag(it, "content:encoded"),
    categories: [...it.matchAll(/<category>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/gi)].map((m) => decodeEntities(m[1]).trim()),
    pubDate: tag(it, "pubDate"),
    creator: htmlToText(tag(it, "dc:creator")),
  }));
}

// ---------- classification ----------
export const PHD_RX = /\b(ph\.?\s?d|doctoral|doctorate|doktorand\w*|doctorant\w*|promovend\w*|th[eè]se|studentships?|pre-?doc(toral)?|praedoc)\b/i;
export const SCHOLARSHIP_RX = /\b(scholarships?|bursar(y|ies)|fellowships? for (master|phd|doctoral|graduate)|bourses?|master'?s? (fellowship|program(me)? scholarship))\b/i;
export const EXCLUDE_RX = /\b(post[\s-]?doc|posdoc|hire\b|intern(ship)?\b|quant(itative)? (research|trad)|summit\b|lecturer|professor|faculty|tenure|director|manager|engineer(?!ing)|technician|(junior|senior|research) (fellow|scientist|associate)|member(ship)?s?\b|chair\b|editor|head of|dean\b|undergraduate|high school)/i;
/** Loose: used for math-only boards (MathJobs, EMS). */
export const MATH_RX = /\b(math|mathemat|statistic|probabilit|algebra|geometr|topolog|analysis|number theory|combinator|logic|pde|differential equation|numerical|optimi[sz]ation|dynamical system)/i;
/** Strict: used for general boards where "analysis" or "logic" are too vague. */
export const MATH_STRICT = /\b(mathemat\w*|math[ée]mati\w*|matemati\w*|statistik\w*|maths?\b|statistic\w*|probabilit\w*|algebra\w*|geometr\w*|topolog\w*|number theory|combinatori\w*|pdes?\b|partial differential|differential equations?|numerical analysis|dynamical systems?|stochastic|actuarial|functional analysis|operator theory|mathematical physics|applied math)/i;
/** Generic scholarships that accept mathematics among other fields. */
export const OPEN_FIELD_RX = /\b(any field|all fields|any discipline|all disciplines|most fields|any subject|all subjects|wide range of (fields|disciplines|subjects)|stem\b|natural sciences|science(s)? and technology)/i;
const OFF_TOPIC_RX = /\b(economics|biolog\w*|chemi\w*|medic\w*|neuro\w*|genom\w*|clinical|nursing|pharma\w*|law\b|journalism|media\b|arts?\b|humanities|social sciences|psycholog\w*|business|mba\b|agricultur\w*|forensic|environmental|climate|linguist\w*|history|politic\w*|public policy|education\b|creative)/i;
export const isOffTopic = (title: string) => OFF_TOPIC_RX.test(title) && !MATH_STRICT.test(title);

export function classify(title: string): OpportunityKind | null {
  if (EXCLUDE_RX.test(title)) return null;
  if (PHD_RX.test(title)) return "phd";
  if (SCHOLARSHIP_RX.test(title)) return /master/i.test(title) && !/ph\.?d|doctor/i.test(title) ? "master" : "scholarship";
  return null;
}

export function detectFunding(text: string): Opportunity["fundingType"] {
  if (/fully[- ]funded|full(y)? (funding|scholarship)|fully financed|tuition (fee )?waiver.*(stipend|salary)|full tuition/i.test(text)) return "fully_funded";
  // UK-style studentships pay a tax-free stipend, not a salary.
  if (/\b(stipend|studentships?)\b/i.test(text) && !/\b(salaried|employment contract|TV-L)\b/i.test(text)) return "fully_funded";
  if (/\b(salary|salaried|employment contract|TV-L|E ?13|gross (monthly|annual)|per (annum|month)|payscale|EUR [\d,.]+)/i.test(text)) return "salary";
  if (/\b(stipend|scholarship|funded position|funding is provided|bursary|monthly allowance)\b/i.test(text)) return "fully_funded";
  if (/partial(ly)? fund|tuition (fee )?(waiver|reduction)/i.test(text)) return "partially_funded";
  return "unknown";
}

// ---------- countries ----------
const regionAr = new Intl.DisplayNames(["ar"], { type: "region" });
const regionEn = new Intl.DisplayNames(["en"], { type: "region" });
let nameToCode: Map<string, string> | null = null;
function codeFromName(name: string) {
  if (!nameToCode) {
    nameToCode = new Map([["usa", "US"], ["u.s.a.", "US"], ["u.s.", "US"], ["united states of america", "US"], ["uk", "GB"], ["u.k.", "GB"], ["england", "GB"], ["scotland", "GB"], ["wales", "GB"], ["korea", "KR"], ["south korea", "KR"], ["czech republic", "CZ"], ["russia", "RU"], ["holland", "NL"], ["the netherlands", "NL"], ["türkiye", "TR"], ["turkey", "TR"]]);
    for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      try { const n = regionEn.of(code); if (n && n !== code) nameToCode.set(n.toLowerCase(), code); } catch { /* invalid code */ }
    }
  }
  return nameToCode.get(name.replace(/\(.*?\)/g, "").trim().toLowerCase().replace(/\.$/, ""));
}
const REGIONS_AR: Record<string, string> = { europe: "أوروبا", asia: "آسيا", "north america": "أمريكا الشمالية", "south america": "أمريكا الجنوبية", "middle east": "الشرق الأوسط", africa: "إفريقيا", "australasia": "أستراليا وأوقيانوسيا", international: "دولي" };
export function countryLabel(codeOrName?: string, fallback = "") {
  const raw = (codeOrName || "").trim();
  const c = /^[A-Za-z]{2}$/.test(raw) ? raw.toUpperCase() : codeFromName(raw);
  if (c) {
    try { return `${regionEn.of(c)} / ${regionAr.of(c)}`; } catch { /* ignore */ }
  }
  const region = REGIONS_AR[raw.toLowerCase()];
  if (region) return `${raw} / ${region}`;
  return raw || fallback || "Unspecified / غير محدد";
}
let countryNames: [RegExp, string][] | null = null;
/** First country name mentioned in a title ("… Scholarships 2027 | UK", "… in Germany"). */
export function countryInText(text: string) {
  if (!countryNames) {
    codeFromName("x");
    countryNames = [...nameToCode!.entries()]
      .filter(([n]) => n.length >= 4 || ["uk", "usa"].includes(n))
      .sort((a, b) => b[0].length - a[0].length)
      .map(([n, c]) => [new RegExp(`(^|[^\\p{L}])${(n.length <= 3 ? n.toUpperCase() : n).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}])`, n.length <= 3 ? "u" : "iu"), c]);
  }
  for (const [rx, c] of countryNames) if (rx.test(text)) return countryLabel(c);
  return "";
}
/** "Göttingen, Niedersachsen (DE)" / "Liverpool, United Kingdom" / "Paris, France" → country label. */
export function countryFromLocation(loc: string) {
  const code = loc.match(/\(([A-Z]{2})\)\s*$/)?.[1];
  if (code) return countryLabel(code);
  const last = loc.split(",").map((x) => x.trim()).filter(Boolean).at(-1) || "";
  return codeFromName(last) ? countryLabel(last) : "";
}

// ---------- dates ----------
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2020 && y <= 2100 ? `${y}-${pad(m)}-${pad(d)}` : "");
/** First explicit calendar date in a string → YYYY-MM-DD ("" when none). */
export function parseDate(s: string): string {
  let m = s.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = s.match(/\b(\d{1,2})(?:st|nd|rd|th)?(?:\s+of)?\s+([A-Za-z]{3,9})\.?,?\s+(20\d{2})\b/);
  if (m && MONTHS.includes(m[2].slice(0, 3).toLowerCase())) return iso(+m[3], MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) + 1, +m[1]);
  m = s.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d{2})\b/);
  if (m && MONTHS.includes(m[1].slice(0, 3).toLowerCase())) return iso(+m[3], MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()) + 1, +m[2]);
  m = s.match(/\b(\d{1,2})\.(\d{1,2})\.(20\d{2})\b/);
  if (m) return iso(+m[3], +m[2], +m[1]);
  return "";
}
/** "10 Jan" (no year) → next occurrence of that date; "15 Nov ’26" → 2026-11-15. */
export function parseDayMonth(s: string): string {
  const m = s.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\.?(?:\s+[’']?(\d{2,4}))?\b/);
  if (!m || !MONTHS.includes(m[2].slice(0, 3).toLowerCase())) return parseDate(s);
  const month = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) + 1;
  if (m[3]) return iso(m[3].length === 2 ? 2000 + +m[3] : +m[3], month, +m[1]);
  const now = new Date();
  let y = now.getUTCFullYear();
  if (iso(y, month, +m[1]) < new Date(now.getTime() - 30 * 86_400_000).toISOString().slice(0, 10)) y++;
  return iso(y, month, +m[1]);
}
/** Application deadline mentioned in free text ("The application deadline is January 8, 2027", "Deadline: 27 Feb 2026"). */
export function extractDeadline(text: string): string {
  for (const m of text.matchAll(/(deadline|closing date|apply (by|before|until)|applications? (must be|should be|are) (received|submitted|due)[^.\n]{0,20}|submission (deadline|date)|last (application|day to apply)( date)?|sista ansökningsdag|ansökan senast|bewerbungsfrist|date limite)[^\n]{0,90}/gi)) {
    const d = parseDate(m[0]);
    if (d) return d;
  }
  return "";
}

// ---------- schema.org ----------
export type JobPosting = {
  title?: string; description?: string; datePosted?: string; validThrough?: string;
  hiringOrganization?: { name?: string };
  jobLocation?: { address?: { addressCountry?: string; addressLocality?: string } } | { address?: { addressCountry?: string; addressLocality?: string } }[];
};
export function jobPostingFromHtml(html: string): JobPosting | null {
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1]);
      const list = Array.isArray(data) ? data : data["@graph"] ?? [data];
      const job = list.find((x: { "@type"?: string }) => x?.["@type"] === "JobPosting");
      if (job) return job as JobPosting;
    } catch { /* ignore malformed blocks */ }
  }
  return null;
}
export function jobPostingCountry(job: JobPosting) {
  const loc = Array.isArray(job.jobLocation) ? job.jobLocation[0] : job.jobLocation;
  const c = loc?.address?.addressCountry;
  return c ? countryLabel(c) : "";
}
