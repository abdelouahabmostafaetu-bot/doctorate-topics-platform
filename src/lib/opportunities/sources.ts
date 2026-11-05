import type { OpportunityKind } from "./store";
import type { AutoOrigin } from "./source-info";
import {
  EXCLUDE_RX, MATH_RX, MATH_STRICT, OPEN_FIELD_RX, PHD_RX, classify, clip, countryFromLocation, countryLabel, decodeEntities, extractDeadline,
  get, getJson, hrefs, htmlToText, isOffTopic, jobPostingCountry, jobPostingFromHtml, parseDate, rssItems,
} from "./parse";

/** A normalized announcement produced by a source adapter. */
export type Draft = {
  sourceUrl: string; title: string; organization: string;
  kind?: OpportunityKind; country?: string; description?: string; funding?: string; eligibility?: string;
  documents?: string[]; deadline?: string; deadlineTimezone?: string;
  applyUrl?: string; referenceUrl?: string; links?: string[];
  applicationEn?: string; applicationAr?: string;
};

export type Adapter = {
  id: AutoOrigin;
  /** Cheap listing call; items are already filtered on their titles. */
  list(): Promise<Draft[]>;
  /** Optional per-item page fetch for new items; null rejects the item permanently. */
  detail?(d: Draft): Promise<Draft | null>;
  delayMs?: number;
  maxDetails?: number;
  /** The listing is exhaustive: records that disappear from it are closed. */
  complete?: boolean;
  /** Feed-like sources: close records not seen for this many days. */
  staleDays?: number;
  applicationEn: string;
  applicationAr: string;
};

const firstApplyLink = (html: string) =>
  [...html.matchAll(/<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
    .find((m) => !/twitter|facebook|linkedin|whatsapp/i.test(m[1]) && /apply|application|bewerb|candidat|portal|recruit|hiring|vacanc|stellen|jobs?\b|positions?\b|admission/i.test(`${htmlToText(m[2])} ${m[1]}`))?.[1]
  || "";

// ---------------------------------------------------------------- MathJobs (AMS)
const MATHJOBS = "https://www.mathjobs.org";
/** Value cell after a `<b>X Label:</b>` cell ("Position Location", "Scholarship Location", …). */
function mjField(html: string, label: string) {
  return html.match(new RegExp(`<b>(?:[A-Za-z]+ )?${label}:</b></div>\\s*<div[^>]*>([\\s\\S]*?)</div>`, "i"))?.[1] || "";
}
const mathjobs: Adapter = {
  id: "mathjobs",
  complete: true,
  delayMs: 5_000, // robots.txt crawl-delay
  maxDetails: 6,
  applicationEn: "Apply online through MathJobs (official AMS job board) using the button below, and check the employer's page for any additional instructions.",
  applicationAr: "قدّم إلكترونيًا عبر منصة MathJobs (التابعة للجمعية الأمريكية للرياضيات) من الزر أدناه، وراجع صفحة الجهة المعلنة لأي تعليمات إضافية.",
  async list() {
    const html = await get(`${MATHJOBS}/jobs?joblst-0-0------`);
    const out: Draft[] = [];
    for (const block of html.split(/<h3[^>]*>/i).slice(1)) {
      const org = htmlToText(block.match(/^([\s\S]*?)<\/h3>/i)?.[1] || "");
      for (const m of block.matchAll(/href="\/jobs\/list\/(\d+)"[^>]*>[^<]*<\/a>\]\s*<span[^>]*>([\s\S]*?)<\/span>/gi)) {
        const title = htmlToText(m[2]);
        const kind = classify(title);
        if (!kind || /\(filled\)/i.test(title)) continue;
        out.push({ sourceUrl: `${MATHJOBS}/jobs/list/${m[1]}`, title, organization: org, kind });
      }
    }
    return out;
  },
  async detail(c) {
    const html = await get(c.sourceUrl);
    const job = jobPostingFromHtml(html) ?? {};
    const section = html.match(/<h3 class="sr-only">[A-Za-z]+ Description<\/h3>([\s\S]*?)<\/section>/i)?.[1] || "";
    const description = htmlToText(job.description || section);
    const materials = html.match(/Application Materials Required:[\s\S]*?<ul>([\s\S]*?)<\/ul>/i)?.[1];
    const documents = materials ? htmlToText(materials).replace(/^•\s*/gm, "").split("\n").map((s) => s.trim()).filter(Boolean) : [];
    const applyExternal = mjField(html, "Description").match(/href="(https?:\/\/(?!www\.mathjobs\.org)[^"]+)"/i)?.[1] || "";
    const further = html.match(/<b>Further Info:<\/b>[\s\S]{0,300}?href="(https?:\/\/[^"]+)"/i)?.[1] || applyExternal;
    const deadlineRaw = htmlToText(mjField(html, "Appl Deadline"));
    const ymd = deadlineRaw.match(/^\s*(\d{4})\/(\d{2})\/(\d{2})/); // not the "(posted …)" date
    const locText = htmlToText(mjField(html, "Location")).replace(/\[\s*map\s*\]/i, "").trim();
    const title = job.title || htmlToText(mjField(html, "Title")) || c.title;
    const kind = classify(title);
    if (!kind || /post[\s-]?doc/i.test(htmlToText(mjField(html, "Type")))) return null;
    if (!MATH_RX.test(`${title}\n${description}\n${c.organization}`)) return null;
    return {
      ...c, title, kind, description, documents,
      country: jobPostingCountry(job) || countryFromLocation(locText) || countryLabel(locText.split(",").at(-1)),
      deadline: ymd ? `${ymd[1]}-${ymd[2]}-${ymd[3]}` : extractDeadline(description),
      deadlineTimezone: /\d{2}:\d{2}/.test(deadlineRaw) ? `${deadlineRaw.match(/\d{2}:\d{2}/)![0]} (US Eastern, per MathJobs)` : "",
      applyUrl: applyExternal, referenceUrl: further, links: hrefs(section),
      ...(applyExternal ? {
        applicationEn: "Applications are submitted on the employer's own website (Apply button below). The MathJobs announcement is kept as the source.",
        applicationAr: "يتم التقديم عبر الموقع الرسمي للجهة المعلنة (زر التقديم أدناه)، مع إبقاء إعلان MathJobs كمصدر.",
      } : {}),
    };
  },
};

