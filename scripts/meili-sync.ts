import "dotenv/config";
import dns from "node:dns";

// Same DNS pinning as harvest-theses.ts: mongodb+srv needs SRV lookups and
// Windows often hands Node only a link-local IPv6 resolver.
const servers = (process.env.DNS_SERVERS || "1.1.1.1,8.8.8.8")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

try {
  dns.setServers(servers);
  console.log("dns servers -> " + dns.getServers().join(", "));
} catch (e) {
  console.warn(
    "could not pin dns servers: " + (e instanceof Error ? e.message : String(e))
  );
}

async function main() {
  const { syncAll } = await import("../src/lib/theses/meili-sync");
  const started = Date.now();
  const res = await syncAll((s) => console.log(s));
  console.log("");
  console.log("SENT " + res.sent + " documents in " + res.batches + " batches");
  console.log("took " + Math.round((Date.now() - started) / 1000) + "s");
  console.log("Meilisearch indexes asynchronously; check /tasks on the server.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
