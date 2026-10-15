# Search acquisition measurement

Three useful outcomes: a received problem report, an organization's evaluation of the product, and company/investor contact interest. Treat each separately.

## First-party operational counts

`AcquisitionCounts` listens to public route changes, existing reporting events, organization plan/signup links and company mailto links. It sends a fixed enum payload to the same-origin `/api/acquisition`; there are no analytics cookies, persistent browser IDs or third-party receivers. Entry page category and referrer source category remain only in page memory. A full navigation begins a new context; counts are events, not unique visitors or sessions. Browser Do Not Track and Global Privacy Control opt out.

The API independently rejects unknown fields/values, cross-site origins, oversized/non-JSON bodies and excess traffic. It writes only hour, event, current page category, landing category, coarse source category and composer surface. No URLs, query strings, arbitrary campaign strings, report IDs/text/images, user IDs, IPs or precise locations enter these records. Existing infrastructure access logs are separate.

Production `fastFEdeploy.sh` mounts `/var/lib/cleanapp/acquisition-cleanapp_frontend` at `ACQUISITION_EVENTS_DIR`. This survives frontend replacement. Private daily files are bounded to 5 MiB each and 30 days; pruning runs on the first received event each day. No public read endpoint exists. An unavailable/full collector does not block reporting. Embedded frontend storage is separate.

Read aggregate CSV without exposing a dashboard:

```sh
ssh deployer@HOST 'sudo cat /var/lib/cleanapp/acquisition-cleanapp_frontend/*.ndjson' | python3 scripts/summarize-acquisition.py
```

`page_view` counts eligible page renders/navigation, not people. `report_submit_accepted` follows a validated API receipt in the browser; it is not proof of publication, recipient delivery or resolution. Client events can be fabricated or dropped; reconcile actual received/published reports with backend receipts for business reporting. `organization_interest` is a click toward plans/signup, not a customer. `company_contact_interest` is a general mailto click from `/company`; `investor_contact_interest` is a click on the explicit investor inquiry link. Neither proves that an inquiry was sent or received.

## Search Console

Use the existing verified `sc-domain:cleanapp.io` property under the CleanApp Google account. Compare landing pages, non-brand queries, countries, devices and accepted reporting activity on consistent time windows. Search Console impressions are CleanApp's observed search exposure, not market-wide keyword search volume. Query tables omit some queries and do not sum to the headline totals. Do not join queries to individual reporters.

The account audit on 2026-10-16 established an actual first-party baseline. Account-level clicks, impressions, query tables and exclusion counts belong in private analysis, not this public repository. Use the dates actually available in the report, not just the selected range, and do not treat observations predating a release as its results.

Both sitemaps were submitted through the existing property on October 16. Google then reported Success with 25 discovered main URLs and 500 brand URLs. Sitemap discovery does not establish that these URLs are indexed or ranking.

Review page-level results after Google has recrawled the release. Change content when evidence identifies a useful intent gap; do not proliferate near-duplicate landing pages or report rankings/AI citations without dated reproducible observations.
