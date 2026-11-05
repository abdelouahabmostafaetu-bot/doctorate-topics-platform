import type { OpportunityKind } from "./store";
import type { AutoOrigin } from "./source-info";
import {
  EXCLUDE_RX, MATH_RX, MATH_STRICT, OPEN_FIELD_RX, PHD_RX, classify, clip, countryFromLocation, countryInText, countryLabel, decodeEntities, extractDeadline,
  get, getJson, hrefs, htmlToText, isOffTopic, jobPostingCountry, jobPostingFromHtml, parseDate, parseDayMonth, rssItems,
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
const chronicle = madgex("chronicle", "https://jobs.chronicle.com", ["phd mathematics", "doctoral fellowship mathematics", "phd statistics"]);
const physicstoday = madgex("physicstoday", "https://jobs.physicstoday.org", ["phd mathematical physics", "phd student mathematics"]);
const amstat = madgex("amstat", "https://jobs.amstat.org", ["phd student", "doctoral", "graduate fellowship"]);

// ---------------------------------------------------------------- jobs.ac.uk (PhD studentships)
const jobsacuk: Adapter = {
  id: "jobsacuk",
  staleDays: 30,
  delayMs: 2_000,
  maxDetails: 8,
  applicationEn: "Open the jobs.ac.uk announcement for the full project description, eligibility (home/international fees) and the official application link.",
  applicationAr: "افتح إعلان jobs.ac.uk للاطلاع على وصف المشروع الكامل والشروط (رسوم الطلبة المحليين/الدوليين) ورابط التقديم الرسمي.",
  async list() {
    const out = new Map<string, Draft>();
    for (const kw of ["mathematics", "statistics"]) {
      for (const start of [1, 26, 51]) {
        const html = await get(`https://www.jobs.ac.uk/search/?keywords=${kw}&jobTypeFacet%5B0%5D=phds&sortOrder=1&pageSize=25&startIndex=${start}`).catch(() => "");
        const cards = html.split(/<div class="j-search-result__result[^"]*"/).slice(1);
        for (const card of cards) {
          const a = card.match(/<a href="(\/job\/[A-Z0-9]+\/[^"]+)">([\s\S]*?)<\/a>/);
          if (!a) continue;
          const title = htmlToText(a[2]);
          const dept = htmlToText(card.match(/j-search-result__department">([\s\S]*?)<\/div>/)?.[1] || "");
          const employer = htmlToText(card.match(/j-search-result__employer">([\s\S]*?)<\/div>/)?.[1] || "");
          const location = htmlToText(card.match(/<div>Location:([\s\S]*?)<\/div>/)?.[1] || "");
          const salary = htmlToText(card.match(/<strong>Salary: <\/strong>([\s\S]*?)<\/div>/)?.[1] || "");
          const closes = htmlToText(card.match(/j-search-result__date--blue[^>]*>([\s\S]*?)<\/span>/)?.[1] || "");
          // Mixed schools ("Engineering, Mathematics and Physics") only count when the title itself is mathematical.
          const mathDept = MATH_STRICT.test(dept) && !/engineer|physic|comput|chemi|biolog|clinic|medic|health/i.test(dept);
          if (EXCLUDE_RX.test(title) || isOffTopic(title) || !(MATH_STRICT.test(title) || mathDept)) continue;
          const url = `https://www.jobs.ac.uk${a[1]}`;
          if (!out.has(url)) out.set(url, {
            sourceUrl: url, title, organization: [employer, dept].filter(Boolean).join(" — "), kind: classify(title) || "phd",
            country: countryFromLocation(location) || "United Kingdom / المملكة المتحدة",
            funding: /not specified/i.test(salary) ? "" : salary, deadline: closes ? parseDayMonth(closes) : "",
          });
        }
        if (cards.length < 25) break;
      }
    }
    return [...out.values()];
  },
  async detail(c) {
    const html = await get(c.sourceUrl);
    const job = jobPostingFromHtml(html);
    if (!job) return c;
    const description = htmlToText(job.description || "");
    return { ...c, description, deadline: (job.validThrough || "").slice(0, 10) || c.deadline, country: jobPostingCountry(job) || c.country, links: hrefs(job.description || ""), applyUrl: firstApplyLink(job.description || "") };
  },
};

// ---------------------------------------------------------------- AcademicTransfer (Netherlands)
const academictransfer: Adapter = {
  id: "academictransfer",
  staleDays: 30,
  delayMs: 10_000, // robots.txt crawl-delay
  maxDetails: 3,
  applicationEn: "Apply through the AcademicTransfer announcement (button below), which forwards to the university's official application form.",
  applicationAr: "قدّم من إعلان AcademicTransfer (الزر أدناه)، الذي يحيلك إلى استمارة التقديم الرسمية للجامعة.",
  async list() {
    const out = new Map<string, Draft>();
    for (const q of ["phd mathematics", "phd statistics"]) {
      const html = await get(`https://www.academictransfer.com/en/jobs/?q=${encodeURIComponent(q)}`).catch(() => "");
      for (const card of html.match(/<article class="text-aqua-500[\s\S]*?<\/article>/g) || []) {
        const href = card.match(/href="(\/en\/jobs\/\d+\/[^"]+)"/)?.[1];
        const title = htmlToText(card.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1] || "");
        if (!href || !title) continue;
        const summary = htmlToText(card.match(/<p[^>]*>([\s\S]*?)<\/p>/)?.[1] || "");
        const lines = htmlToText(card.replace(/<svg[\s\S]*?<\/svg>/g, "")).split("\n").map((x) => x.trim()).filter(Boolean);
        const dl = lines.join(" ").match(/Deadline\s*(\d{1,2}\s+[A-Za-z]{3,9}\.?\s*[’']?\d{2,4})/i)?.[1] || "";
        const kind = classify(title);
        if (!kind || isOffTopic(title) || !MATH_STRICT.test(`${title} ${summary}`)) continue;
        const url = `https://www.academictransfer.com${href}`;
        out.set(url, { sourceUrl: url, title, organization: lines.at(-1) || "—", kind, country: "Netherlands / هولندا", description: summary, deadline: dl ? parseDayMonth(dl) : "" });
      }
    }
    return [...out.values()];
  },
  async detail(c) {
    const job = jobPostingFromHtml(await get(c.sourceUrl));
    if (!job) return c;
    const description = htmlToText(job.description || "") || c.description;
    return { ...c, description, deadline: c.deadline || (job.validThrough || "").slice(0, 10), organization: job.hiringOrganization?.name || c.organization, links: hrefs(job.description || "") };
  },
};

// ---------------------------------------------------------------- Varbi (Swedish universities: KTH, Uppsala, Stockholm, Lund, Umeå, …)
const VARBI_HOSTS = ["kth", "uu", "su", "lu", "umu", "miun", "kau", "hh"];
const varbi: Adapter = {
  id: "varbi",
  staleDays: 40,
  applicationEn: "Doctoral positions in Sweden are salaried employment. Apply through the university's Varbi recruitment page (button below) before the last application date.",
  applicationAr: "مناصب الدكتوراه في السويد وظائف براتب. قدّم عبر صفحة التوظيف الرسمية للجامعة على Varbi (الزر أدناه) قبل آخر أجل.",
  async list() {
    const out: Draft[] = [];
    await Promise.all(VARBI_HOSTS.map(async (h) => {
      const xml = await get(`https://${h}.varbi.com/en/what:rssfeed/`).catch(() => "");
      const org = htmlToText(xml.match(/<channel>\s*<title>([\s\S]*?)<\/title>/)?.[1] || "").replace(/^(New jobs at|Nya lediga jobb hos)\s*/i, "");
      for (const it of rssItems(xml)) {
        const text = htmlToText(it.description);
        if (!/doktorand|doctoral|ph\.?d/i.test(it.title) || /postdo/i.test(it.title)) continue;
        if (!(MATH_STRICT.test(it.title) || /(forskarutbildningsämne|subject( area)?|third-cycle subject)[^.\n]{0,40}(matematik|mathemat|statisti)/i.test(text))) continue;
        out.push({ sourceUrl: it.link, title: it.title, organization: org || h.toUpperCase(), kind: "phd", country: "Sweden / السويد", description: clip(text, 2500), funding: "Salaried doctoral employment (Swedish doctoral student salary scale).", deadline: extractDeadline(text) });
      }
    }));
    return out;
  },
};

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

// ---------------------------------------------------------------- Scholarship news sites (WordPress feeds)
/** "… for young Nigerians", "… for Kenyan students": restricted to another nationality. */
const OTHER_NATIONALITY = /\bfor (young |female |women |citizens of )?(?!africans?\b|algerians?\b|north africans?\b|international\b)[A-Z][a-z]+(ians?|ans?|ese|is)\b/;
const NOT_SCHOLARSHIP = /\b(undergraduate|bachelor'?s?|high school|competition|contest|conference|summit|camp|internship|exchange program|short course|summer|winter|webinar|youth|leadership|essay|prize|hackathon|volunteer|journalism|top \d+|\d+ (best|top|cheap)|universities (that|in|offering)|how to|list of|online (course|degree)|certificate|mba\b)/i;
const LEVEL_RX = /\b(master'?s?|msc|m\.sc|ph\.?d|doctor\w*|postgraduate|graduate (study|studies|program|degree))/i;
function orgFromTitle(title: string) {
  let org = title.match(/((?:[A-Z][\w.'’&-]*\s+){0,4}(?:University|Institute|College|School|Foundation|Academy|Government)(?:\s+of(?:\s+[A-Z][\w.'’&-]*){1,3})?)/)?.[1] || "";
  while (/\s+(Scholarships?|Fellowships?|Programs?|Programmes?|Awards?|Excellence|Global|International|Kipaji|\d{4})$/.test(org)) org = org.replace(/\s+\S+$/, "");
  return org.replace(/^(The|At|By)\s+/, "").trim() || "—";
}
function wpScholarships(id: AutoOrigin, feeds: string[], staleDays = 90): Adapter {
  return {
    id,
    staleDays,
    applicationEn: "Open the announcement for eligibility details and the official application link; always confirm the call on the university or funder's website.",
    applicationAr: "افتح الإعلان للاطلاع على الشروط التفصيلية ورابط التقديم الرسمي، وتأكد دائمًا من الإعلان على موقع الجامعة أو الجهة المموّلة.",
    async list() {
      const out = new Map<string, Draft>();
      for (const feed of feeds) {
        for (const it of rssItems(await get(feed).catch(() => ""))) {
          const body = it.content || it.description;
          const text = htmlToText(body).replace(/The post [\s\S]*? appeared first on[\s\S]*$/, "").trim();
          const head = `${it.title}\n${it.categories.join(" ")}\n${text.slice(0, 4000)}`;
          if (out.has(it.link) || !/\b(scholarships?|bursar\w*|fellowships?|fully funded|funded (master|phd))/i.test(it.title)) continue;
          if (NOT_SCHOLARSHIP.test(it.title) || OTHER_NATIONALITY.test(it.title) || isOffTopic(it.title)) continue;
          if (!LEVEL_RX.test(head)) continue;
          if (!(OPEN_FIELD_RX.test(head) || MATH_STRICT.test(head) || /\bfor (all|international|foreign) (students)?/i.test(it.title))) continue;
          const org = orgFromTitle(it.title);
          const phd = /ph\.?d|doctor/i.test(`${it.title} ${it.categories.join(" ")}`);
          const masters = /master|msc/i.test(`${it.title} ${it.categories.join(" ")}`);
          const official = hrefs(body).find((u) => !/(scholarshipregion|greatyop|scholarshipscorner|scholarshiproar|opportunitiesforafricans|facebook|twitter|whatsapp|t\.me|linkedin|youtube|instagram)/i.test(u) && /scholar|admission|apply|funding|grant|fellow/i.test(u)) || "";
          out.set(it.link, {
            sourceUrl: it.link, title: it.title, organization: org.trim(), kind: masters && !phd ? "master" : "scholarship",
            country: countryInText(it.title) || countryInText(it.categories.join(" ")), description: clip(text, 2500), deadline: extractDeadline(text),
            referenceUrl: official, links: official ? [official] : [],
          });
        }
      }
      return [...out.values()];
    },
  };
}
const ofa = wpScholarships("ofa", ["https://www.opportunitiesforafricans.com/category/scholarships/feed/"]);
const scholarshipregion = wpScholarships("scholarshipregion", ["https://www.scholarshipregion.com/feed/"]);
const greatyop = wpScholarships("greatyop", ["https://greatyop.com/feed/"]);
const scholarshipscorner = wpScholarships("scholarshipscorner", ["https://scholarshipscorner.website/feed/"]);
const scholarshiproar = wpScholarships("scholarshiproar", ["https://scholarshiproar.com/feed/"]);

export const ADAPTERS: Adapter[] = [
  mathjobs, ems, euraxess, inspire, jobsacuk, academictransfer, varbi,
  unijobs, sciencecareers, chronicle, physicstoday, amstat,
  scholars4dev, ofa, scholarshipregion, greatyop, scholarshipscorner, scholarshiproar,
];
