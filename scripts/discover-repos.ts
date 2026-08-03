import "dotenv/config";
import dns from "node:dns";
import { writeFileSync } from "node:fs";
import { blocks, firstValue, oaiError, resumption } from "../src/lib/theses/xml";
import { getText } from "../src/lib/theses/http";

// Same Windows/c-ares workaround as the harvest script.
const servers = (process.env.DNS_SERVERS || "1.1.1.1,8.8.8.8")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
try {
  dns.setServers(servers);
} catch {
  /* ignore */
}

// ---------------------------------------------------------------------------
// Candidates. Only the base site is needed: the prober tries https and http
// against every common DSpace OAI path, so a wrong scheme or a missing
// /jspui prefix is not fatal. Universities already in repos.ts are omitted.
// ---------------------------------------------------------------------------

type Candidate = {
  key: string;
  nameFr: string;
  nameAr: string;
  wilaya: string;
  sites: string[];
};

const CANDIDATES: Candidate[] = [
  { key: "alger1", nameFr: "Université d'Alger 1 Benyoucef Benkhedda", nameAr: "جامعة الجزائر 1 بن يوسف بن خدة", wilaya: "Alger", sites: ["http://biblio.univ-alger.dz/jspui", "http://dspace.univ-alger.dz"] },
  { key: "alger2", nameFr: "Université d'Alger 2 Abou El Kacem Saâdallah", nameAr: "جامعة الجزائر 2 أبو القاسم سعد الله", wilaya: "Alger", sites: ["http://dspace.univ-alger2.dz"] },
  { key: "alger3", nameFr: "Université d'Alger 3 Brahim Soltane Chaibout", nameAr: "جامعة الجزائر 3", wilaya: "Alger", sites: ["https://dspace.univ-alger3.dz"] },
  { key: "oran1", nameFr: "Université Oran 1 Ahmed Ben Bella", nameAr: "جامعة وهران 1 أحمد بن بلة", wilaya: "Oran", sites: ["https://dspace.univ-oran1.dz"] },
  { key: "oran2", nameFr: "Université Oran 2 Mohamed Ben Ahmed", nameAr: "جامعة وهران 2 محمد بن أحمد", wilaya: "Oran", sites: ["https://ds.univ-oran2.dz:8443"] },
  { key: "usto", nameFr: "USTO Mohamed Boudiaf", nameAr: "جامعة العلوم والتكنولوجيا وهران محمد بوضياف", wilaya: "Oran", sites: ["http://dspace.univ-usto.dz", "https://dspace.univ-usto.dz"] },
  { key: "constantine1", nameFr: "Université Frères Mentouri Constantine 1", nameAr: "جامعة الإخوة منتوري قسنطينة 1", wilaya: "Constantine", sites: ["http://dspace.umc.edu.dz", "https://bu.umc.edu.dz"] },
  { key: "constantine2", nameFr: "Université Abdelhamid Mehri Constantine 2", nameAr: "جامعة عبد الحميد مهري قسنطينة 2", wilaya: "Constantine", sites: ["http://dspace.univ-constantine2.dz"] },
  { key: "constantine3", nameFr: "Université Salah Boubnider Constantine 3", nameAr: "جامعة صالح بوبنيدر قسنطينة 3", wilaya: "Constantine", sites: ["http://dspace.univ-constantine3.dz"] },
  { key: "batna1", nameFr: "Université Batna 1 Hadj Lakhdar", nameAr: "جامعة باتنة 1 الحاج لخضر", wilaya: "Batna", sites: ["http://dspace.univ-batna.dz", "http://eprints.univ-batna.dz"] },
  { key: "batna2", nameFr: "Université Batna 2 Mostefa Ben Boulaïd", nameAr: "جامعة باتنة 2 مصطفى بن بولعيد", wilaya: "Batna", sites: ["http://dspace.univ-batna2.dz"] },
  { key: "bejaia", nameFr: "Université Abderrahmane Mira de Béjaïa", nameAr: "جامعة عبد الرحمان ميرة بجاية", wilaya: "Béjaïa", sites: ["http://univ-bejaia.dz/dspace", "http://dspace.univ-bejaia.dz"] },
  { key: "boumerdes", nameFr: "Université M'Hamed Bougara Boumerdès", nameAr: "جامعة أمحمد بوقرة بومرداس", wilaya: "Boumerdès", sites: ["http://dlibrary.univ-boumerdes.dz", "http://dspace.univ-boumerdes.dz"] },
  { key: "bouira", nameFr: "Université Akli Mohand Oulhadj Bouira", nameAr: "جامعة أكلي محند أولحاج البويرة", wilaya: "Bouira", sites: ["http://dspace.univ-bouira.dz:8080/jspui", "http://dspace.univ-bouira.dz"] },
  { key: "soukahras", nameFr: "Université Mohamed Chérif Messaadia Souk Ahras", nameAr: "جامعة محمد الشريف مساعدية سوق أهراس", wilaya: "Souk Ahras", sites: ["https://dspace.univ-soukahras.dz"] },
  { key: "guelma", nameFr: "Université 8 Mai 1945 Guelma", nameAr: "جامعة 8 ماي 1945 قالمة", wilaya: "Guelma", sites: ["http://dspace.univ-guelma.dz", "https://dspace.univ-guelma.dz"] },
  { key: "jijel", nameFr: "Université Mohammed Seddik Ben Yahia Jijel", nameAr: "جامعة محمد الصديق بن يحيى جيجل", wilaya: "Jijel", sites: ["http://dspace.univ-jijel.dz"] },
  { key: "khenchela", nameFr: "Université Abbès Laghrour Khenchela", nameAr: "جامعة عباس لغرور خنشلة", wilaya: "Khenchela", sites: ["http://dspace.univ-khenchela.dz"] },
  { key: "oeb", nameFr: "Université Larbi Ben M'hidi Oum El Bouaghi", nameAr: "جامعة العربي بن مهيدي أم البواقي", wilaya: "Oum El Bouaghi", sites: ["http://dspace.univ-oeb.dz", "http://bib.univ-oeb.dz"] },
  { key: "tebessa", nameFr: "Université Larbi Tébessi Tébessa", nameAr: "جامعة العربي التبسي تبسة", wilaya: "Tébessa", sites: ["http://dspace.univ-tebessa.dz"] },
  { key: "eloued", nameFr: "Université Hamma Lakhdar El Oued", nameAr: "جامعة حمه لخضر الوادي", wilaya: "El Oued", sites: ["http://dspace.univ-eloued.dz", "https://dspace.univ-eloued.dz"] },
  { key: "ghardaia", nameFr: "Université de Ghardaïa", nameAr: "جامعة غرداية", wilaya: "Ghardaïa", sites: ["http://dspace.univ-ghardaia.dz", "https://dspace.univ-ghardaia.edu.dz"] },
  { key: "adrar", nameFr: "Université Ahmed Draia Adrar", nameAr: "جامعة أحمد دراية أدرار", wilaya: "Adrar", sites: ["http://dspace.univ-adrar.edu.dz", "http://dspace.univ-adrar.dz"] },
  { key: "bechar", nameFr: "Université Tahri Mohammed Béchar", nameAr: "جامعة طاهري محمد بشار", wilaya: "Béchar", sites: ["http://dspace.univ-bechar.dz", "https://dspace.univ-bechar.dz"] },
  { key: "laghouat", nameFr: "Université Amar Telidji Laghouat", nameAr: "جامعة عمار ثليجي الأغواط", wilaya: "Laghouat", sites: ["http://dspace.lagh-univ.dz", "https://dspace.lagh-univ.dz"] },
  { key: "djelfa", nameFr: "Université Ziane Achour Djelfa", nameAr: "جامعة زيان عاشور الجلفة", wilaya: "Djelfa", sites: ["http://dspace.univ-djelfa.dz"] },
  { key: "blida1", nameFr: "Université Saad Dahlab Blida 1", nameAr: "جامعة سعد دحلب البليدة 1", wilaya: "Blida", sites: ["https://di.univ-blida.dz", "http://dspace.univ-blida.dz"] },
  { key: "blida2", nameFr: "Université Ali Lounici Blida 2", nameAr: "جامعة علي لونيسي البليدة 2", wilaya: "Blida", sites: ["http://dspace.univ-blida2.dz"] },
  { key: "dbkm", nameFr: "Université Djilali Bounaama Khemis Miliana", nameAr: "جامعة جيلالي بونعامة خميس مليانة", wilaya: "Aïn Defla", sites: ["http://dspace.univ-dbkm.dz", "https://dspace.univ-dbkm.dz"] },
  { key: "tiaret", nameFr: "Université Ibn Khaldoun Tiaret", nameAr: "جامعة ابن خلدون تيارت", wilaya: "Tiaret", sites: ["http://dspace.univ-tiaret.dz", "https://dspace.univ-tiaret.dz"] },
  { key: "tissemsilt", nameFr: "Université Ahmed Ben Yahia El Wancharissi Tissemsilt", nameAr: "جامعة أحمد بن يحيى الونشريسي تيسمسيلت", wilaya: "Tissemsilt", sites: ["http://dspace.univ-tissemsilt.dz"] },
  { key: "saida", nameFr: "Université Moulay Tahar Saïda", nameAr: "جامعة مولاي الطاهر سعيدة", wilaya: "Saïda", sites: ["http://dspace.univ-saida.dz", "https://dspace.univ-saida.dz"] },
  { key: "mascara", nameFr: "Université Mustapha Stambouli Mascara", nameAr: "جامعة مصطفى اسطمبولي معسكر", wilaya: "Mascara", sites: ["http://dspace.univ-mascara.dz", "https://dspace.univ-mascara.dz"] },
  { key: "relizane", nameFr: "Université Ahmed Zabana Relizane", nameAr: "جامعة أحمد زبانة غليزان", wilaya: "Relizane", sites: ["http://dspace.univ-relizane.dz"] },
  { key: "mila", nameFr: "Centre Universitaire Abdelhafid Boussouf Mila", nameAr: "المركز الجامعي عبد الحفيظ بوالصوف ميلة", wilaya: "Mila", sites: ["http://dspace.centre-univ-mila.dz", "https://dspace.centre-univ-mila.dz"] },
  { key: "bba", nameFr: "Université Mohamed El Bachir El Ibrahimi BBA", nameAr: "جامعة محمد البشير الإبراهيمي برج بوعريريج", wilaya: "Bordj Bou Arréridj", sites: ["http://dspace.univ-bba.dz", "https://dspace.univ-bba.dz"] },
  { key: "setif2", nameFr: "Université Mohamed Lamine Debaghine Sétif 2", nameAr: "جامعة محمد لمين دباغين سطيف 2", wilaya: "Sétif", sites: ["http://dspace.univ-setif2.dz"] },
  { key: "tipaza", nameFr: "Université de Tipaza", nameAr: "جامعة تيبازة", wilaya: "Tipaza", sites: ["http://dspace.univ-tipaza.dz"] },
  { key: "khemis", nameFr: "ENS Kouba Alger", nameAr: "المدرسة العليا للأساتذة القبة", wilaya: "Alger", sites: ["http://dspace.ens-kouba.dz"] },
  // Biskra runs a second, EPrints-based thesis repository alongside its dead
  // DSpace OAI. Different software, so the OAI path differs.
  { key: "biskra_eprints", nameFr: "Université Mohamed Khider Biskra (thèses EPrints)", nameAr: "جامعة محمد خيضر بسكرة", wilaya: "Biskra", sites: ["http://thesis.univ-biskra.dz"] },
];

