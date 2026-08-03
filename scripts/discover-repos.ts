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
// Public OAI-PMH registries. These are plain text/TSV dumps listing tens of
// thousands of endpoints worldwide; we keep only the Algerian ones. Using them
// means the script finds repositories nobody told it about, and stays current
// without editing this file. Every source is optional: a 404 is not fatal.
// ---------------------------------------------------------------------------

const REGISTRIES = [
  "https://raw.githubusercontent.com/miku/metha/master/extra/openalex/dspace_candidates.txt",
  "https://raw.githubusercontent.com/miku/metha/master/contrib/sites-oa.tsv",
  "https://raw.githubusercontent.com/miku/metha/master/extra/opendoar/2020/repos.tsv",
  "https://raw.githubusercontent.com/miku/oaimi/master/sites.tsv",
  "https://raw.githubusercontent.com/CottageLabs/harvest/master/data/oai-urls.txt",
];

// Universities already wired into src/lib/theses/repos.ts.
const EXISTING = new Set([
  "usthb",
  "msila",
  "ummto",
  "tlemcen",
  "annaba",
  "ouargla",
  "temouchent",
  "medea",
  "mosta",
  "skikda",
  "biskra",
  "sba",
  "chlef",
]);

// ---------------------------------------------------------------------------
// Curated seeds: proper French/Arabic names and wilayas for the repositories
// we know about. Endpoints found in the registries reuse these names when the
// derived key matches; otherwise the OAI repositoryName is used.
// ---------------------------------------------------------------------------

type Seed = {
  key: string;
  nameFr: string;
  nameAr: string;
  wilaya: string;
  sites: string[];
};

