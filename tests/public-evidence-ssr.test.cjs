const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Compile the real page/component tree; replace only browser or unrelated panels.
function modules(replacements = {}) {
  const cache = new Map();
  const load = (relative) => {
    const filename = path.resolve(__dirname, relative);
    if (cache.has(filename)) return cache.get(filename);
    const exports = {};
    cache.set(filename, exports);
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const localRequire = (name) => {
      if (name in replacements) return replacements[name];
      if (name.startsWith('@/')) {
        const base = path.resolve(__dirname, '../src', name.slice(2));
        const candidate = [base + '.ts', base + '.tsx'].find(fs.existsSync);
        if (!candidate) throw new Error('Missing test module: ' + name);
        return load(candidate);
      }
      return require(name);
    };
    vm.runInNewContext(compiled, { exports, module: { exports }, require: localRequire, URL, process, setTimeout, clearTimeout, AbortController }, { filename });
    return exports;
  };
  return load;
}

const PUBLIC_ID = 'rpt_1234567890123456789012';
const href = '/digital/report/' + PUBLIC_ID;
const quote = 'The app loses my draft.\nThe original line break matters.';
const evidence = {
  report_kind: 'firsthand', intake_method: 'imported', intake_channel: null, intake_label: 'Imported public report',
  source_platform: 'bluesky', source_url: 'https://bsky.app/profile/example/post/public',
  source_published_at: '2026-10-15T12:00:00Z', excerpt: quote,
  observed_at: null, ingested_at: null, reported_impact: null, classification_reason: null,
  entity_relationship: 'unknown', validation_status: 'not_independently_reproduced', upstream_status: 'unknown',
  resolution_status: 'unknown', why_surfaced: [], evidence_version: 1,
};
const card = {
  canonical_path: href, discovery_token: '', title: 'Draft disappears when I switch tabs', summary: 'A saved draft is lost after switching tabs.',
  classification: 'digital', brand_name: 'openai', brand_display_name: 'OpenAI', severity_level: 0, timestamp: '', evidence,
  notification_count: { state: 'unavailable' },
};
const preview = { items: [card], count: 1, kind: 'firsthand', sort: 'recent', offset: 0, has_more: false, counts_exact: false };
const Link = ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children);
const noop = () => null;
const router = { query: { brand_name: 'openai', public_id: PUBLIC_ID }, isReady: true, asPath: href, push() {}, replace() {} };
const common = {
  'next/link': { __esModule: true, default: Link },
  'next/router': { useRouter: () => router },
  '@/components/Footer': { __esModule: true, default: noop },
  '@/components/PageHeader': { __esModule: true, default: noop },
  '@/lib/i18n': { getCurrentLocale: () => 'en', useTranslations: () => ({ t: (key) => key }) },
};

test('public report server HTML contains the exact original, labeled analysis and public source without private payload', () => {
  const load = modules({
    ...common,
    '@/components/ImageDisplay': { __esModule: true, default: noop },
    '@/components/report/ReportNotifications': { __esModule: true, default: noop },
    '@/components/report/ReportContactStrategyPanel': { __esModule: true, default: noop },
    '@/lib/util': { getBrandNameDisplay: (analysis) => ({ brandDisplayName: analysis.brand_display_name || analysis.brand_name }) },
  });
  const { projectPublicReport } = load('../src/lib/public-report-projection.ts');
  const report = projectPublicReport({
    report: { public_id: PUBLIC_ID, seq: 100, user_id: 'PRIVATE_ACTOR', latitude: 47, longitude: 8, image: 'PRIVATE_BYTES' },
    analysis: [{ title: card.title, summary: card.summary, classification: 'digital', language: 'en', brand_name: 'open ai', brand_display_name: 'OpenAI', analysis_text: 'PRIVATE_REASONING' }],
    evidence, contact_strategy: { email: 'PRIVATE_EMAIL' },
  }, PUBLIC_ID);
  assert.ok(report);
  const Page = load('../src/components/report/PublicReportDetailPage.tsx').default;
  const html = renderToStaticMarkup(React.createElement(Page, { expectedClassification: 'digital', initialReport: report }));
  assert.match(html, /<h1[^>]*>Draft disappears when I switch tabs<\/h1>/);
  assert.ok(html.includes(quote));
  assert.match(html, /CleanApp AI summary/);
  assert.match(html, /href="https:\/\/bsky\.app\/profile\/example\/post\/public"/);
  assert.match(html, /href="\/digital\/open%20ai"/);
  assert.doesNotMatch(html, /PRIVATE_|Loading|loading\.\.\.|latitude|longitude/);
});

