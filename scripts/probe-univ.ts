/**
 * scripts/probe-univ.ts
 *
 * Auto-discovery for the Algerian universities that are still missing from
 * src/lib/theses/repos.ts.
 *
 * For every candidate host it tries, in order:
 *   1. OAI-PMH   ->  /server/oai/request  then  /oai/request  (Identify + ListSets)
 *   2. REST v7   ->  /server/api/discover/search/objects?dsoType=collection
 *   3. HTML      ->  /community-list on several DSpace contexts
 *
 * Every collection whose name matches the math filter is kept, and the script
 * prints a ready-to-paste RepoDef block for src/lib/theses/repos-extra.ts.
 *
 * Usage:  npm run probe-univ
 *         npm run probe-univ -- tamanrasset setif2      (only those keys)
 *
 * Nothing is written to MongoDB: this script is read-only and safe to re-run.
 */

import { writeFileSync } from "node:fs";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const TIMEOUT_MS = 45_000;
const MATH = /math|mathemat|rياض|\u0631\u064a\u0627\u0636|\bMI\b/i;

type Candidate = {
  key: string;
  nameFr: string;
  nameAr: string;
  slug: string;
  wilaya: string;
  hosts: string[];
};

type Found = { spec: string; label: string };

type Report = {
  key: string;
  nameFr: string;
  status: "ok" | "alive-no-math" | "dead";
  site?: string;
  oai?: string;
  version?: 6 | 7;
  mode?: "oai" | "rest" | "html";
  repositoryName?: string;
  sets: Found[];
  tried: string[];
};

/* ------------------------------------------------------------------ */
/* Candidates                                                          */
/* ------------------------------------------------------------------ */