const SEEDS: Seed[] = [
  { key: "setif1", nameFr: "Université Ferhat Abbas Sétif 1", nameAr: "جامعة فرحات عباس سطيف 1", wilaya: "Sétif", sites: ["http://dspace.univ-setif.dz:8888/jspui", "http://dspace.univ-setif.dz:8888"] },
  { key: "alger1", nameFr: "Université d'Alger 1 Benyoucef Benkhedda", nameAr: "جامعة الجزائر 1 بن يوسف بن خدة", wilaya: "Alger", sites: ["http://biblio.univ-alger.dz/jspui"] },
  { key: "alger2", nameFr: "Université d'Alger 2 Abou El Kacem Saâdallah", nameAr: "جامعة الجزائر 2 أبو القاسم سعد الله", wilaya: "Alger", sites: ["http://dspace.univ-alger2.dz"] },
  { key: "alger3", nameFr: "Université d'Alger 3", nameAr: "جامعة الجزائر 3", wilaya: "Alger", sites: ["https://dspace.univ-alger3.dz"] },
  { key: "oran1", nameFr: "Université Oran 1 Ahmed Ben Bella", nameAr: "جامعة وهران 1 أحمد بن بلة", wilaya: "Oran", sites: ["https://dspace.univ-oran1.dz"] },
  { key: "oran2", nameFr: "Université Oran 2 Mohamed Ben Ahmed", nameAr: "جامعة وهران 2 محمد بن أحمد", wilaya: "Oran", sites: ["https://ds.univ-oran2.dz:8443"] },
  { key: "usto", nameFr: "USTO Mohamed Boudiaf", nameAr: "جامعة العلوم والتكنولوجيا وهران", wilaya: "Oran", sites: ["http://dspace.univ-usto.dz"] },
  { key: "umc", nameFr: "Université Frères Mentouri Constantine 1", nameAr: "جامعة الإخوة منتوري قسنطينة 1", wilaya: "Constantine", sites: ["http://dspace.umc.edu.dz", "https://bu.umc.edu.dz"] },
  { key: "constantine2", nameFr: "Université Abdelhamid Mehri Constantine 2", nameAr: "جامعة عبد الحميد مهري قسنطينة 2", wilaya: "Constantine", sites: ["http://dspace.univ-constantine2.dz"] },
  { key: "constantine3", nameFr: "Université Salah Boubnider Constantine 3", nameAr: "جامعة صالح بوبنيدر قسنطينة 3", wilaya: "Constantine", sites: ["http://dspace.univ-constantine3.dz"] },
  { key: "batna", nameFr: "Université Batna 1 Hadj Lakhdar", nameAr: "جامعة باتنة 1 الحاج لخضر", wilaya: "Batna", sites: ["http://digitallibrary.univ-batna.dz:8080/jspui", "http://dspace.univ-batna.dz"] },
  { key: "batna2", nameFr: "Université Batna 2 Mostefa Ben Boulaïd", nameAr: "جامعة باتنة 2 مصطفى بن بولعيد", wilaya: "Batna", sites: ["http://dspace.univ-batna2.dz"] },
  { key: "bejaia", nameFr: "Université Abderrahmane Mira de Béjaïa", nameAr: "جامعة عبد الرحمان ميرة بجاية", wilaya: "Béjaïa", sites: ["http://univ-bejaia.dz/dspace", "http://dspace.univ-bejaia.dz"] },
  { key: "boumerdes", nameFr: "Université M'Hamed Bougara Boumerdès", nameAr: "جامعة أمحمد بوقرة بومرداس", wilaya: "Boumerdès", sites: ["http://dlibrary.univ-boumerdes.dz:8080", "http://dlibrary.univ-boumerdes.dz"] },
  { key: "bouira", nameFr: "Université Akli Mohand Oulhadj Bouira", nameAr: "جامعة أكلي محند أولحاج البويرة", wilaya: "Bouira", sites: ["http://dspace.univ-bouira.dz:8080/jspui", "http://dspace.univ-bouira.dz"] },
  { key: "soukahras", nameFr: "Université Mohamed Chérif Messaadia Souk Ahras", nameAr: "جامعة محمد الشريف مساعدية سوق أهراس", wilaya: "Souk Ahras", sites: ["https://dspace.univ-soukahras.dz"] },
  { key: "guelma", nameFr: "Université 8 Mai 1945 Guelma", nameAr: "جامعة 8 ماي 1945 قالمة", wilaya: "Guelma", sites: ["http://dspace.univ-guelma.dz"] },
  { key: "jijel", nameFr: "Université Mohammed Seddik Ben Yahia Jijel", nameAr: "جامعة محمد الصديق بن يحيى جيجل", wilaya: "Jijel", sites: ["http://dspace.univ-jijel.dz"] },
  { key: "khenchela", nameFr: "Université Abbès Laghrour Khenchela", nameAr: "جامعة عباس لغرور خنشلة", wilaya: "Khenchela", sites: ["http://dspace.univ-khenchela.dz"] },
  { key: "oeb", nameFr: "Université Larbi Ben M'hidi Oum El Bouaghi", nameAr: "جامعة العربي بن مهيدي أم البواقي", wilaya: "Oum El Bouaghi", sites: ["http://dspace.univ-oeb.dz", "http://bib.univ-oeb.dz"] },
  { key: "tebessa", nameFr: "Université Larbi Tébessi Tébessa", nameAr: "جامعة العربي التبسي تبسة", wilaya: "Tébessa", sites: ["http://dspace.univ-tebessa.dz"] },
  { key: "eloued", nameFr: "Université Hamma Lakhdar El Oued", nameAr: "جامعة حمه لخضر الوادي", wilaya: "El Oued", sites: ["http://dspace.univ-eloued.dz"] },
  { key: "ghardaia", nameFr: "Université de Ghardaïa", nameAr: "جامعة غرداية", wilaya: "Ghardaïa", sites: ["http://dspace.univ-ghardaia.dz", "https://dspace.univ-ghardaia.edu.dz"] },
  { key: "adrar", nameFr: "Université Ahmed Draia Adrar", nameAr: "جامعة أحمد دراية أدرار", wilaya: "Adrar", sites: ["http://dspace.univ-adrar.edu.dz", "http://dspace.univ-adrar.dz"] },
  { key: "bechar", nameFr: "Université Tahri Mohammed Béchar", nameAr: "جامعة طاهري محمد بشار", wilaya: "Béchar", sites: ["http://dspace.univ-bechar.dz"] },
  { key: "lagh", nameFr: "Université Amar Telidji Laghouat", nameAr: "جامعة عمار ثليجي الأغواط", wilaya: "Laghouat", sites: ["http://dspace.lagh-univ.dz"] },
  { key: "djelfa", nameFr: "Université Ziane Achour Djelfa", nameAr: "جامعة زيان عاشور الجلفة", wilaya: "Djelfa", sites: ["http://dspace.univ-djelfa.dz"] },
  { key: "blida", nameFr: "Université Saad Dahlab Blida 1", nameAr: "جامعة سعد دحلب البليدة 1", wilaya: "Blida", sites: ["https://di.univ-blida.dz", "http://dspace.univ-blida.dz"] },
  { key: "blida2", nameFr: "Université Ali Lounici Blida 2", nameAr: "جامعة علي لونيسي البليدة 2", wilaya: "Blida", sites: ["http://dspace.univ-blida2.dz"] },
  { key: "dbkm", nameFr: "Université Djilali Bounaama Khemis Miliana", nameAr: "جامعة جيلالي بونعامة خميس مليانة", wilaya: "Aïn Defla", sites: ["http://dspace.univ-dbkm.dz"] },
  { key: "tiaret", nameFr: "Université Ibn Khaldoun Tiaret", nameAr: "جامعة ابن خلدون تيارت", wilaya: "Tiaret", sites: ["http://dspace.univ-tiaret.dz"] },
  { key: "tissemsilt", nameFr: "Université Ahmed Ben Yahia El Wancharissi Tissemsilt", nameAr: "جامعة أحمد بن يحيى الونشريسي تيسمسيلت", wilaya: "Tissemsilt", sites: ["http://dspace.univ-tissemsilt.dz"] },
  { key: "saida", nameFr: "Université Moulay Tahar Saïda", nameAr: "جامعة مولاي الطاهر سعيدة", wilaya: "Saïda", sites: ["http://dspace.univ-saida.dz"] },
  { key: "mascara", nameFr: "Université Mustapha Stambouli Mascara", nameAr: "جامعة مصطفى اسطمبولي معسكر", wilaya: "Mascara", sites: ["http://dspace.univ-mascara.dz"] },
  { key: "relizane", nameFr: "Université Ahmed Zabana Relizane", nameAr: "جامعة أحمد زبانة غليزان", wilaya: "Relizane", sites: ["http://dspace.univ-relizane.dz"] },
  { key: "mila", nameFr: "Centre Universitaire Abdelhafid Boussouf Mila", nameAr: "المركز الجامعي عبد الحفيظ بوالصوف ميلة", wilaya: "Mila", sites: ["http://dspace.centre-univ-mila.dz", "https://dspace.centre-univ-mila.dz"] },
  { key: "bba", nameFr: "Université Mohamed El Bachir El Ibrahimi BBA", nameAr: "جامعة محمد البشير الإبراهيمي برج بوعريريج", wilaya: "Bordj Bou Arréridj", sites: ["http://dspace.univ-bba.dz"] },
  { key: "setif2", nameFr: "Université Mohamed Lamine Debaghine Sétif 2", nameAr: "جامعة محمد لمين دباغين سطيف 2", wilaya: "Sétif", sites: ["http://dspace.univ-setif2.dz"] },
  { key: "tipaza", nameFr: "Université de Tipaza", nameAr: "جامعة تيبازة", wilaya: "Tipaza", sites: ["http://dspace.univ-tipaza.dz"] },
  { key: "enskouba", nameFr: "ENS Kouba Alger", nameAr: "المدرسة العليا للأساتذة القبة", wilaya: "Alger", sites: ["http://dspace.ens-kouba.dz"] },
  // Biskra runs a second, EPrints-based thesis repository next to its dead
  // DSpace OAI. Different software, hence the /cgi/oai2 path.
  { key: "biskra_eprints", nameFr: "Université Mohamed Khider Biskra (thèses EPrints)", nameAr: "جامعة محمد خيضر بسكرة", wilaya: "Biskra", sites: ["http://thesis.univ-biskra.dz"] },
];

