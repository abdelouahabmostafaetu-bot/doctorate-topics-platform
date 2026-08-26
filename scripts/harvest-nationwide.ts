import "dotenv/config";
import dns from "node:dns";
import type { HarvestSummary } from "../src/lib/theses/harvest";

const servers = (process.env.DNS_SERVERS || "1.1.1.1,8.8.8.8")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
try {
  dns.setServers(servers);
} catch {
  // Keep the system resolver if the configured resolver list is invalid.
}

async function main() {
  const { ensureIndexes } = await import("../src/lib/theses/db");
  const { enabledRepos, repoByKey } = await import("../src/lib/theses/repos");
  const { harvestRepo } = await import("../src/lib/theses/harvest");
  const { harvestAggregator } = await import("../src/lib/theses/aggregator");
  const { dedupeTheses } = await import("../src/lib/theses/dedupe");
  const { meiliEnabled } = await import("../src/lib/theses/meili");
  const { syncAll } = await import("../src/lib/theses/meili-sync");

  const arg = (name: string): string | undefined => {
    const hit = process.argv.find((x) => x.startsWith("--" + name + "="));
    return hit ? hit.slice(name.length + 3) : undefined;
  };
  const has = (name: string): boolean => process.argv.includes("--" + name);
  const concurrency = Math.max(1, Math.min(8, Number(arg("concurrency") || 4)));
  const only = arg("repo");
  const skipAggregator = has("skip-aggregator");
  const skipSync = has("skip-sync");

  await ensureIndexes();
  const repos = only
    ? only
        .split(/[ ,]+/)
        .map((key) => repoByKey(key.trim()))
        .filter((repo): repo is NonNullable<typeof repo> => Boolean(repo))
    : enabledRepos();

  if (!repos.length) throw new Error("No enabled repositories selected");

  const log = (message: string) => console.log(message);
  const started = Date.now();
  const summaries: HarvestSummary[] = new Array(repos.length);
  let next = 0;

  async function worker(workerId: number) {
    for (;;) {
      const index = next++;
      if (index >= repos.length) return;
      const repo = repos[index];
      log("== [worker " + workerId + "] " + repo.key + " (" + repo.nameFr + ")");
      summaries[index] = await harvestRepo(repo, log);
      const s = summaries[index];
      log(
        "   " + repo.key + " found=" + s.found + " ok=" + s.saved +
          " review=" + s.review + " rejected=" + s.rejected +
          (s.error ? " ERROR=" + s.error : "")
      );
    }
  }

  await Promise.all(
    new Array(Math.min(concurrency, repos.length))
      .fill(0)
      .map((_, i) => worker(i + 1))
  );

  let aggregatorSummary: unknown[] = [];
  if (!skipAggregator) {
    log("== national aggregator");
    aggregatorSummary = await harvestAggregator({}, log);
  }

  const dedupe = await dedupeTheses(log);

  let sync: unknown = { skipped: true, reason: "disabled" };
  if (!skipSync && meiliEnabled()) {
    log("== Meilisearch synchronization");
    sync = await syncAll(log);
  } else if (!skipSync) {
    log("== Meilisearch synchronization skipped (not configured; Mongo fallback remains active)");
  }

  const totals = summaries.reduce(
    (a, s) => ({
      found: a.found + s.found,
      saved: a.saved + s.saved,
      review: a.review + s.review,
      rejected: a.rejected + s.rejected,
      errors: a.errors + (s.error ? 1 : 0),
    }),
    { found: 0, saved: 0, review: 0, rejected: 0, errors: 0 }
  );

  console.log(
    JSON.stringify(
      {
        mode: "nationwide",
        repositories: summaries,
        totals,
        aggregator: aggregatorSummary,
        dedupe,
        sync,
        elapsedSeconds: Math.round((Date.now() - started) / 1000),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
