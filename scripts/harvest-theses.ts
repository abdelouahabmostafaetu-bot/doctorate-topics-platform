import "dotenv/config";
import { harvestAll } from "../src/lib/theses/harvest";

async function main() {
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