const OAI_PATHS = [
  "/server/oai/request", // DSpace 7
  "/oai/request", // DSpace 5/6
  "/jspui/oai/request",
  "/dspace/oai/request",
  "/cgi/oai2", // EPrints
];

// ---------------------------------------------------------------------------

const MATH = /(math[ée]mat|mathemat|\bmaths?\b|رياضيات)/i;
// Sets mixing maths with another discipline must be flagged so the classifier
// keeps filtering titles instead of trusting the collection blindly.
const MIXED = /(informatique|computer|physique|chimie|biolog|technolog|ingénieur|علوم دقيقة|إعلام)/i;

function guessDegree(name: string): string | null {
  const n = name.toLowerCase();
  if (/doctorat|doctorate|ph\.?d|دكتوراه|أطروحة/.test(n)) return "doctorat";
  if (/magist|ماجستير/.test(n)) return "magister";
  if (/master|ماستر/.test(n)) return "master";
  if (/licence|ليسانس/.test(n)) return "licence";
  if (/ing[ée]nieur|مهندس/.test(n)) return "ingenieur";
  return null;
}

type FoundSet = { spec: string; label: string; purity: string; degree: string | null };

type Probe = {
  cand: Candidate;
  oai: string;
  version: number;
  site: string;
  repoName: string;
  sets: FoundSet[];
  note: string;
};

