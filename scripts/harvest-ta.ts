import "dotenv/config";
import dns from "node:dns";

// Meme correctif que harvest-theses.ts : le resolveur IPv6 link-local de la box
// fait echouer querySrv sur l'URI mongodb+srv, alors que nslookup fonctionne.
const servers = (process.env.DNS_SERVERS || "1.1.1.1,8.8.8.8")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
dns.setServers(servers);
console.log("dns servers ->", servers.join(", "));

function flag(name: string): string | undefined {
  const hit = process.argv.slice(2).find((a) => a.startsWith("--" + name + "="));
  return hit ? hit.slice(name.length + 3) : undefined;
}

function has(name: string): boolean {
  return process.argv.slice(2).includes("--" + name);
}

async function main() {
  const t0 = Date.now();
  const log = (s: string) => console.log(s);

  // Import tardif : le module ouvre Mongo, il ne doit pas se charger avant dns.
  const { harvestAggregator, dedupeByHandle, TA_FIELDS } = await import(
    "../src/lib/theses/aggregator"
  );

  if (has("list")) {
    for (const f of TA_FIELDS) console.log(f.purity.padEnd(6), f.name);
    process.exit(0);
  }

  const only = flag("field");
  const fields = only
    ? only.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

  const sums = await harvestAggregator({ fields }, log);

  let ok = 0;
  let review = 0;
  let rejected = 0;
  for (const s of sums) {
    ok += s.saved;
    review += s.review;
    rejected += s.rejected;
  }
  console.log("");
  console.log("TOTAL ok=" + ok + " review=" + review + " rejected=" + rejected);

  if (has("dedupe")) await dedupeByHandle(log);

  console.log("took " + Math.round((Date.now() - t0) / 1000) + "s");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