test('real brand page server HTML starts with firsthand evidence and crawlable canonical report anchors', () => {
  let briefingCalls = 0;
  const load = modules({
    ...common,
    '@/components/Seo': { __esModule: true, default: noop },
    '@/lib/brand-seo': {},
    '@/lib/auth-store': { useAuthStore: (selector) => selector({ isAuthenticated: false, subscription: null }) },
    '@/hooks/useReportsByBrand': { useReportsByBrand: () => ({}) },
    '@/components/brand/SubscribedBrandDashboard': { __esModule: true, default: noop },
    '@/components/brand/CleanIntelligencePanel': { __esModule: true, default: noop },
    '@/components/report/PublicReportDetailPage': { EmbeddedReportBackBar: noop },
    '@/components/report/ReportThumbnail': { __esModule: true, default: noop },
    '@/lib/public-discovery-api': { fetchPublicBrandReports() { briefingCalls++; throw new Error('SSR must use its bounded preview'); } },
  });
  const Page = load('../src/pages/digital/[brand_name]/index.tsx').default;
  const html = renderToStaticMarkup(React.createElement(Page, {
    seo: { found: true, title: 'OpenAI reports', description: 'Public reports', path: '/digital/openai' }, initialPreview: preview,
  }));
  assert.match(html, /<h1[^>]*>OpenAI<\/h1>/);
  assert.match(html, /Recent firsthand reports/);
  assert.ok(html.includes(quote));
  assert.equal((html.match(new RegExp('href="' + href + '"', 'g')) || []).length, 2);
  assert.match(html, /aria-pressed="true"[^>]*>Personal experiences/);
  assert.match(html, /1 results loaded/);
  assert.doesNotMatch(html, /Loading reports|in CleanApp<|related reports|affected users/);
  assert.equal(briefingCalls, 0);
});

// Deterministic hook harness runs mount effects and state updates as hydration does.
function hookHarness(fetchPublicBrandReports) {
  const states = [], dependencies = [];
  let cursor = 0, pending = [], dirty = false;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], (value) => {
        const next = typeof value === 'function' ? value(states[index]) : value;
        if (next !== states[index]) { states[index] = next; dirty = true; }
      }];
    },
    useEffect(callback, deps) {
      const index = cursor++;
      if (!dependencies[index] || deps.some((value, i) => value !== dependencies[index][i])) {
        dependencies[index] = deps;
        pending.push(callback);
      }
    },
  };
  const hook = modules({ react, '@/lib/public-discovery-api': { fetchPublicBrandReports } })('../src/hooks/usePublicReportsByBrand.ts').usePublicReportsByBrand;
  return {
    render(...args) {
      let result;
      do {
        dirty = false; cursor = 0;
        result = hook(...args);
        const effects = pending; pending = [];
        for (const effect of effects) effect();
      } while (dirty);
      return result;
    },
  };
}

test('hydration starts one full query while retaining SSR preview; changed views hide it', () => {
  let calls = 0;
  const harness = hookHarness(() => { calls++; return new Promise(() => {}); });
  const pageQuery = { kind: 'firsthand', sort: 'recent', product: '', offset: 0 };
  const state = harness.render('openai', 'en', true, pageQuery, preview);
  assert.equal(state.isLoading, false);
  assert.equal(state.isPreview, true);
  assert.equal(state.items.length, 1);
  assert.equal(state.batch, preview);
  assert.equal(state.hasCompletedRequest, false);
  assert.equal(state.isRefreshing, true);
  assert.equal(calls, 1);
  harness.render('openai', 'en', true, pageQuery, preview);
  assert.equal(calls, 1, 'ordinary rerenders must not restart hydration');
  const coverage = harness.render('openai', 'en', true, { ...pageQuery, kind: 'coverage' }, preview);
  assert.equal(calls, 2);
  assert.equal(coverage.items.length, 0);
  assert.equal(coverage.batch, null);
  assert.equal(coverage.isLoading, true);
  const nativeEmpty = harness.render('openai', 'en', true, pageQuery, preview);
  assert.equal(nativeEmpty.isPreview, true);
  assert.equal(nativeEmpty.isLoading, false);
  assert.equal(calls, 3);
  nativeEmpty.refresh();
  harness.render('openai', 'en', true, pageQuery, preview);
  assert.equal(calls, 4);
});

