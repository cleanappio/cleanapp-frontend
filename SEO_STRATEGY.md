# CleanApp SEO & AI-Search Strategy

Goal: rank at the top for "incident reporting", "hazard reporting", "bug reporting" and the surrounding universe of problem-reporting queries, and be the cited answer in AI search (ChatGPT, Perplexity, Google AI Overviews, Claude, Bing Copilot).

## 1. Audit findings (before this branch)

| Area | State before | Impact |
|---|---|---|
| Indexing | No `robots.txt`, no `sitemap.xml`; `site:cleanapp.io` on Bing returns nothing | Crawlers had no map of the site |
| Canonical | `_document.tsx` hard-coded `<link rel="canonical" href="https://cleanapp.io">` on **every** page | Every page told Google "I am a duplicate of the homepage" — the single biggest problem |
| Homepage | Full-screen Mapbox globe, no `<h1>`, no indexable copy, title "CleanApp - Trash is cash" | Nothing to rank for; title has no target keyword |
| Keyword pages | None. No about page, no incident/hazard/bug pages | Zero eligibility for target queries |
| Footer | `Footer` component returned `null` | No internal-link hub |
| Structured data | None | No rich results, weak entity signals for AI engines |
| Metadata | Description/OG duplicated in `_document` + per-page `<Head>`, meta keywords tag about "environmental monitoring" | Mixed signals, no per-page descriptions |
| Private pages | login/signup/dashboard/billing/checkout indexable | Crawl waste, thin pages in the index |
| i18n | `/me/*` duplicates of every page with no hreflang/canonical | Duplicate content |

Competitive landscape (Bing, Oct 2026): "incident reporting app" is dominated by EHS vendors (incidentreport.net, GoAudits, iFactory, 1st Reporting, Notify); "hazard reporting app" by Sitemate, Fulcrum, Quantum; "bug reporting app" by developer tools (Shake, Bugsee, BetterBugs, BugHerd). All of them rank with a dedicated keyword landing page + FAQ + app-store links. None of them serve the *public reporter* angle — that is CleanApp's wedge.

## 2. Keyword universe → page map

| Cluster | Primary query | Supporting queries | Page |
|---|---|---|---|
| Incident | incident reporting app | incident reporting software, incident report app, report an incident, mobile incident reporting, near miss reporting app | `/incident-reporting` |
| Hazard | hazard reporting app | report a hazard, safety hazard reporting, hazard reporting system, workplace hazard reporting app, safety observation app | `/hazard-reporting` |
| Bug | bug reporting app | bug reporting tool, report a bug, website bug report, app bug report, digital issue reporting | `/bug-reporting` |
| Litter / environment | litter reporting app | trash reporting app, report illegal dumping, pollution reporting app, fly tipping app, overflowing bin report | `/litter-reporting` |
| Civic / umbrella | report a problem | report an issue, report graffiti, report a pothole, report broken streetlight, 311 app alternative, citizen reporting app | `/report-a-problem` |
| Buyer: cities | citizen reporting app for cities | 311 app, smart city issue reporting, municipal reporting software | `/solutions/cities` |
| Buyer: brands | brand issue reporting | product defect reporting app, customer complaint app, brand risk monitoring | `/solutions/brands` |
| Buyer: property | property maintenance reporting app | facility issue reporting app, tenant issue reporting app, maintenance request app | `/solutions/property-managers` |
| Buyer: EHS | workplace safety app | EHS incident reporting app, near miss reporting app, employee hazard reporting | `/solutions/workplace-safety` |
| Brand | cleanapp, about cleanapp, cleanapp app | trash is cash, cleanapp review | `/about`, `/faq`, `/` |

All page copy lives in `src/content/landing-pages.ts`. Add a page there and it automatically gets a route (add a one-line file in `src/pages/`), footer links, sitemap entry and FAQ-hub inclusion.

## 3. What this branch ships

- `src/components/Seo.tsx` + `src/lib/seo.ts`: single source of truth for title/description/canonical/hreflang/OG/Twitter/robots/JSON-LD. Defaults rendered from `_app.tsx`; every tag is keyed so pages override cleanly.
- `_document.tsx` stripped to global-only tags (fixes the site-wide canonical bug).
- 9 keyword landing pages + `/about` + `/faq`, all statically prerendered (~700–900 words each, H1/H2 hierarchy, FAQ, breadcrumbs, CTAs, related links).
- Homepage: keyword title, `<h1>` and value-prop copy plus link hub rendered below the globe (hidden in `NEXT_PUBLIC_EMBEDDED_MODE`), Organization + WebSite + SoftwareApplication JSON-LD.
- Real `Footer` with the full internal-link cluster; also appears on report, brand and case pages.
- `public/robots.txt` (allows all major AI crawlers, blocks private routes, points to sitemap), `/sitemap.xml` (server-rendered from the content file), `public/llms.txt` (AI-search summary of the site).
- `noindex` on login/signup/reset-password/dashboard/billing/checkout/opt-out.
- hreflang `en` / `cnr` / `x-default`; `/me/*` canonicalizes to the English URL.
- Nav: About + Report a Problem added to the homepage menu (EN + ME strings).

## 4. What frontend changes cannot do (next steps, in priority order)

1. **Google Search Console + Bing Webmaster Tools**: verify the domain, submit `https://cleanapp.io/sitemap.xml`, request indexing for the 11 new URLs. Also submit to IndexNow (Bing/Yandex instant indexing).
2. **Backlinks / digital PR**: the EHS incumbents have years of links. Fastest wins: app-store listings linking to the keyword pages, directory listings (G2, Capterra, Product Hunt, AlternativeTo under "incident reporting software"), partner and city case-study pages, press on the "trash is cash" angle.
3. **Public report pages as long-tail content**: `/physical/report/[id]` and `/digital/report/[id]` are client-rendered (empty HTML). Server-rendering them (getServerSideProps with title/description from the AI analysis + ImageObject schema) would create thousands of indexable, geo-specific pages ("broken streetlight on X Street") and a city/brand index to list them. This is the biggest untapped SEO asset and needs backend/API work.
4. **Brand pages** (`/digital/[brand_name]`) — same: SSR + ItemList schema → ranks for "[brand] bug reports".
5. **Content cadence**: one comparison/"best of" article per cluster (e.g. "Best incident reporting apps 2026", "CleanApp vs 311") — these are what Bing/Google AI answers quote.
6. **Verify product claims** in `src/content/landing-pages.ts`: API access, exports, private reporting areas, CMMS/311 integration are stated as available. Edit the content file if any are roadmap rather than shipped.
7. Performance: homepage First Load JS is 315 kB (Mapbox + globe). Fine for now; keep the landing pages (151 kB) free of the map bundle.

## 5. How to measure

- Search Console: impressions/clicks per landing URL, average position for the primary query of each cluster.
- Bing Webmaster: index coverage (goal: all sitemap URLs indexed within 2 weeks).
- AI search spot checks monthly: ask ChatGPT/Perplexity/Claude "best incident reporting app", "how do I report a hazard" — goal: cleanapp.io cited.
