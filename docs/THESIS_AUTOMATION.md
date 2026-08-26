# Nationwide thesis harvesting

The thesis pipeline is intentionally **metadata-first**: it indexes records from official university repositories and keeps the university landing page as the source of truth. It does not bypass restricted PDFs.

## Commands

`npm run harvest-national -- --concurrency=4` harvests every enabled university repository, using at most four university workers at once. Each collection is retried for transient network failures, while HTTP 401/403/404 errors are recorded and skipped. After the direct sources, the national aggregator is harvested, high-confidence duplicates are merged, and Meilisearch is synchronized when `MEILI_HOST` and `MEILI_MASTER_KEY` are configured.

For a safe test, use `npm run harvest-national -- --repo=ouargla --concurrency=1 --skip-aggregator --skip-sync`. To run the cleanup independently, use `npm run dedupe-theses`.

## Duplicate policy

Duplicates are merged, not blindly removed. The strongest key is the canonical university host plus repository handle. A conservative fallback key uses the university, degree, year, normalized title, and normalized author list. The best record is retained, while abstracts, keywords, authors, supervisors, and any public PDF URL are combined.

## GitHub Actions

`.github/workflows/harvest-theses.yml` supports manual dispatch and a weekly Sunday run at 02:17 UTC. Add the following repository secrets before enabling the workflow:

- `DATABASE_URL` — MongoDB Atlas connection string for the `doctorate_platform` database.
- `MEILI_HOST` and `MEILI_MASTER_KEY` — optional; without them, the website can use its MongoDB fallback.
- `TA_SEARCH_KEY` — optional if the national aggregator requires it.

The workflow prevents overlapping production runs. Start with concurrency 2–4; increase only after confirming that the university repositories tolerate the request rate.

## Operational rule

A successful run may still report errors because individual university collections can be offline, rate-limited, or restricted. Review the per-repository summaries, then retry only failed sources. A repository with public metadata but no public PDF is still useful and should remain indexed with its official landing URL.