test('brand page keeps cached category counts, overview and display name while sorting fails', () => {
  const metadata = {
    counts_exact: true, kind_counts: { firsthand: 2, coverage: 3, unknown: 0, all: 5 },
    scope: { brand_name: 'microsoft', product: null, products: ['microsoft'], includes_products: false },
    overview: { total_reports: 8, reports_last_30_days: 4, reports_last_7_days: 1 },
    snapshot_at: '2026-10-16T10:00:00Z',
  };
  let view = { items: [], batch: null, metadata, metadataRetained: true, metadataReceivedAt: '2026-10-17T11:00:00Z',
    brandDisplayName: 'Microsoft', totalCount: 0, isLoading: true, isRefreshing: false, error: null,
    hasScopedCounts: false, isPreview: false, hasCompletedRequest: true, refresh() {},
  };
  const load = modules({
    ...common,
    'next/router': { useRouter: () => ({ ...router, query: { brand_name: 'microsoft' } }) },
    '@/components/Seo': { __esModule: true, default: noop }, '@/lib/brand-seo': {},
    '@/lib/auth-store': { useAuthStore: selector => selector({ isAuthenticated: false }) },
    '@/hooks/usePublicReportsByBrand': { usePublicReportsByBrand: () => view },
    '@/hooks/useReportsByBrand': { useReportsByBrand: () => ({}) },
    '@/components/brand/SubscribedBrandDashboard': { __esModule: true, default: noop },
    '@/components/brand/CleanIntelligencePanel': { __esModule: true, default: noop },
    '@/components/report/PublicReportDetailPage': { EmbeddedReportBackBar: noop },
    '@/components/brand/PublicBrandDashboard': { __esModule: true, default: () => React.createElement('p', {}, 'Saved Microsoft report') },
  });
  const Page = load('../src/pages/digital/[brand_name]/index.tsx').default;
  const render = () => renderToStaticMarkup(React.createElement(Page, {
    seo: { found: true, title: 'Microsoft reports', path: '/digital/microsoft' }, initialPreview: null,
  }));
  for (const error of [null, 'Request failed: 503']) {
    view = { ...view, isLoading: !error, error };
    const html = render();
    assert.match(html, /<h1[^>]*>Microsoft<\/h1>/);
    for (const count of [2, 3, 0, 5]) assert.match(html, new RegExp(`\\(${count}\\)`));
    assert.match(html, />8<\/strong>/, 'overview retains raw report total instead of the grouped all count');
    assert.match(html, /Counts from the last successful update/);
    assert.doesNotMatch(html, /Saved Microsoft report/);
  }
  view = { ...view, batch: { items: [card] }, items: [card], isLoading: false, isRefreshing: true, error: null };
  assert.match(render(), /Updating reports and counts.*Saved Microsoft report/);
  view = { ...view, isRefreshing: false, error: 'Request failed: 503' };
  const recovered = render();
  assert.match(recovered, /Showing the last loaded view/);
  assert.match(recovered, /Saved Microsoft report/);
  assert.match(recovered, /Retry/);
});