const CANDIDATES: Candidate[] = [
  {
    key: "tamanrasset",
    nameFr: "Universite de Tamanghasset",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u062a\u0627\u0645\u0646\u063a\u0633\u062a",
    slug: "tamanrasset",
    wilaya: "\u062a\u0627\u0645\u0646\u063a\u0633\u062a",
    hosts: ["https://dspace.univ-tam.dz", "http://dspace.univ-tam.dz:8080"],
  },
  {
    key: "setif2",
    nameFr: "Universite Mohamed Lamine Debaghine - Setif 2",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u0645\u062d\u0645\u062f \u0644\u0645\u064a\u0646 \u062f\u0628\u0627\u063a\u064a\u0646 - \u0633\u0637\u064a\u0641 2",
    slug: "setif-2",
    wilaya: "\u0633\u0637\u064a\u0641",
    hosts: ["https://dspace.univ-setif2.dz"],
  },
  {
    key: "bejaia",
    nameFr: "Universite Abderrahmane Mira - Bejaia",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u0639\u0628\u062f \u0627\u0644\u0631\u062d\u0645\u0627\u0646 \u0645\u064a\u0631\u0629 - \u0628\u062c\u0627\u064a\u0629",
    slug: "bejaia",
    wilaya: "\u0628\u062c\u0627\u064a\u0629",
    hosts: ["https://www.univ-bejaia.dz/dspace", "https://univ-bejaia.dz/dspace"],
  },
  {
    key: "eltarf",
    nameFr: "Universite Chadli Bendjedid - El Tarf",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u0634\u0627\u0630\u0644\u064a \u0628\u0646 \u062c\u062f\u064a\u062f - \u0627\u0644\u0637\u0627\u0631\u0641",
    slug: "el-tarf",
    wilaya: "\u0627\u0644\u0637\u0627\u0631\u0641",
    hosts: ["http://depotucbet.univ-eltarf.dz:4000", "https://depotucbet.univ-eltarf.dz"],
  },
  {
    key: "oran1",
    nameFr: "Universite Oran 1 Ahmed Ben Bella",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u0648\u0647\u0631\u0627\u0646 1 \u0623\u062d\u0645\u062f \u0628\u0646 \u0628\u0644\u0629",
    slug: "oran-1",
    wilaya: "\u0648\u0647\u0631\u0627\u0646",
    hosts: ["https://dspace.univ-oran1.dz", "http://dspace.univ-oran1.dz"],
  },
  {
    key: "ufc",
    nameFr: "Universite de la Formation Continue",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u062a\u0643\u0648\u064a\u0646 \u0627\u0644\u0645\u062a\u0648\u0627\u0635\u0644",
    slug: "ufc",
    wilaya: "\u0627\u0644\u062c\u0632\u0627\u0626\u0631",
    hosts: ["https://dspace.ufc.dz"],
  },
  {
    key: "constantine1",
    nameFr: "Universite Freres Mentouri - Constantine 1",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u0625\u062e\u0648\u0629 \u0645\u0646\u062a\u0648\u0631\u064a - \u0642\u0633\u0646\u0637\u064a\u0646\u0629 1",
    slug: "constantine-1",
    wilaya: "\u0642\u0633\u0646\u0637\u064a\u0646\u0629",
    hosts: [
      "https://archives.umc.edu.dz",
      "http://archives.umc.edu.dz",
      "https://dspace.umc.edu.dz",
    ],
  },
  {
    key: "batna2",
    nameFr: "Universite Batna 2 Mostefa Ben Boulaid",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u0628\u0627\u062a\u0646\u0629 2",
    slug: "batna-2",
    wilaya: "\u0628\u0627\u062a\u0646\u0629",
    hosts: ["https://dspace.univ-batna2.dz", "http://dspace.univ-batna2.dz:8080"],
  },
  {
    key: "guelma",
    nameFr: "Universite 8 Mai 1945 - Guelma",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 8 \u0645\u0627\u064a 1945 - \u0642\u0627\u0644\u0645\u0629",
    slug: "guelma",
    wilaya: "\u0642\u0627\u0644\u0645\u0629",
    hosts: ["https://dspace.univ-guelma.dz", "http://dspace.univ-guelma.dz:8080"],
  },
  {
    key: "jijel",
    nameFr: "Universite Mohammed Seddik Ben Yahia - Jijel",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u0645\u062d\u0645\u062f \u0627\u0644\u0635\u062f\u064a\u0642 \u0628\u0646 \u064a\u062d\u064a\u0649 - \u062c\u064a\u062c\u0644",
    slug: "jijel",
    wilaya: "\u062c\u064a\u062c\u0644",
    hosts: [
      "https://dspace.univ-jijel.dz",
      "http://dspace.univ-jijel.dz:8080",
      "https://dl.univ-jijel.dz",
    ],
  },
  {
    key: "oeb",
    nameFr: "Universite Larbi Ben M'hidi - Oum El Bouaghi",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u0639\u0631\u0628\u064a \u0628\u0646 \u0645\u0647\u064a\u062f\u064a - \u0623\u0645 \u0627\u0644\u0628\u0648\u0627\u0642\u064a",
    slug: "oum-el-bouaghi",
    wilaya: "\u0623\u0645 \u0627\u0644\u0628\u0648\u0627\u0642\u064a",
    hosts: ["https://dspace.univ-oeb.dz", "http://dspace.univ-oeb.dz:8080"],
  },
  {
    key: "tebessa",
    nameFr: "Universite Larbi Tebessi - Tebessa",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u0639\u0631\u0628\u064a \u0627\u0644\u062a\u0628\u0633\u064a - \u062a\u0628\u0633\u0629",
    slug: "tebessa",
    wilaya: "\u062a\u0628\u0633\u0629",
    hosts: ["https://dspace.univ-tebessa.dz", "http://dspace.univ-tebessa.dz:8080"],
  },
  {
    key: "khenchela",
    nameFr: "Universite Abbes Laghrour - Khenchela",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u0639\u0628\u0627\u0633 \u0644\u063a\u0631\u0648\u0631 - \u062e\u0646\u0634\u0644\u0629",
    slug: "khenchela",
    wilaya: "\u062e\u0646\u0634\u0644\u0629",
    hosts: ["https://dspace.univ-khenchela.dz", "http://dspace.univ-khenchela.dz:8080"],
  },
  {
    key: "bouira",
    nameFr: "Universite Akli Mohand Oulhadj - Bouira",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u0623\u0643\u0644\u064a \u0645\u062d\u0646\u062f \u0623\u0648\u0644\u062d\u0627\u062c - \u0627\u0644\u0628\u0648\u064a\u0631\u0629",
    slug: "bouira",
    wilaya: "\u0627\u0644\u0628\u0648\u064a\u0631\u0629",
    hosts: ["https://dspace.univ-bouira.dz", "http://dspace.univ-bouira.dz:8080"],
  },
  {
    key: "bba",
    nameFr: "Universite Mohamed El Bachir El Ibrahimi - Bordj Bou Arreridj",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u0645\u062d\u0645\u062f \u0627\u0644\u0628\u0634\u064a\u0631 \u0627\u0644\u0625\u0628\u0631\u0627\u0647\u064a\u0645\u064a - \u0628\u0631\u062c \u0628\u0648\u0639\u0631\u064a\u0631\u064a\u062c",
    slug: "bordj-bou-arreridj",
    wilaya: "\u0628\u0631\u062c \u0628\u0648\u0639\u0631\u064a\u0631\u064a\u062c",
    hosts: ["https://dspace.univ-bba.dz", "http://dspace.univ-bba.dz:8080"],
  },
  {
    key: "khemismiliana",
    nameFr: "Universite Djilali Bounaama - Khemis Miliana",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u062c\u064a\u0644\u0627\u0644\u064a \u0628\u0648\u0646\u0639\u0627\u0645\u0629 - \u062e\u0645\u064a\u0633 \u0645\u0644\u064a\u0627\u0646\u0629",
    slug: "khemis-miliana",
    wilaya: "\u0639\u064a\u0646 \u0627\u0644\u062f\u0641\u0644\u0649",
    hosts: ["https://dspace.univ-dbkm.dz", "http://dspace.univ-dbkm.dz:8080"],
  },
  {
    key: "eloued",
    nameFr: "Universite Hamma Lakhdar - El Oued",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u062d\u0645\u0629 \u0644\u062e\u0636\u0631 - \u0627\u0644\u0648\u0627\u062f\u064a",
    slug: "el-oued",
    wilaya: "\u0627\u0644\u0648\u0627\u062f\u064a",
    hosts: ["https://dspace.univ-eloued.dz", "http://dspace.univ-eloued.dz:8080"],
  },
  {
    key: "bechar",
    nameFr: "Universite Tahri Mohamed - Bechar",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u0637\u0627\u0647\u0631\u064a \u0645\u062d\u0645\u062f - \u0628\u0634\u0627\u0631",
    slug: "bechar",
    wilaya: "\u0628\u0634\u0627\u0631",
    hosts: ["https://dspace.univ-bechar.dz", "http://dspace.univ-bechar.dz:8080"],
  },
  {
    key: "mascara",
    nameFr: "Universite Mustapha Stambouli - Mascara",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u0645\u0635\u0637\u0641\u0649 \u0627\u0633\u0637\u0645\u0628\u0648\u0644\u064a - \u0645\u0639\u0633\u0643\u0631",
    slug: "mascara",
    wilaya: "\u0645\u0639\u0633\u0643\u0631",
    hosts: ["https://dspace.univ-mascara.dz", "http://dspace.univ-mascara.dz:8080"],
  },
  {
    key: "saida",
    nameFr: "Universite Moulay Tahar - Saida",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u0645\u0648\u0644\u0627\u064a \u0627\u0644\u0637\u0627\u0647\u0631 - \u0633\u0639\u064a\u062f\u0629",
    slug: "saida",
    wilaya: "\u0633\u0639\u064a\u062f\u0629",
    hosts: ["https://dspace.univ-saida.dz", "http://dspace.univ-saida.dz:8080"],
  },
];

