# Fixes in this package (2026-07-11)

## Root cause: admin new topic failed with `topics_legacyId_key`

- `legacyId` is `Int? @unique` on MongoDB.
- Creating topics without `legacyId` writes `null` → only **one** null allowed.
- Random **positive** IDs collide with imported `examId` values from mylibrary.

**Fix:** always assign a **negative unique** `legacyId` via `allocateManualLegacyId()` for manual/admin/contribution-created topics.

## Contribution accept → database

- New `Contribution` model + admin inbox at `/admin/contributions`.
- **قبول ونشر (LaTeX)** creates a real `Topic` + awards points.
- **قبول الملف** awards custom points (admin chooses).
- **رفض / مكررة** removes from inbox without creating a topic.
- Points use read-then-set (not `increment`) to avoid silent Mongo failures.
- Review buttons use a client form that always sends `decision`.

## Admin new topic

- Page: `/admin/topics/new`
- Form with university/specialty (including add-new), auto duration 90/180, LaTeX problems editor.
- `createTopicAction` always sets unique `legacyId`, required `source`, unique `slug`.

## Other fixes

- Safe admin layout (no pending-count DB query that can crash shell).
- Global `error.tsx` shows digest.
- Header/footer links: ساهم، المساهمون، دليل LaTeX.
- Contributors leaderboard `/contributors`.
- LaTeX guide `/latex-guide`.
- Fixed typo البلاغات in admin nav.

## Deploy steps

```powershell
# 1) Extract this zip over your project (or replace the folder)
# 2) Install & push schema
npm install
npx prisma generate
npx prisma db push

# 3) Commit & deploy
git add .
git commit -m "Fix: legacyId uniqueness, admin create topic, contribution publish"
git push
```

## After deploy — test

1. Login as admin → `/admin/topics/new` → create a topic → should save without P2002.
2. `/contribute` → submit LaTeX contribution.
3. `/admin/contributions` → قبول ونشر → topic appears on site.
4. Optional points: `node scripts/add-points.mjs edumoustapha60@gmail.com 2800`
