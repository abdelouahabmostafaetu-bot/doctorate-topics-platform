# Theses module (math only)

Harvests metadata of Algerian mathematics theses/dissertations from university
DSpace repositories over OAI-PMH, stores it in MongoDB, and serves `/theses`.

**Legal model:** metadata here, PDF stays on the university server. We link, we do not rehost.

## Run a harvest

```bash
npm run harvest              # all enabled repositories
npm run harvest -- --repo=usthb
```

Or from the deployed site:

```
/api/theses/harvest?secret=<BOT_API_SECRET>
/api/theses/harvest?secret=<BOT_API_SECRET>&repo=tlemcen
```

If a repository uses an expired TLS certificate, run once with
`NODE_TLS_REJECT_UNAUTHORIZED=0` (local scripts only, never on the server).

## Verified state (2026-08-03)

| Repo | OAI | Math records |
|---|---|---|
| USTHB | ok | 1216 |
| M'Sila | ok | 1144 |
| Tizi Ouzou | ok | 530 |
| Tlemcen | ok | 428 |
| Ain Temouchent | ok | 88 |
| Annaba | ok (needs User-Agent) | subset of 3013 |
| Ouargla | intermittent | retry |
| Sidi Bel Abbes / Chlef / Setif 1 | OAI index empty | disabled |

Disabled repositories expose sets but zero records: their administrators never
ran `dspace oai import`. Re-enable in `src/lib/theses/repos.ts` once fixed.

## Gotchas already handled

- `OAI-PMH` root element has a dash (breaks naive PowerShell parsing).
- DSpace 6 lives at `/oai/request`, DSpace 7 at `/server/oai/request`.
- Responses must be decoded as UTF-8 explicitly (Setif/Ouargla return mojibake otherwise).
- Arabic "رياضي" also means *sport* - sports collections are rejected.
- Mixed math+CS collections go to a `review` queue instead of being published.
- `resumptionToken` must be URL-encoded.
