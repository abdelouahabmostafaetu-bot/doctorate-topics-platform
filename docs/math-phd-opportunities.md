# Mathematics PhD opportunities — pilot

This draft introduces a bilingual directory at `/opportunities` and a SUPER_ADMIN-only editing interface at `/admin/opportunities`. It uses the existing `DATABASE_URL` database and a separate MongoDB collection, `math_phd_opportunities`. Existing sign-in and bot policies remain in force. The system never writes to `mylibrary`.

## Current functionality

- Add and edit draft or reviewed entries in Arabic and English, including funding, eligibility, required documents, application steps, source and application links.
- Only the super administrator can write. Publication requires an explicit confirmation on each save.
- Unspecified details stay empty and are displayed as unspecified. Only HTTPS source and application URLs are accepted.
- The public page displays at most the 500 most recently updated published records and filters within those records. The admin list shows at most the latest 100 records. Add database-level pagination and search before scaling beyond a pilot.
- Manually verified open records become `needs verification` after seven days, when a deadline is missing, or on or after the deadline date, because closing time cannot be inferred safely from a date alone. Closed status comes from the editor. Deadline dates do not assume a closing time or timezone.
- Entries are deduplicated by source URL on save; this is not atomic under simultaneous submissions. Add and validate a unique index before high-volume or automated imports.

## Not implemented

No source collection, scheduling, automated translation, source rechecking, notifications, or automatic publishing is enabled. A manually reviewed ISTA 2027 entry is bundled as an editorial seed. It is visible by default, links to ISTA and MathJobs, and is editable or unpublishable by the SUPER_ADMIN: saving creates a database override. Its fixed review date makes its status require verification after seven days. The seed is not an automated import. Select and validate authorized feeds and reuse terms, implement source-specific adapters that create or update drafts without overwriting reviewed content, monitor failures, test translations and deduplication, and schedule them with credentials in the hosting environment. Do not advertise the feature as automatically updated until this work is complete.

## Before deployment

Review security and design, test with a staging MongoDB and test accounts, confirm hosting and database configuration, and verify desktop/mobile and accessibility. No production database migration or deployment is performed by this branch. The new collection is created when the first record is saved.
