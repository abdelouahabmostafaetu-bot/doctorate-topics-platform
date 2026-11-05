# Mathematics PhD opportunities

This draft introduces a bilingual directory at `/opportunities` and a SUPER_ADMIN-only editing interface at `/admin/opportunities`. It uses the existing `DATABASE_URL` database and a separate MongoDB collection, `math_phd_opportunities`. Existing sign-in and bot policies remain in force. The system never writes to `mylibrary`.

## Current functionality

- Add and edit draft or reviewed entries in Arabic and English, including funding, eligibility, required documents, application steps, source and application links.
- Only the super administrator can write. Publication requires an explicit confirmation on each save.
- Unspecified details stay empty and are displayed as unspecified. Only HTTPS source and application URLs are accepted.
- The public page displays at most the 500 most recently updated published records and filters within those records. The admin list shows at most the latest 100 records. Add database-level pagination and search before scaling beyond a pilot.
- Manually verified open records become `needs verification` after seven days, when a deadline is missing, or on or after the deadline date, because closing time cannot be inferred safely from a date alone. Closed status comes from the editor. Deadline dates do not assume a closing time or timezone.
- Entries are deduplicated by source URL on save; this is not atomic under simultaneous submissions.

## Automatic collection

`src/lib/opportunities/harvest.ts` runs every source adapter of `sources.ts` in parallel and publishes new announcements automatically (`origin` = source id, `auto: true`). Source metadata shown on the public page lives in `source-info.ts`.

| Source | Access | Scope |
| --- | --- | --- |
| MathJobs.org (AMS) | public job list + listing pages (5 s crawl delay) | PhD positions, doctoral/master scholarships |
| European Mathematical Society — Jobs | public list + announcement pages | "PhD position" category / PhD titles |
| EURAXESS | public RSS `/job-feed` (~20 latest) | mathematics + PhD |
| INSPIRE-HEP Jobs | open REST API (`ranks:PHD`, `arxiv_categories:math*`) | mathematical physics PhDs |
| THE Unijobs, Science Careers | Madgex `jobsrss` keyword feeds + schema.org JobPosting | PhD / predoc positions with a mathematics keyword |
| Scholars4Dev | WordPress category feeds (PhD, Masters) | international scholarships, any field / STEM |
| Opportunities For Africans | WordPress scholarships feed | graduate scholarships open to Africans |

Nature Careers was evaluated but its robots.txt disallows the RSS endpoint; FindAPhD, ScholarshipDb, AcademicPositions and jobs.ac.uk block automated access, so they are not used.

- Filters: PhD/scholarship titles only; postdoc, faculty, internships and off-topic fields are excluded; general boards need an explicit mathematics/statistics keyword, scholarship feeds need "any field"/STEM or mathematics.
- Duplicates across sources are dropped by URL (source, application and linked official pages) and by title + organization similarity. Expired, duplicate or irrelevant items are remembered in `math_phd_opportunity_skips` and never fetched again.
- Records still listed get `lastSeenAt/verifiedAt` refreshed. Exhaustive listings (MathJobs, EMS, INSPIRE) close records that disappear; feeds close records unseen for 45–120 days; any record past its deadline is closed.
- Harvested records are inserted with `$setOnInsert` only, so edits made by the SUPER_ADMIN are never overwritten (saving from the admin switches `origin` to `manual`). A unique partial index (`auto_source_unique_v2`) on `sourceUrl` prevents duplicates.
- Optional Arabic translation (`translate.ts`) uses the site's chat AI provider; set `OPPORTUNITIES_TRANSLATE=off` to disable. Without a provider the Arabic page falls back to the English text.
- Each run is logged in `math_phd_opportunity_runs` and shown in `/admin/opportunities`, which also has a "run now" button. To add a source, write an `Adapter` in `sources.ts` and register its metadata in `source-info.ts`.

### Scheduling

`/api/cron/opportunities` runs daily at 04:30 UTC (Vercel cron in `vercel.json`, max 60 s, at most 6 new detail pages per run, 30-minute cooldown). Set `CRON_SECRET` in Vercel — Vercel sends it as `Authorization: Bearer …`; the middleware lets only that request bypass sign-in and the bot filter.

## Before deployment

Review security and design, test with a staging MongoDB and test accounts, confirm hosting and database configuration, and verify desktop/mobile and accessibility. No production database migration or deployment is performed by this branch. The new collection is created when the first record is saved.