function expand(site: string): string[] {
  const clean = site.replace(/\/+$/, "");
  const alt = clean.startsWith("https://")
    ? "http://" + clean.slice(8)
    : "https://" + clean.slice(7);
  const out: string[] = [];
  for (const base of [clean, alt]) {
    for (const p of OAI_PATHS) out.push(base + p);
  }
  return out;
}

async function tryIdentify(url: string, timeoutMs: number): Promise<string | null> {
  try {
    const xml = await getText(url + "?verb=Identify", {
      accept: "application/xml,text/xml,*/*",
      timeoutMs,
      tries: 1,
    });
    if (!/<Identify[\s>]/.test(xml)) return null;
    return firstValue(xml, "repositoryName") || "(sans nom)";
  } catch {
    return null;
  }
}

async function listSets(oai: string, timeoutMs: number): Promise<Array<{ spec: string; name: string }>> {
  const out: Array<{ spec: string; name: string }> = [];
  let url = oai + "?verb=ListSets";
  let guard = 0;
  while (url && guard++ < 60) {
    const xml = await getText(url, {
      accept: "application/xml,text/xml,*/*",
      timeoutMs,
      tries: 2,
    });
    if (oaiError(xml)) break;
    for (const b of blocks(xml, "set")) {
      const spec = firstValue(b, "setSpec");
      const name = firstValue(b, "setName");
      if (spec) out.push({ spec, name: name || spec });
    }
    const { token } = resumption(xml);
    url = token ? oai + "?verb=ListSets&resumptionToken=" + encodeURIComponent(token) : "";
  }
  return out;
}

