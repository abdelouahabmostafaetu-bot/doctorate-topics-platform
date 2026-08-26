import "dotenv/config";
import dns from "node:dns";
import { dedupeTheses } from "../src/lib/theses/dedupe";

async function main() {
  try {
    dns.setServers((process.env.DNS_SERVERS || "1.1.1.1,8.8.8.8").split(","));
  } catch {
    // Keep the system resolver if needed.
  }

  const result = await dedupeTheses((message) => console.log(message));
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
