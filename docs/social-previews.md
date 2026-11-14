# Page-specific share previews

The visual thesis is a legible editorial card: a clear subject, a clear page purpose and restrained CleanApp identity. The hierarchy is brand, page category, headline, context and destination. These are static thumbnails; motion does not apply.

`Seo` selects a canonical-route image automatically. It excludes the page’s query string, receipt tokens and report text from image URLs. Open Graph and Twitter use the same 1200 × 630 PNG. The renderer version in `socialImageUrl` must change with artwork revisions to distinguish new assets from older image caches. The public `/social-preview` path rewrites inside Next.js to its image handler; it intentionally avoids production’s backend-facing `/api/` gateway. Keep the general robots API block intact.

The server renderer uses local Sharp and the bundled OFL-licensed Inter font. No image service, model call, account or paid API is involved. Fixed art has a bounded memory cache. Dynamic brand and individual-report cards recheck current public identity/visibility on every request and return `no-store`; revoked/private records yield no image. Their public JSON reads have a complete-body deadline and byte cap. Rendering shares the existing bounded image queue.

Page purpose determines the treatment:

- Brand hubs: dark evergreen, the brand name, public-report/evidence context.
- Individual reports: the current public report headline and digital/physical context, preserving the original photo in the report itself.
- Physical reporting: pale green with a geographic contour motif.
- Agent onboarding: pale green, agent-focused copy and a code motif.
- Articles: warm paper, the actual article title and a field-guide treatment.
- Organization pages: the relevant audience and solution.
- Cases: neutral case-evidence art. No authenticated case, contact or escalation content is fetched for social previews.

GIPS is a separate project with its own proposal-focused ivory/cobalt artwork and metadata. Sharing the subject Grok does not make its page equivalent to the CleanApp public report inventory. Avoid co-branded partnership claims.

Check `node --test tests/social-preview.test.cjs` and `python3 scripts/check-social-previews.py --base http://127.0.0.1:3017`. The latter checks rendered HTML, duplicate metadata, crawler access and actual PNG responses. Review full-size and approximately 300 × 158 renderings when changing composition. Existing social posts may retain a platform's page-preview cache; fresh image URLs do not guarantee re-scraping an old post.