const OAI_PATHS = [
  "/server/oai/request", // DSpace 7
  "/oai/request", // DSpace 5/6
  "/jspui/oai/request",
  "/dspace/oai/request",
  "/dspace-oai/request",
  "/cgi/oai2", // EPrints
];

const MATH = /(math[ée]mat|mathemat|\bmaths?\b|رياضيات)/i;
// Sets mixing maths with another discipline must stay "mixed" so the
// classifier keeps filtering titles instead of trusting the collection.
const MIXED = /(informatique|computer|physique|chimie|biolog|technolog|ingénieur|إعلام آلي|علوم دقيقة)/i;

function guessDegree(name: string): string | null {
  const n = name.toLowerCase();
  if (/doctorat|doctorate|ph\.?d|دكتوراه|أطروحة/.test(n)) return "doctorat";
  if (/magist|ماجستير/.test(n)) return "magister";
  if (/master|ماستر/.test(n)) return "master";
  if (/licence|ليسانس/.test(n)) return "licence";
  if (/ing[ée]nieur|مهندس/.test(n)) return "ingenieur";
  return null;
}

/** "dspace.univ-jijel.dz" -> "jijel"; "dspace.lagh-univ.dz" -> "lagh". */
function keyFromHost(host: string): string {
  const h = host.replace(/^www\./, "").replace(/:\d+$/, "").toLowerCase();
  const m = /univ-([a-z0-9]+)|([a-z0-9]+)-univ/.exec(h);
  if (m) return m[1] || m[2];
  const parts = h.split(".");
  return parts.length > 2 ? parts[1] : parts[0];
}