async function probe(cand: Candidate, timeoutMs: number, log: (s: string) => void): Promise<Probe | null> {
  const urls: string[] = [];
  for (const s of cand.sites) for (const u of expand(s)) if (!urls.includes(u)) urls.push(u);

  for (const oai of urls) {
    const repoName = await tryIdentify(oai, timeoutMs);
    if (!repoName) continue;

    log("  " + cand.key + " OAI ok -> " + oai + "  [" + repoName + "]");
    let sets: Array<{ spec: string; name: string }> = [];
    let note = "";
    try {
      sets = await listSets(oai, timeoutMs);
    } catch (e) {
      note = "ListSets failed: " + (e instanceof Error ? e.message : String(e));
      log("    " + note);
    }

    const math: FoundSet[] = [];
    for (const s of sets) {
      if (!MATH.test(s.name)) continue;
      math.push({
        spec: s.spec,
        label: s.name,
        purity: MIXED.test(s.name) ? "mixed" : "pure",
        degree: guessDegree(s.name),
      });
    }

    log("    " + sets.length + " sets, " + math.length + " math");
    const site = oai.replace(/\/(server\/oai|oai|jspui\/oai|dspace\/oai|cgi)\/.*$/, "");
    return {
      cand,
      oai,
      version: oai.includes("/server/oai") ? 7 : 6,
      site,
      repoName,
      sets: math,
      note,
    };
  }

  log("  " + cand.key + " -> no OAI endpoint answered");
  return null;
}

