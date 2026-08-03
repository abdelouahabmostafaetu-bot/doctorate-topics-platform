// Etat de la couverture : quelles universites sont reellement dans la base,
// combien de documents, et combien ont deja un PDF resolu.
//
//   npx tsx scripts/coverage.ts
//   npx tsx scripts/coverage.ts --all      (inclut review et rejected)
//   npx tsx scripts/coverage.ts --dump

import "dotenv/config";
import dns from "node:dns";
import { writeFileSync } from "node:fs";

dns.setServers(
  (process.env.DNS_SERVERS || "1.1.1.1,8.8.8.8")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

const out: string[] = [];
function log(s = "") {
  console.log(s);
  out.push(s);
}

function has(name: string): boolean {
  return process.argv.includes("--" + name);
}

function pad(s: string, n: number): string {
  const t = s.length > n ? s.slice(0, n - 1) + "\u2026" : s;
  return t + " ".repeat(Math.max(0, n - t.length));
}
function num(n: number, w: number): string {
  const t = String(n);
  return " ".repeat(Math.max(0, w - t.length)) + t;
}

type Row = {
  _id: string;
  n: number;
  pdf: number;
  ar: string;
  fr: string;
  sources: string[];
};

async function main() {
  const { thesesCol } = await import("../src/lib/theses/db");
  const { REPOS } = await import("../src/lib/theses/repos");
  const col = await thesesCol();

  const match = has("all") ? {} : { status: "ok" };

  const rows = (await col
    .aggregate([
      { $match: match },
      {
        $group: {
          _id: "$uniSlug",
          n: { $sum: 1 },
          pdf: {
            $sum: {
              $cond: [
                { $gt: [{ $ifNull: ["$pdfUrl", ""] }, ""] },
                1,
                0,
              ],
            },
          },
          ar: { $first: "$uniAr" },
          fr: { $first: "$uniFr" },
          sources: { $addToSet: "$repo" },
        },
      },
      { $sort: { n: -1 } },
    ])
    .toArray()) as unknown as Row[];

  const totalDocs = rows.reduce((a, r) => a + r.n, 0);
  const totalPdf = rows.reduce((a, r) => a + r.pdf, 0);

  log("");
  log(
    pad("universite", 46) +
      num(0, 0) +
      pad("", 0) +
      "  docs   PDF   %    sources"
  );
  log("-".repeat(86));

  for (const r of rows) {
    const pct = r.n ? Math.round((r.pdf / r.n) * 100) : 0;
    log(
      pad(r.ar || r.fr || String(r._id), 46) +
        num(r.n, 6) +
        num(r.pdf, 6) +
        num(pct, 5) +
        "    " +
        r.sources.sort().join(",")
    );
  }

  log("-".repeat(86));
  log(
    pad(rows.length + " universite(s)", 46) +
      num(totalDocs, 6) +
      num(totalPdf, 6) +
      num(totalDocs ? Math.round((totalPdf / totalDocs) * 100) : 0, 5)
  );

  // Depots declares dans repos.ts qui n'ont rien rapporte.
  const present = new Set(rows.map((r) => String(r._id)));
  const silent = REPOS.filter((r) => r.enabled && !present.has(r.slug));
  if (silent.length) {
    log("");
    log("depots declares mais muets (" + silent.length + ") :");
    for (const r of silent) log("   " + pad(r.key, 18) + r.site);
  }

  // Repartition par source de moisson.
  const bySource = new Map<string, number>();
  for (const r of rows) {
    for (const s of r.sources) bySource.set(s, (bySource.get(s) || 0) + 0);
  }
  const srcAgg = (await col
    .aggregate([
      { $match: match },
      { $group: { _id: "$repo", n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ])
    .toArray()) as unknown as Array<{ _id: string; n: number }>;

  log("");
  log("par source :");
  for (const s of srcAgg) log("   " + pad(String(s._id), 18) + num(s.n, 6));

  if (has("dump")) {
    writeFileSync("coverage.txt", out.join("\n"), "utf8");
    log("");
    log("-> coverage.txt");
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