test('failed and empty later pages retain Previous without an invented next page or inverted range', () => {
  const offsets = [];
  const metadata = { counts_exact: true, kind_counts: { firsthand: 14, coverage: 0, unknown: 0, all: 14 } };
  let view = { items: [], batch: null, metadata, metadataRetained: true, products: ['openai'],
    brandDisplayName: 'OpenAI', totalCount: 0, isLoading: false, isRefreshing: false, error: 'Request failed: 503',
    hasScopedCounts: false, isPreview: false, hasCompletedRequest: true, refresh() {},
  };
  const load = modules({
    ...common,
    react: { ...React, useEffect() {}, useState(initial) {
      return initial === 0 ? [12, next => offsets.push(next)] : [initial, () => {}];
    } },
    '@/components/Seo': { __esModule: true, default: noop }, '@/lib/brand-seo': {},
    '@/lib/auth-store': { useAuthStore: selector => selector({ isAuthenticated: false }) },
    '@/hooks/usePublicReportsByBrand': { usePublicReportsByBrand: () => view },
    '@/hooks/useReportsByBrand': { useReportsByBrand: () => ({}) },
    '@/components/brand/SubscribedBrandDashboard': { __esModule: true, default: noop },
    '@/components/brand/CleanIntelligencePanel': { __esModule: true, default: noop },
    '@/components/report/PublicReportDetailPage': { EmbeddedReportBackBar: noop },
  });
  const Page = load('../src/pages/digital/[brand_name]/index.tsx').default;
  const props = { seo: { found: true, title: 'OpenAI reports', path: '/digital/openai' }, initialPreview: null };
  const find = (node, predicate) => {
    if (!node || typeof node !== 'object') return null;
    if (predicate(node)) return node;
    return React.Children.toArray(node.props?.children).map(child => find(child, predicate)).find(Boolean);
  };
  for (const emptyBatch of [null, { items: [], has_more: false }]) {
    view = { ...view, batch: emptyBatch, error: emptyBatch ? null : 'Request failed: 503' };
    const tree = Page(props);
    const nav = find(tree, node => node.type === 'nav' && node.props['aria-label'] === 'Report pages');
    assert.ok(nav, 'a failed later page must retain a route back');
    const previous = find(nav, node => node.type === 'button' && node.props.children === 'Previous');
    const next = find(nav, node => node.type === 'button' && node.props.children === 'Next');
    assert.equal(previous.props.disabled, false);
    assert.equal(next.props.disabled, true);
    previous.props.onClick();
    assert.equal(offsets.at(-1), 0);
    const html = renderToStaticMarkup(tree);
    assert.match(html, /Page 2/);
    assert.doesNotMatch(html, /Results 13[–-]12/);
    assert.match(html, /\(14\)/, 'scoped totals stay separate from the missing page');
  }
  const filters = find(Page(props), node => typeof node.type === 'function' && node.type.name === 'EvidenceFilters');
  filters.props.onKind('coverage');
  filters.props.onSort('recurrence');
  filters.props.onProduct('openai');
  assert.deepEqual(offsets.slice(-3), [0, 0, 0], 'every source, sort and product change starts at page one');
});

test('canonical evidence links allow new tabs and modified clicks in embedded report dialogs', () => {
  let opened = 0;
  const load = modules({
    ...common,
    react: { ...React, useState: (initial) => [initial, () => {}], useEffect() {}, useRef: (current) => ({ current }) },
    '@/components/brand/BrandReportEvidence': { __esModule: true, default: noop },
    '@/components/report/ReportThumbnail': { __esModule: true, default: noop },
    '@/components/brand/ReportNotificationCount': { __esModule: true, default: noop },
    '@/lib/public-discovery-api': {},
  });
  const Dashboard = load('../src/components/brand/PublicBrandDashboard.tsx').default;
  const tree = Dashboard({ items: [card], onOpenReport() { opened++; } });
  const visit = (node) => {
    if (!node || typeof node !== 'object') return null;
    if (node.type === Link) return node;
    return React.Children.toArray(node.props?.children).map(visit).find(Boolean);
  };
  const link = visit(tree);
  assert.equal(link.props.href, href);
  for (const extra of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { defaultPrevented: true }]) {
    let prevented = false;
    link.props.onClick({ button: 0, preventDefault() { prevented = true; }, ...extra });
    assert.equal(prevented, false);
  }
  assert.equal(opened, 0);
  let prevented = false;
  link.props.onClick({ button: 0, preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(opened, 1);
});