function render(p: Probe): string {
  const c = p.cand;
  const lines: string[] = [];
  lines.push("  // " + p.repoName);
  lines.push("  {");
  lines.push('    key: "' + c.key + '",');
  lines.push('    nameFr: "' + c.nameFr + '",');
  lines.push('    nameAr: "' + c.nameAr + '",');
  lines.push('    slug: "' + c.key + '",');
  lines.push('    wilaya: "' + c.wilaya + '",');
  lines.push('    oai: "' + p.oai + '",');
  lines.push("    version: " + p.version + ",");
  lines.push('    site: "' + p.site + '",');
  lines.push("    enabled: " + (p.sets.length > 0) + ",");
  lines.push("    sets: [");
  for (const s of p.sets) {
    lines.push(
      '      { spec: "' +
        s.spec +
        '", label: "' +
        s.label.replace(/"/g, "'") +
        '", purity: "' +
        s.purity +
        '"' +
        (s.degree ? ', degree: "' + s.degree + '"' : "") +
        " },"
    );
  }
  lines.push("    ],");
  lines.push("  },");
  return lines.join("\n");
}

async function pool<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = new Array(Math.min(size, items.length)).fill(0).map(async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

async function main() {
  const argOnly = process.argv.find((a) => a.startsWith("--only="));
  const argTimeout = process.argv.find((a) => a.startsWith("--timeout="));
  const timeoutMs = argTimeout ? Number(argTimeout.split("=")[1]) : 15000;
  const only = argOnly ? argOnly.split("=")[1].split(",") : null;

  const list = only ? CANDIDATES.filter((c) => only.includes(c.key)) : CANDIDATES;
  console.log("probing " + list.length + " repositories (timeout " + timeoutMs + "ms)\n");

  const started = Date.now();
  const results = await pool(list, 6, (c) => probe(c, timeoutMs, (s) => console.log(s)));

  const ok = results.filter((r): r is Probe => !!r);
  const withMath = ok.filter((r) => r.sets.length > 0);
  const dead = list.filter((c) => !ok.some((r) => r.cand.key === c.key));

  const body: string[] = [];
  body.push("// Generated by scripts/discover-repos.ts on " + new Date().toISOString());
  body.push("// Paste the blocks you want into the REPOS array of src/lib/theses/repos.ts.");
  body.push("");
  for (const p of withMath) body.push(render(p), "");

  body.push("// ---- reachable but no set whose name mentions mathematics ----");
  for (const p of ok.filter((r) => r.sets.length === 0)) {
    body.push("// " + p.cand.key + "  " + p.oai + "  " + (p.note || "browse it manually"));
  }
  body.push("");
  body.push("// ---- no OAI endpoint answered (dead, renamed, or HTML-only) ----");
  for (const c of dead) body.push("// " + c.key + "  " + c.sites.join("  "));

  writeFileSync("discovered-repos.txt", body.join("\n"), "utf8");

  console.log("");
  console.log("reachable       = " + ok.length + " / " + list.length);
  console.log("with math sets  = " + withMath.length);
  console.log("math sets total = " + withMath.reduce((a, r) => a + r.sets.length, 0));
  console.log("unreachable     = " + dead.length);
  console.log("took " + Math.round((Date.now() - started) / 1000) + "s");
  console.log("");
  console.log("-> wrote discovered-repos.txt");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
