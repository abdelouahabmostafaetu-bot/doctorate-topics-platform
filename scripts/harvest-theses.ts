import "dotenv/config";
import dns from "node:dns";

// Windows frequently hands Node only the router's link-local IPv6 resolver
// (fe80::...). The c-ares resolver bundled with Node cannot talk to a scoped
// link-local address, so every SRV lookup for a mongodb+srv:// URI dies with
// ECONNREFUSED -- even on machines where `nslookup -type=SRV` answers fine.
// Pin public resolvers before anything imports the Mongo client.
// Override with DNS_SERVERS="9.9.9.9,149.112.112.112" if needed.
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
  // Imported lazily so the DNS override above is already in effect.
  const { harvestAll } = await import("../src/lib/theses/harvest");

  const arg = process.argv.find((a) => a.startsWith("--repo="));
  const only = arg ? arg.split("=")[1] : undefined;
  const started = Date.now();
  const res = await harvestAll(only, (s) => console.log(s));
  const total = res.reduce((a, r) => a + r.saved, 0);
  const review = res.reduce((a, r) => a + r.review, 0);
  const rejected = res.reduce((a, r) => a + r.rejected, 0);
  console.log("");
  console.log("TOTAL ok=" + total + " review=" + review + " rejected=" + rejected);
  console.log("took " + Math.round((Date.now() - started) / 1000) + "s");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
