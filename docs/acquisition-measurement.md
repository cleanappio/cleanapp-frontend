# Search acquisition measurement

Three useful outcomes: a received problem report, an organization's evaluation of the product, and company/investor contact interest. Treat each separately.

## First-party operational counts

`AcquisitionCounts` listens to public route changes, existing reporting events, plan links, signup links from organization/pricing pages, and company mailto links. A general account signup link is not classified as organization interest. It sends a fixed enum payload to the same-origin `/api/acquisition`; there are no analytics cookies, persistent browser IDs or third-party receivers. Entry page category and referrer source category remain only in page memory. A full navigation begins a new context; counts are events, not unique visitors or sessions. Browser Do Not Track and Global Privacy Control opt out.

The API independently rejects unknown fields/values, cross-site origins, oversized/non-JSON bodies and excess traffic. It writes only hour, event, current page category, landing category, coarse source category and composer surface. No URLs, query strings, arbitrary campaign strings, report IDs/text/images, user IDs, IPs or precise locations enter these records. Existing infrastructure access logs are separate.

Production `fastFEdeploy.sh` mounts `/var/lib/cleanapp/acquisition-cleanapp_frontend` at `ACQUISITION_EVENTS_DIR`. This survives frontend replacement. Private daily files are bounded to 5 MiB each and 30 days; pruning runs on the first received event each day. No public read endpoint exists. An unavailable/full collector does not block reporting. Embedded frontend storage is separate.

### Production ingress and verification

The canonical site's generic Nginx `/api/` location routes to the legacy customer service on port 9080. The acquisition endpoint requires this exact location in the `www.cleanapp.io` TLS server block in `/etc/nginx/conf.d/cleanapp.conf`, alongside the existing Next.js API locations:

```nginx
location = /api/acquisition {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_http_version 1.1;
    client_max_body_size 1k;
    proxy_read_timeout 10s;
    proxy_send_timeout 10s;
}
```

The `proxy_pass` has no URI suffix, preserving `/api/acquisition`. Back up the config and preserve its ownership and permissions before editing. Validate with `sudo nginx -t`, reload, and verify through the public HTTPS host; restore the backup and reload if verification fails. A successful request directly to localhost verifies the Next.js handler only. The public endpoint can still return the legacy service's 404 when this ingress location is missing.

Check the public read response:

```sh
curl --silent --show-error --dump-header - --output /dev/null \
  https://www.cleanapp.io/api/acquisition
```

Expect **405** and `Cache-Control: no-store`. Then run one fixed payload smoke check:

```sh
curl --silent --show-error --dump-header - --output /dev/null \
  --request POST \
  --header 'Origin: https://www.cleanapp.io' \
  --header 'Content-Type: application/json' \
  --data '{"event":"page_view","page":"home","landing":"home","source":"direct","surface":"page"}' \
  https://www.cleanapp.io/api/acquisition
```

Expect **204** and `Cache-Control: no-store`, then confirm persistence through the private aggregate below. This POST records one real `page_view` event; record it as verification activity and avoid repeated smoke submissions. Do not send report content, personal data or credentials in the check.

Read aggregate CSV without exposing a dashboard:

```sh
ssh deployer@HOST \
  "sudo find /var/lib/cleanapp/acquisition-cleanapp_frontend -maxdepth 1 -type f -name '*.ndjson' -exec cat -- {} +" \
  | python3 scripts/summarize-acquisition.py
```

The quoted filename pattern is matched by privileged `find`. A wildcard in `sudo cat /root-owned-directory/*.ndjson` is expanded by the unprivileged remote shell before `sudo`, so it can fail even when the files exist. Keep the aggregate output private.

`page_view` counts eligible page renders/navigation, not people. `report_submit_accepted` follows a validated API receipt in the browser; it is not proof of publication, recipient delivery or resolution. Client events can be fabricated or dropped; reconcile actual received/published reports with backend receipts for business reporting. `organization_interest` is a click toward plans/signup, not a customer. `company_contact_interest` is a general mailto click from `/company`; `investor_contact_interest` is a click on the explicit investor inquiry link. Neither proves that an inquiry was sent or received.

## Search Console

Use the existing verified `sc-domain:cleanapp.io` property under the CleanApp Google account. Compare landing pages, non-brand queries, countries, devices and accepted reporting activity on consistent time windows. Search Console impressions are CleanApp's observed search exposure, not market-wide keyword search volume. Query tables omit some queries and do not sum to the headline totals. Do not join queries to individual reporters.

Account-level clicks, impressions, query tables and exclusion counts belong in private analysis, not this public repository. Use the dates actually available in the report, not just the selected range, and do not treat observations predating a release as its results.

Submit both sitemaps through the existing property and retain confirmation details privately. Sitemap discovery does not establish that the URLs are indexed or ranking.

Review page-level results after Google has recrawled the release. Change content when evidence identifies a useful intent gap; do not proliferate near-duplicate landing pages or report rankings/AI citations without dated reproducible observations.
