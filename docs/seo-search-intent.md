# Search intent and public content

## Design thesis

Visual thesis: keep CleanApp's white, green and map-led identity; use generous editorial spacing around a simple text-and-optional-image composer to make reporting unmistakable.

Content plan: begin with the problem someone has noticed and the uncertainty about whom to tell; offer a direct reporting action; explain what makes a useful report and what a submission does; give organizations and company researchers separate, substantive paths.

Interaction thesis: preserve the existing map interaction; use clear hover/focus treatments on action links and native disclosure for questions; make content immediately readable without entrance effects or JavaScript. Motion belongs to the reporting experience, not to instructional copy.

## Editorial decisions

- Keep existing category and audience routes so links continue to work.
- Add a small set of problem guides with different reporting needs, rather than city/brand permutations or interchangeable keyword pages.
- Give every reporter-facing page a direct `/report-a-problem` action. Problem-specific links can include `?kind=physical` or `?kind=digital` as context; the same composer accepts natural-language text with an optional image.
- Explain the path from observation to AI structure, related reports and routing. Keep the receipt-versus-delivery distinction concise in the FAQ.
- Do not promise cash rewards, integrations, private reporting, exact GPS, universal coverage or automatic resolution without product evidence.
- Public copy and structured data must agree. FAQs answer actual questions visible on the page.
- Use the live pricing page for commercial terms and the public repository for inspectable implementation; do not invent customer counts, volumes, funding or traction.
- Do not manufacture sitemap modification dates at request time. Omit `lastmod` until trustworthy per-page dates are maintained.

## Demand and measurement

Keyword choices below are intent hypotheses, not search-volume estimates. Validate by country/language using Google Search Console, keyword-planning data and actual reporting conversions. Track accepted submissions and organization inquiries alongside impressions and clicks. Do not equate a search rank or AI citation with a report delivered or a problem fixed.

## Initial content map

| Intent | Route | Useful difference |
| --- | --- | --- |
| I noticed something and do not know whom to tell | `/report-a-problem` | Direct browser reporting |
| Report a pothole | `/report-a-pothole` | Road location, direction, scale and existing reports |
| Report illegal dumping | `/report-illegal-dumping` | Location, waste description and identifying details |
| Website or app is broken | `/report-a-website-problem` | Affected URL, expected/actual result and reproduction context |
| Report an accessibility barrier | `/report-an-accessibility-barrier` | Physical/digital barriers and task-specific impact |
| Evaluate CleanApp for an organization | `/solutions/*` | Distinct needs for cities, brands, property and safety teams |
| Research CleanApp as a company | `/company` | Product, business model, primary sources and contact |

## Release checks

Verify each page has a unique title, canonical URL, visible useful answer, working report action, and schema matching visible text. Check mobile layout, keyboard focus, direct route loads and sitemap coverage. The browser reporting flow must be verified separately against the real API and actual receipt states.

## Primary evidence and research boundaries

Existing official reporting flows use concrete problem language: [GOV.UK pothole reporting](https://www.gov.uk/report-pothole), [GOV.UK fly-tipping reporting](https://www.gov.uk/report-flytipping), and [NYC311 pothole reporting](https://portal.311.nyc.gov/article/?kanumber=KA-01093). These establish useful reporting vocabulary, not search volume or a partnership with CleanApp.

[Chrome's issue-reporting instructions](https://support.google.com/chrome/answer/95315?hl=en) and [Jira's bug-report template](https://www.atlassian.com/software/jira/templates/bug-report) illustrate the value of context and the distinct expectations of consumer reporting versus internal issue tracking. Do not claim that a screenshot alone supplies reproduction steps.

The [CleanApp frontend repository](https://github.com/cleanappio/cleanapp-frontend) is a public implementation source. The pricing page is the current public source for organization plans. Company content contains no customer, revenue, funding, market-size or search-volume estimates.

`llms.txt` is a small navigation aid, not a ranking mechanism. Structured data describes visible content; it is not a promise of rich results or AI citations.

## Concurrent editorial content review

The three existing `/blog/best-*` slugs are retained, with titles and copy reframed as selection guides. They do not claim a comparative product survey, a market ranking or measured reporting reach. Specific competitor capability lists were removed; the guides instead offer concrete evaluation criteria and link to primary HSE, GOV.UK, Chrome and Jira sources checked on 15 October 2026. Source links are available in the article template. CleanApp examples match text-or-image browser reporting and the observation → AI structure → related reports → routing flow.

The press kit uses the same product description, links to current pricing instead of duplicating figures, and omits the legacy reward/fix promotional image from its downloads. Blog and press routes remain linked for discovery; article calls to action offer browser reporting directly.

## Public report and brand discovery

Report metadata comes from the public API with a four-second deadline covering headers and JSON. The requested ID must match, with usable analysis and a physical/digital classification. Incorrect report-kind URLs redirect to the actual kind; missing reports return 404. Unavailable, malformed or explicitly private results receive generic, nonindexable metadata. Public metadata responses use `no-store`; subscriber data is never requested or serialized for SEO.

Brand metadata checks the same public digital-brand summary endpoint used by the brand sitemap. A matching brand name with a positive integer report count establishes public presence; display names supply the title, while counts and discovery tokens are not serialized for SEO. This avoids invoking the full evidence briefing and exact grouping queries for crawler metadata. Lookups retain the four-second whole-response deadline, omit credentials and use `no-store`; unknown, zero-count, malformed or unavailable summaries remain nonindexable. The brand sitemap validates and deduplicates public summary rows and omits synthetic modification dates. On an upstream outage it briefly serves the last successful XML, or responds 503 with `Retry-After` if none exists; it never caches a failed lookup as a successful empty sitemap.

The legacy detail API currently serializes an unhydrated `is_valid` boolean. Do not interpret its default false as a moderation decision. The frontend checks public endpoint identity, explicit visibility and classification; backend public-access enforcement remains authoritative.