// ---------------------------------------------------------------- European Mathematical Society
const ems: Adapter = {
  id: "ems",
  complete: true,
  delayMs: 3_000,
  maxDetails: 6,
  applicationEn: "Open the EMS announcement for the full text; it links to the employer's application page.",
  applicationAr: "افتح إعلان الجمعية الأوروبية للرياضيات للاطلاع على النص الكامل؛ ويتضمن رابط صفحة التقديم لدى الجهة المعلنة.",
  async list() {
    const html = await get("https://euromathsoc.org/jobs");
    const out: Draft[] = [];
    const cell = (row: string, col: string) => htmlToText(row.match(new RegExp(`data-column="${col}"[^>]*>([\\s\\S]*?)</div>`, "i"))?.[1] || "");
    for (const m of html.matchAll(/<a class="row[^"]*" href="(\/jobs\/[^"]+)">([\s\S]*?)<\/a>/gi)) {
      const title = htmlToText(m[2].match(/^<div[^>]*>([\s\S]*?)<\/div>/i)?.[1] || "");
      const category = cell(m[2], "Category");
      if (/post-?doc|tenure|professor|lecturer/i.test(category) || EXCLUDE_RX.test(title) || isOffTopic(title)) continue;
      const kind = classify(title) || (/phd/i.test(category) ? "phd" : null);
      if (!kind) continue;
      const loc = cell(m[2], "Location");
      out.push({ sourceUrl: `https://euromathsoc.org${m[1]}`, title, organization: cell(m[2], "Organization"), kind, country: countryFromLocation(loc) || countryLabel(loc.split(",").at(-1)) });
    }
    return out;
  },
  async detail(c) {
    const html = await get(c.sourceUrl);
    const body = html.match(/<div class="[^"]*\bdescription">([\s\S]*?)<\/article>/i)?.[1] || "";
    const description = htmlToText(body);
    return { ...c, description, deadline: extractDeadline(description), applyUrl: firstApplyLink(body), links: hrefs(body) };
  },
};

// ---------------------------------------------------------------- EURAXESS
const euraxess: Adapter = {
  id: "euraxess",
  staleDays: 60,
  applicationEn: "Open the EURAXESS announcement for the full description, eligibility and the application link.",
  applicationAr: "افتح إعلان EURAXESS للاطلاع على الوصف الكامل والشروط ورابط التقديم.",
  async list() {
    // Only the plain feed is accessible (query parameters are blocked); ~20 latest items.
    return rssItems(await get("https://euraxess.ec.europa.eu/job-feed"))
      .filter((it) => /^https:\/\/euraxess\.ec\.europa\.eu\/jobs\/\d+$/.test(it.link))
      .map((it) => ({ it, summary: htmlToText(it.description) }))
      .filter(({ it, summary }) => (classify(it.title) || PHD_RX.test(summary)) && !EXCLUDE_RX.test(it.title) && MATH_STRICT.test(`${it.title} ${summary}`))
      .map(({ it, summary }) => ({
        sourceUrl: it.link, title: it.title, organization: it.creator || "—", kind: classify(it.title) || "phd",
        country: "Europe / أوروبا", description: summary, deadline: extractDeadline(summary),
      }));
  },
};

// ---------------------------------------------------------------- INSPIRE-HEP (mathematical physics)
type InspireJob = { id: string; metadata: { position: string; status?: string; deadline_date?: string; arxiv_categories?: string[]; regions?: string[]; institutions?: { value: string }[]; urls?: { value: string }[]; description?: string } };
const inspire: Adapter = {
  id: "inspire",
  complete: true,
  applicationEn: "Follow the application link of the announcement (INSPIRE-HEP lists the official instructions and contact).",
  applicationAr: "اتبع رابط التقديم في الإعلان (يعرض INSPIRE-HEP التعليمات الرسمية وجهة الاتصال).",
  async list() {
    const q = encodeURIComponent("ranks:PHD and status:open and arxiv_categories:math*");
    const data = await getJson<{ hits: { hits: InspireJob[] } }>(`https://inspirehep.net/api/jobs?q=${q}&size=100&sort=mostrecent&fields=position,status,deadline_date,arxiv_categories,regions,institutions,urls,description`);
    return data.hits.hits
      .filter((h) => h.metadata.status === "open" && ((h.metadata.arxiv_categories || []).includes("math") || MATH_STRICT.test(h.metadata.position)))
      .filter((h) => !/post-?doc/i.test(h.metadata.position) || PHD_RX.test(h.metadata.position))
      .map((h) => {
        const m = h.metadata;
        const description = htmlToText(m.description || "");
        return {
          sourceUrl: `https://inspirehep.net/jobs/${h.id}`, title: m.position, organization: (m.institutions || []).map((i) => i.value).join(" · ") || "—",
          kind: "phd" as const, country: countryLabel(m.regions?.[0]), description, deadline: m.deadline_date || extractDeadline(description),
          applyUrl: m.urls?.[0]?.value || "", links: hrefs(m.description || ""),
        };
      });
  },
};

// ---------------------------------------------------------------- Madgex job boards (THE Unijobs, Science Careers)
function madgex(id: AutoOrigin, base: string, keywords: string[]): Adapter {
  return {
    id,
    staleDays: 45,
    delayMs: 2_000,
    maxDetails: 5,
    applicationEn: "Open the announcement for the full description and use its Apply button (the employer's official application route).",
    applicationAr: "افتح الإعلان للاطلاع على الوصف الكامل واستعمل زر التقديم فيه (طريق التقديم الرسمي لدى الجهة المعلنة).",
    async list() {
      const seen = new Map<string, Draft>();
      for (const k of keywords) {
        const xml = await get(`${base}/jobsrss/?keywords=${encodeURIComponent(k)}`).catch(() => "");
        for (const it of rssItems(xml)) {
          const link = it.link.replace(/\?.*$/, "");
          const [org, ...rest] = it.title.split(": ");
          const title = rest.join(": ") || it.title;
          const lines = htmlToText(it.description).split("\n").map((s) => s.trim()).filter(Boolean);
          const summary = lines.filter((l) => !l.endsWith(":")).join("\n");
          const kind = classify(title);
          if (!kind || seen.has(link) || isOffTopic(title) || !MATH_STRICT.test(`${title}\n${summary}`)) continue;
          seen.set(link, { sourceUrl: link, title, organization: org.trim(), kind, description: summary, country: countryFromLocation(lines.at(-1) || ""), funding: lines[0]?.endsWith(":") ? lines[0].slice(0, -1) : "" });
        }
      }
      return [...seen.values()];
    },
    async detail(c) {
      const html = await get(c.sourceUrl);
      const job = jobPostingFromHtml(html);
      if (!job) return c;
      const description = htmlToText(job.description || "") || c.description || "";
      if (!MATH_STRICT.test(`${c.title}\n${description}`)) return null;
      return {
        ...c, description, country: jobPostingCountry(job) || c.country,
        deadline: (job.validThrough || "").slice(0, 10) || extractDeadline(description),
        links: hrefs(job.description || ""), applyUrl: firstApplyLink(job.description || ""),
      };
    },
  };
}
const unijobs = madgex("unijobs", "https://www.timeshighereducation.com/unijobs", ["phd mathematics", "phd studentship mathematics", "predoctoral mathematics", "phd statistics"]);
const sciencecareers = madgex("sciencecareers", "https://jobs.sciencecareers.org", ["phd mathematics", "phd studentship mathematics", "phd statistics"]);

// ---------------------------------------------------------------- Scholars4Dev
const S4D_SECTIONS = ["Brief description", "Host Institution\\(s\\)", "Level/Field\\(s\\) of study", "Field\\(s\\) of study", "Number of Scholarships", "Target group", "Scholarship value/inclusions/duration", "Scholarship value/inclusions", "Eligibility", "Application instructions", "Website"];
function sections(text: string) {
  const out: Record<string, string> = {};
  const rx = new RegExp(`(?:^|\\n)(${S4D_SECTIONS.join("|")}):\\s*`, "g");
  const marks = [...text.matchAll(rx)];
  marks.forEach((m, i) => { out[m[1].replace(/\\/g, "")] = text.slice(m.index! + m[0].length, marks[i + 1]?.index ?? text.length).trim(); });
  return out;
}
const scholars4dev: Adapter = {
  id: "scholars4dev",
  staleDays: 120,
  applicationEn: "Read the full call on the official scholarship website (button below) and follow its application instructions.",
  applicationAr: "اقرأ الإعلان الكامل على الموقع الرسمي للمنحة (الزر أدناه) واتبع تعليمات التقديم الواردة فيه.",
  async list() {
    const feeds = ["phd-scholarships", "masters-scholarships"];
    const seen = new Map<string, Draft>();
    for (const f of feeds) {
      for (const it of rssItems(await get(`https://www.scholars4dev.com/category/level-of-study/${f}/feed/`).catch(() => ""))) {
        const cats = it.categories;
        if (seen.has(it.link) || cats.some((c) => /^(closed|list of|uncategorized|postdoctoral fellowships|short courses)$/i.test(c))) continue;
        if (!cats.some((c) => /^(phd|masters)$/i.test(c))) continue;
        const text = htmlToText(it.content || it.description);
        const sec = sections(text);
        const fieldText = `${cats.join(" ")}\n${sec["Level/Field(s) of study"] || sec["Field(s) of study"] || ""}\n${it.title}`;
        if (!(cats.some((c) => /^any field of study$/i.test(c)) || OPEN_FIELD_RX.test(fieldText) || MATH_STRICT.test(fieldText))) continue;
        const phd = cats.some((c) => /^phd$/i.test(c));
        const masters = cats.some((c) => /^masters$/i.test(c));
        const official = (it.content.match(/Official Scholarship Website:\s*<a[^>]+href="([^"]+)"/i)?.[1] || "");
        const studyIn = text.match(/Study in:\s*([^\n]+)/i)?.[1]?.trim() || "";
        const host = sec["Host Institution(s)"] || text.split("\n")[0] || "";
        seen.set(it.link, {
          sourceUrl: it.link, title: it.title, organization: clip(host.split("\n")[0].replace(/\s+in\s+[A-Z][\w .]+$/, ""), 160),
          kind: masters && !phd ? "master" : "scholarship",
          country: countryLabel(studyIn.split(/[,/]| and /)[0]?.trim(), studyIn),
          description: clip([sec["Brief description"], sec["Level/Field(s) of study"] || sec["Field(s) of study"], sec["Target group"] && `Target group: ${sec["Target group"]}`, sec["Number of Scholarships"] && `Number of scholarships: ${sec["Number of Scholarships"]}`].filter(Boolean).join("\n\n"), 2500),
          funding: clip(sec["Scholarship value/inclusions/duration"] || sec["Scholarship value/inclusions"] || "", 1200),
          eligibility: clip(sec["Eligibility"] || "", 1500),
          deadline: parseDate(text.match(/Deadline:\s*([^\n]+)/i)?.[1] || ""),
          applyUrl: decodeEntities(official), referenceUrl: decodeEntities(official), links: official ? [decodeEntities(official)] : [],
          applicationEn: sec["Application instructions"] ? clip(sec["Application instructions"], 1200) : undefined,
        });
      }
    }
    return [...seen.values()];
  },
};

// ---------------------------------------------------------------- Opportunities For Africans (graduate scholarships)
/** "… for young Nigerians", "… for Kenyan students": restricted to another nationality. */
const OTHER_NATIONALITY = /\bfor (young |female |women |citizens of )?(?!africans?\b|algerians?\b|north africans?\b|international\b)[A-Z][a-z]+(ians?|ans?|ese|is)\b/;
const ofa: Adapter = {
  id: "ofa",
  staleDays: 90,
  applicationEn: "Open the announcement for eligibility details and the official application link.",
  applicationAr: "افتح الإعلان للاطلاع على الشروط التفصيلية ورابط التقديم الرسمي.",
  async list() {
    return rssItems(await get("https://www.opportunitiesforafricans.com/category/scholarships/feed/"))
      .map((it) => ({ it, text: htmlToText(it.description).replace(/The post[\s\S]*$/, "").trim() }))
      .filter(({ it }) => /\b(master'?s?|msc|ph\.?d|doctor\w*|postgraduate|graduate (study|studies|program))/i.test(`${it.title} ${it.categories.join(" ")}`))
      .filter(({ it }) => !OTHER_NATIONALITY.test(it.title) && !isOffTopic(it.title))
      .filter(({ it, text }) => OPEN_FIELD_RX.test(`${it.title} ${text}`) || MATH_STRICT.test(`${it.title} ${text}`) || /mastercard foundation scholars/i.test(it.title))
      .map(({ it, text }) => {
        const org = it.title.match(/\b(?:at|by) (?:the )?([A-Z][^,()]*?(?:University|Institute|School|College|Foundation|Government)[^,()]*?)(?: for| in| \d|$)/)?.[1]
          || it.title.match(/^(?:The )?([^0-9(]+?(?:University|Institute|Foundation|Government of \w+))/)?.[1] || "—";
        const studyIn = it.title.match(/\b(?:study|studies) in ([A-Z][a-z]+(?: [A-Z][a-z]+)?)/)?.[1] || it.title.match(/Fully Funded to ([A-Z][a-z]+)/i)?.[1] || "";
        const phd = /ph\.?d|doctor/i.test(`${it.title} ${it.categories.join(" ")}`);
        return {
          sourceUrl: it.link, title: it.title, organization: org.trim(), kind: (phd ? "scholarship" : "master") as OpportunityKind,
          country: countryLabel(studyIn), description: text, deadline: extractDeadline(text),
        };
      });
  },
};

export const ADAPTERS: Adapter[] = [mathjobs, ems, euraxess, inspire, unijobs, sciencecareers, scholars4dev, ofa];