/* ------------------------------------------------------------------ */
/* HTTP                                                                */
/* ------------------------------------------------------------------ */

async function get(url: string): Promise<{ ok: boolean; status: number; body: string }> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "*/*" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "follow",
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    return { ok: false, status: 0, body: (err as Error).message };
  }
}

function isMath(name: string): boolean {
  return MATH.test(name);
}

function clean(s: string): string {
  return s.replace(/\s+/g, " ").replace(/&amp;/g, "&").trim();
}

/* ------------------------------------------------------------------ */
/* 1. OAI-PMH                                                          */
/* ------------------------------------------------------------------ */

async function probeOai(
  host: string,
): Promise<{ oai: string; repositoryName: string; sets: Found[] } | null> {
  for (const path of ["/server/oai/request", "/oai/request", "/jspui/oai/request"]) {
    const base = host + path;
    const id = await get(base + "?verb=Identify");
    if (!id.ok || !/<repositoryName>/.test(id.body)) continue;

    const repositoryName = clean(
      /<repositoryName>([^<]+)<\/repositoryName>/.exec(id.body)?.[1] ?? "?",
    );

    const sets: Found[] = [];
    let token = "";
    let guard = 0;
    do {
      const url = token
        ? base + "?verb=ListSets&resumptionToken=" + encodeURIComponent(token)
        : base + "?verb=ListSets";
      const page = await get(url);
      if (!page.ok) break;
      const re = /<set>\s*<setSpec>([\s\S]*?)<\/setSpec>\s*<setName>([\s\S]*?)<\/setName>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(page.body)) !== null) {
        sets.push({ spec: clean(m[1]), label: clean(m[2]) });
      }
      token = /<resumptionToken[^>]*>([^<]+)<\/resumptionToken>/.exec(page.body)?.[1] ?? "";
      guard += 1;
    } while (token && guard < 40);

    return { oai: base, repositoryName, sets };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* 2. REST (DSpace 7)                                                  */
