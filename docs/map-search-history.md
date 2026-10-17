# Map search: the earlier working approach

This history was recovered on 2026-10-17 after the map again stalled on large
brands. Consult these implementations before proposing another search rewrite.

## What previously worked

- Backend `dae72b24` (2025-12-22): select bounded report IDs first, then hydrate
  only those reports. Do not load the entire matching brand to show a preview.
- Backend `a58af0a8`, `a84633d7`, `ccdfba00` (2026-02-12): bounded search and
  indexed brand reads; independent cached totals rather than the returned list
  length. The original count cache had a ten-minute TTL.
- Backend PR #133, `e963911b` (2026-02-15): persistent incremental
  `brand_report_counts`, `report_counts_total`, and `counters_state`.
  `docs/internal/febrefactor.md` in the backend records its production deployment.
- Frontend `eed70c1` (2025-10-30): use the in-memory renderer for map summaries.
  `80e169f` and `5e914e4` (2026-03-11): match typed brands against the already
  loaded whole-history summaries. This lookup still exists in GlobeView.

The February conversation contains the user's confirmation that search was fast.
It also separately records the subsequent correction to restore real totals.
That praise is not proof that every later count implementation was correct.

## Where the bounded reader was disconnected

Backend PR #145, `1f6543b94e9094a2e9b032ec274f27363b13d200`
(2026-10-14), replaced `GetReportsByBrand` with `serveEvidenceBrand`.
The old bounded reader and count-cache helpers remained in the repository, but
the route no longer used them.

The October evidence reader loads the whole matching analysis cohort, loads its
source metadata, and groups it before applying the requested page. Consequently,
`n=1` bounds the response size, not the database work. The later projected reader
is not proof of a deployed bounded map reader; its public route is explicitly off.

There is a second, independent count regression: frontend `a4686af` changed public
live events into brand summaries with `total: 1`. Brand-key deduplication then
replaced the authoritative summary with that one-report preview.

## Restore the connections, preserve the contracts

Map selection needs a brand summary and a bounded report preview. The renderer's
`/api/v4/brands/summary` already supplies cached whole-history map totals.
The deployed public `/api/v3/public/discovery/brand-preview` supplies up to six
visibility-checked, redacted report previews without loading a full inventory.
Use these existing readers for map selection and keep canonical report links.

Map-index totals count reports. The evidence briefing's source/family totals,
kind filters, overview, and pagination have a different contract. Do not relabel
map totals as filtered briefing totals. Do not restore the old fallback that
presented a partial list length as an exact corpus total. Public live previews
invalidate the cached map snapshot; they do not establish a new brand total.

The full evidence briefing remains reachable through "Open brand page." Its expensive
whole-cohort reader is a separate limitation; bypassing it for map previews does
not establish that its exact grouping/count query has been optimized.

## Runtime evidence recorded on 2026-10-17

These are dated observations, not permanent performance guarantees:

- Public text search for Google and Microsoft: 12 cards each, about 0.8 seconds.
- Renderer summary: 53,450 brands, about 2.0 seconds; Google 61,046 and Microsoft
  53,177 reports. Renderer version 1.0.37, source prefix `872684634502`.
- Microsoft `/api/v3/reports/by-brand?n=1&kind=all&sort=recent`: HTTP 503 after
  about 8.6 seconds. Live listener source prefix `088d80661a19`.

The public discovery summary endpoint is a different, recent-sample reader. Its
142/197 observations must not be mistaken for the renderer's whole-history
Google/Microsoft totals, or for proof that those large corpora disappeared.