type Target = { key: string; seed: Seed | null; urls: string[] };

function expand(site: string): string[] {
  const clean = site.replace(/\/+$/, "");
  const alt = clean.startsWith("https://")
    ? "http://" + clean.slice(8)
    : "https://" + clean.slice(7);
  const out: string[] = [];
  for (const base of [clean, alt]) for (const p of OAI_PATHS) out.push(base + p);
  return out;
}

async function loadRegistries(log: (s: string) => void): Promise<string[]> {
  const urls = new Set<string>();
  for (const src of REGISTRIES) {
    try {
      const body = await getText(src, { accept: "text/plain,*/*", timeoutMs: 60000, tries: 2 });
      let hits = 0;
      for (const raw of body.split(/[\s,;"']+/)) {
        if (!/^https?:\/\//i.test(raw)) continue;
        if (!/\.dz(?::\d+)?(?:\/|$)/i.test(raw)) continue;
        urls.add(raw.replace(/\?.*$/, "").replace(/\/+$/, ""));
        hits++;
      }
      log("  registry ok (" + hits + " .dz urls) " + src.split("/").slice(-1)[0]);
    } catch (e) {
      log("  registry skipped " + src.split("/").slice(-1)[0] + ": " + (e instanceof Error ? e.message : String(e)));
    }
  }
  return [...urls];
}

function buildTargets(registryUrls: string[]): Target[] {
  const byKey = new Map<string, Target>();

  for (const s of SEEDS) {
    byKey.set(s.key, { key: s.key, seed: s, urls: s.sites.flatMap(expand) });
  }

  for (const u of registryUrls) {
    let host: string;
    try {
      host = new URL(u).host;
    } catch {
      continue;
    }
    const key = keyFromHost(host);
    const t = byKey.get(key);
    // Registry entries are already full OAI URLs, so probe them as-is first,
    // then fall back to the usual path guesses on the same host.
    const candidates = [u, ...expand(u.replace(/\/(server\/oai|oai|jspui\/oai|dspace\/oai|dspace-oai|cgi)\/.*$/, ""))];
    if (t) {
      for (const c of candidates) if (!t.urls.includes(c)) t.urls.unshift(c);
    } else {
      byKey.set(key, { key, seed: null, urls: candidates });
    }
  }

  return [...byKey.values()];
}

type FoundSet = { spec: string; label: string; purity: string; degree: string | null };
type Probe = {
  target: Target;
  oai: string;
  version: number;
  site: string;
  repoName: string;
  sets: FoundSet[];
  note: string;
};

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

async function listSets(oai: string, timeoutMs: number) {
  const out: Array<{ spec: string; name: string }> = [];
  let url = oai + "?verb=ListSets";
  let guard = 0;
  while (url && guard++ < 80) {
    const xml = await getText(url, { accept: "application/xml,text/xml,*/*", timeoutMs, tries: 2 });
    if (oaiError(xml)) break;
    for (const b of blocks(xml, "set")) {
      const spec = firstValue(b, "setSpec");
      if (spec) out.push({ spec, name: firstValue(b, "setName") || spec });
    }
    const { token } = resumption(xml);
    url = token ? oai + "?verb=ListSets&resumptionToken=" + encodeURIComponent(token) : "";
  }
  return out;
}

async function probe(t: Target, timeoutMs: number, log: (s: string) => void): Promise<Probe | null> {
  const tried = new Set<string>();
  for (const oai of t.urls) {
    if (tried.has(oai)) continue;
    tried.add(oai);

    const repoName = await tryIdentify(oai, timeoutMs);
    if (!repoName) continue;

    log("  " + t.key + " OAI ok -> " + oai + "  [" + repoName + "]");
    let sets: Array<{ spec: string; name: string }> = [];
    let note = "";
    try {
      sets = await listSets(oai, timeoutMs);
    } catch (e) {
      note = "ListSets failed: " + (e instanceof Error ? e.message : String(e));
      log("    " + note);
    }

    const math: FoundSet[] = sets
      .filter((s) => MATH.test(s.name))
      .map((s) => ({
        spec: s.spec,
        label: s.name,
        purity: MIXED.test(s.name) ? "mixed" : "pure",
        degree: guessDegree(s.name),
      }));

    log("    " + sets.length + " sets, " + math.length + " math");
    return {
      target: t,
      oai,
      version: oai.includes("/server/oai") ? 7 : 6,
      site: oai.replace(/\/(server\/oai|oai|jspui\/oai|dspace\/oai|dspace-oai|cgi)\/.*$/, ""),
      repoName,
      sets: math,
      note,
    };
  }
  log("  " + t.key + " -> no OAI endpoint answered (" + t.urls.length + " tried)");
  return null;
}

function render(p: Probe): string {
  const s = p.target.seed;
  const L: string[] = [];
  L.push("  // " + p.repoName);
  L.push("  {");
  L.push('    key: "' + p.target.key + '",');
  L.push('    nameFr: "' + (s ? s.nameFr : p.repoName.replace(/"/g, "'")) + '",');
  L.push('    nameAr: "' + (s ? s.nameAr : "") + '",');
  L.push('    slug: "' + p.target.key + '",');
  L.push('    wilaya: "' + (s ? s.wilaya : "") + '",');
  L.push('    oai: "' + p.oai + '",');
  L.push("    version: " + p.version + ",");
  L.push('    site: "' + p.site + '",');
  L.push("    enabled: " + (p.sets.length > 0) + ",");
  L.push("    sets: [");
  for (const x of p.sets) {
    L.push(
      '      { spec: "' + x.spec + '", label: "' + x.label.replace(/"/g, "'") +
        '", purity: "' + x.purity + '"' + (x.degree ? ', degree: "' + x.degree + '"' : "") + " },"
    );
  }
  L.push("    ],");
  L.push("  },");
  return L.join("\n");
}

async function pool<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    new Array(Math.min(size, items.length)).fill(0).map(async () => {
      for (;;) {
        const idx = i++;
        if (idx >= items.length) return;
        out[idx] = await fn(items[idx]);
      }
    })
  );
  return out;
}

async function main() {
  const argOnly = process.argv.find((a) => a.startsWith("--only="));
  const argTimeout = process.argv.find((a) => a.startsWith("--timeout="));
  const noRegistry = process.argv.includes("--no-registry");
  const withExisting = process.argv.includes("--all");
  const timeoutMs = argTimeout ? Number(argTimeout.split("=")[1]) : 15000;
  const only = argOnly ? argOnly.split("=")[1].split(",") : null;

  console.log("loading public OAI registries...");
  const registryUrls = noRegistry ? [] : await loadRegistries((s) => console.log(s));
  console.log("  " + registryUrls.length + " distinct .dz endpoints from registries\n");

  let targets = buildTargets(registryUrls);
  if (only) targets = targets.filter((t) => only.includes(t.key));
  else if (!withExisting) targets = targets.filter((t) => !EXISTING.has(t.key));

  console.log("probing " + targets.length + " repositories (timeout " + timeoutMs + "ms)\n");
  const started = Date.now();
  const results = await pool(targets, 6, (t) => probe(t, timeoutMs, (s) => console.log(s)));

  const ok = results.filter((r): r is Probe => !!r);
  const withMath = ok.filter((r) => r.sets.length > 0);
  const dead = targets.filter((t) => !ok.some((r) => r.target.key === t.key));

  const body: string[] = [];
  body.push("// Generated by scripts/discover-repos.ts on " + new Date().toISOString());
  body.push("// Paste the blocks you want into the REPOS array of src/lib/theses/repos.ts.");
  body.push("");
  for (const p of withMath) body.push(render(p), "");

  body.push("// ---- reachable, but no set name mentions mathematics ----");
  for (const p of ok.filter((r) => r.sets.length === 0)) {
    body.push("// " + p.target.key + "  " + p.oai + "  " + (p.note || "browse manually"));
  }
  body.push("");
  body.push("// ---- no OAI endpoint answered (dead, renamed, or HTML-only) ----");
  for (const t of dead) body.push("// " + t.key + "  " + t.urls.slice(0, 3).join("  "));

  writeFileSync("discovered-repos.txt", body.join("\n"), "utf8");

  console.log("");
  console.log("reachable       = " + ok.length + " / " + targets.length);
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