/* ------------------------------------------------------------------ */

async function probeRest(host: string): Promise<Found[] | null> {
  const url =
    host + "/server/api/discover/search/objects?dsoType=collection&size=300";
  const res = await get(url);
  if (!res.ok) return null;
  try {
    const json = JSON.parse(res.body) as any;
    const objects: any[] =
      json?._embedded?.searchResult?._embedded?.objects ?? [];
    const out: Found[] = [];
    for (const o of objects) {
      const io = o?._embedded?.indexableObject;
      const handle: string | undefined = io?.handle;
      const name: string | undefined = io?.name;
      if (!handle || !name) continue;
      out.push({ spec: "col_" + handle.replace("/", "_"), label: clean(name) });
    }
    return out;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* 3. HTML /community-list                                             */
/* ------------------------------------------------------------------ */

async function probeHtml(
  host: string,
): Promise<{ site: string; sets: Found[] } | null> {
  for (const ctx of ["", "/jspui", "/xmlui", "/home"]) {
    const site = host + ctx;
    const res = await get(site + "/community-list");
    if (!res.ok || res.body.length < 500) continue;
    const re = /handle\/(\d+\/\d+)"[^>]*>([^<]{2,140})/g;
    const out: Found[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(res.body)) !== null) {
      out.push({ spec: "col_" + m[1].replace("/", "_"), label: clean(m[2]) });
    }
    if (out.length > 0) return { site, sets: out };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Snippet printer                                                     */
/* ------------------------------------------------------------------ */

function snippet(c: Candidate, r: Report): string {
  const lines: string[] = [];
  lines.push("  {");
  lines.push(`    key: "${c.key}",`);
  lines.push(`    nameFr: "${c.nameFr}",`);
  lines.push(`    nameAr: "${c.nameAr}",`);
  lines.push(`    slug: "${c.slug}",`);
  lines.push(`    wilaya: "${c.wilaya}",`);
  lines.push(`    oai: "${r.oai ?? ""}",`);
  lines.push(`    version: ${r.version ?? 7},`);
  lines.push(`    site: "${r.site ?? c.hosts[0]}",`);
  lines.push("    enabled: true,");
  if (r.mode && r.mode !== "oai") lines.push(`    mode: "${r.mode}",`);
  lines.push("    sets: [");
  for (const s of r.sets) {
    lines.push(
      `      { spec: "${s.spec}", label: ${JSON.stringify(s.label)}, purity: "pure" },`,
    );
  }
  lines.push("    ],");
  lines.push("  },");
  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function probeOne(c: Candidate): Promise<Report> {
  const report: Report = { key: c.key, nameFr: c.nameFr, status: "dead", sets: [], tried: [] };

  for (const host of c.hosts) {
    report.tried.push(host);

    const oai = await probeOai(host);
    if (oai) {
      const math = oai.sets.filter((s) => isMath(s.label));
      report.status = math.length > 0 ? "ok" : "alive-no-math";
      report.site = host;
      report.oai = oai.oai;
      report.mode = "oai";
      report.version = oai.oai.includes("/server/") ? 7 : 6;
      report.repositoryName = oai.repositoryName;
      report.sets = math;
      console.log(
        `  OAI  ${oai.oai}  ->  ${oai.repositoryName}  (${oai.sets.length} sets, ${math.length} math)`,
      );
      if (math.length > 0) return report;
    }

    const rest = await probeRest(host);
    if (rest && rest.length > 0) {
      const math = rest.filter((s) => isMath(s.label));
      console.log(`  REST ${host}  ->  ${rest.length} collections, ${math.length} math`);
      if (math.length > 0) {
        report.status = "ok";
        report.site = host;
        report.oai = report.oai ?? host + "/server/oai/request";
        report.mode = "rest";
        report.version = 7;
        report.sets = math;
        return report;
      }
      if (report.status === "dead") report.status = "alive-no-math";
    }

    const html = await probeHtml(host);
    if (html && html.sets.length > 0) {
      const math = html.sets.filter((s) => isMath(s.label));
      console.log(
        `  HTML ${html.site}  ->  ${html.sets.length} handles, ${math.length} math`,
      );
      if (math.length > 0) {
        report.status = "ok";
        report.site = html.site;
        report.oai = "";
        report.mode = "html";
        report.version = 6;
        report.sets = math;
        return report;
      }
      if (report.status === "dead") report.status = "alive-no-math";
    }
  }

  return report;
}

async function main(): Promise<void> {
  const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const list = only.length > 0 ? CANDIDATES.filter((c) => only.includes(c.key)) : CANDIDATES;

  const reports: Report[] = [];
  for (const c of list) {
    console.log(`\n== ${c.key} (${c.nameFr})`);
    const r = await probeOne(c);
    reports.push(r);
    const icon = r.status === "ok" ? "OK  " : r.status === "alive-no-math" ? "WARN" : "DEAD";
    console.log(`  ${icon} ${c.key}: ${r.sets.length} math collection(s)`);
  }

  console.log("\n\n========== SUMMARY ==========");
  for (const r of reports) {
    console.log(
      `${r.status.padEnd(14)} ${r.key.padEnd(16)} ${r.sets.length} math  ${r.site ?? "-"}`,
    );
  }

  const ok = reports.filter((r) => r.status === "ok");
  if (ok.length > 0) {
    console.log("\n\n========== PASTE INTO src/lib/theses/repos-extra.ts ==========\n");
    for (const r of ok) {
      const c = CANDIDATES.find((x) => x.key === r.key)!;
      console.log(snippet(c, r));
    }
  }

  writeFileSync("probe-univ-result.json", JSON.stringify(reports, null, 2), "utf8");
  console.log("\nSaved -> probe-univ-result.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
