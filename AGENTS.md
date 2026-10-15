# Working in this repo (humans and AI agents)

Two AI agents (Codex and Claude) and humans commit here. These rules keep
them from colliding and keep prod healthy. Keep this file short; update it
when a rule changes.

## Branches and merging
- Never commit directly to `main`. Work on a branch: `codex/<topic>`,
  `claude/<topic>`, or `<name>/<topic>`.
- Rebase on `origin/main` before opening a PR; keep PRs small and single-purpose.
- CI (`.github/workflows/ci.yml`: tsc, lint, build) runs on every PR. Merge
  only when it is green. Agents self-merge their own green PRs; no human
  review gate unless a PR touches billing or checkout (`src/pages/checkout.tsx`,
  `src/pages/billing.tsx`, Stripe code), which a human merges.
- Never force-push `main`.

## Deploys
- Every merge to `main` deploys to prod via `.github/workflows/deploy.yml`
  (Cloud Build → Artifact Registry → `cleanapp-prod` VM). There is no staging.
- Deploys queue (concurrency group); a failed build never reaches the VM.
- The workflow commits `.version` back to `main` with `[skip ci]`. Never edit
  `.version` by hand and never rebase that commit away.
- After each prod deploy the workflow smoke-tests the site and pings IndexNow.

## Territory (soft ownership)
- Codex: report, brand, case and dashboard UI (`src/components/report/*`,
  `src/components/brand/*`, `src/components/cases/*`, `src/components/dashboard/*`,
  `src/pages/digital/*`, `src/pages/cases/*`, `src/pages/dashboard.tsx`, hooks and
  API clients they use).
- Claude: marketing and SEO surfaces (`src/pages/{about,faq,pricing,login,signup,
  download,privacy,press,blog}*`, `src/pages/*-reporting.tsx`, `src/pages/solutions/*`,
  `src/content/*`, `src/lib/seo.ts`, `src/components/{Seo,Footer,LandingPage,
  HomeSeoSection,LoginExplainer}.tsx`, `public/*`, `.github/workflows/*`).
- Shared, append-only, smallest possible diff: `src/lib/i18n.ts`, `next.config.js`,
  `package.json`, `src/pages/_app.tsx`, `src/pages/_document.tsx`.
- If you must touch the other agent's territory, keep the change minimal, say so
  in the PR title, and do not refactor.

## Conventions
- English-only copy for now (no new Montenegrin strings).
- New public pages: use `<Seo>` from `src/components/Seo.tsx` for metadata,
  add the route to `SITEMAP_ENTRIES` in `src/pages/sitemap.xml.tsx`, and link it
  from `src/components/Footer.tsx` when it is a marketing page.
- Canonical host is `https://www.cleanapp.io`.
