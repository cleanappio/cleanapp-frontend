const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(relativePath, replacements = {}) {
  const filename = path.resolve(__dirname, relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, module: { exports }, URL,
    require: (name) => name in replacements ? replacements[name] : require(name),
  }, { filename });
  return exports;
}

const evidenceHelpers = load('../src/lib/report-evidence.ts');
const helpers = load('../src/lib/brand-report-presentation.ts', { '@/lib/report-evidence': evidenceHelpers });
const evidence = {
  report_kind: 'firsthand', intake_method: 'imported', intake_label: 'Imported public report',
  source_platform: 'bluesky', source_url: 'https://bsky.app/profile/example/post/original',
  source_published_at: '2026-02-06T12:00:00Z', observed_at: null, ingested_at: '2026-10-08T12:00:00Z',
  excerpt: 'Original wording with <script>unsafe</script> & an exact observation. 原文保留。',
  reported_impact: 'Cannot finish the task', classification_reason: 'The author describes their own experience.',
  entity_relationship: 'affected', validation_status: 'not_independently_reproduced',
  upstream_status: 'unknown', resolution_status: 'unknown', why_surfaced: [], evidence_version: 1,
};
const item = {
  discovery_token: 'opaque-token', title: 'Grok application freezes', summary: 'Grok application freezes: Generated explanation.',
  classification: 'digital', severity_level: 0.5, timestamp: '2026-10-08T12:00:00Z', brand_name: 'grok', evidence,
  recurrence: { supporting_report_count: 4, counts_exact: true, source_account_count: null, duplicate_import_count: 0, independence: 'unassessed' },
};
const CompactEvidence = load('../src/components/brand/BrandReportEvidence.tsx', {
  '@/lib/report-evidence': evidenceHelpers,
  '@/lib/brand-report-presentation': helpers,
}).default;
const Dashboard = load('../src/components/brand/PublicBrandDashboard.tsx', {
  '@/components/brand/BrandReportEvidence': CompactEvidence,
  '@/components/report/ReportThumbnail': ({ item }) => item.evidence?.has_original_media ? React.createElement('img', { alt: 'Original report image', src: '/fixture.webp' }) : null,
  '@/lib/brand-report-presentation': helpers,
  '@/lib/i18n': { getCurrentLocale() { return 'en-GB'; } },
  '@/lib/public-discovery-api': { resolvePublicDiscoveryToken() { throw new Error('Rendering must not resolve a token'); } },
  'next/router': { useRouter() { return { query: { brand_name: 'grok' }, push() {} }; } },
}).default;
const render = (report = item, props = {}) => renderToStaticMarkup(React.createElement(CompactEvidence, {
  item: report, locale: 'en-GB', action: React.createElement('button', null, 'Read report'), ...props,
}));

test('compact row foregrounds the exact original and one source link, keeping detail copy collapsed', () => {
  const html = render();
  const closed = html.split('<details')[0];
  assert.match(closed, /Original report wording/);
  assert.match(closed, /line-clamp-3/);
  assert.match(closed, /&lt;script&gt;unsafe&lt;\/script&gt;/);
  assert.match(closed, /原文保留。/);
  assert.match(closed, /From Bluesky/);
  assert.match(closed, /Published.*2026/);
  assert.match(closed, /4 related reports/);
  assert.doesNotMatch(closed, /Personal experience|Impact:|From the original report|Original report unavailable|Generated explanation|Added/);
  assert.match(html, /<details[^>]*><summary/);
  assert.doesNotMatch(html, /<details[^>]* open/);
  assert.match(html, /Original wording/);
  assert.match(html, /Cannot finish the task/);
  assert.match(html, /CleanApp AI summary/);
  assert.match(html, /not been checked for independence/);
});

test('date stays sourced: observed first, published next, Added fallback only for native submissions', () => {
  assert.equal(helpers.brandReportDate({ ...evidence, observed_at: '2026-09-20T12:00:00Z' }).label, 'Observed');
  assert.equal(helpers.brandReportDate({ ...evidence, observed_at: 'invalid date' }).label, 'Published');
  const native = helpers.brandReportDate({ ...evidence, intake_method: 'cleanapp_submission', source_published_at: null });
  assert.equal(native.label, 'Added');
  assert.equal(native.value, '2026-10-08T12:00:00Z');
  assert.equal(helpers.brandReportDate({ ...evidence, source_published_at: null }), null);
  const closed = render({ ...item, evidence: { ...evidence, source_published_at: null } }).split('<details')[0];
  assert.doesNotMatch(closed, /<time|2026-10-08|Added|Published|Observed/);
});

test('native reports retain their submission provenance without repeating source-type labels', () => {
  const closed = render({ ...item, evidence: { ...evidence, intake_method: 'cleanapp_submission', source_platform: 'sensor', source_url: null, source_published_at: null } }).split('<details')[0];
  assert.match(closed, /Submitted to CleanApp/);
  assert.match(closed, /Added/);
  assert.doesNotMatch(closed, /sensor|Personal experience|Imported|From Bluesky/);
});

test('image-only and missing-source rows have no empty evidence boxes or invented wording', () => {
  const image = render({ ...item, evidence: { ...evidence, excerpt: null, has_original_media: true } }).split('<details')[0];
  assert.doesNotMatch(image, /<blockquote|AI summary|available in report details|Original text unavailable|Original source unconfirmed/);
  const unknown = render({ ...item, evidence: undefined, recurrence: undefined, summary: '' });
  assert.doesNotMatch(unknown, /<blockquote|<time|Evidence details|Original report|Unknown|Personal experience/);
});

test('unquoted generated summaries are labeled and title duplication is removed only from generated text', () => {
  const html = render({ ...item, evidence: { ...evidence, excerpt: null, has_original_media: false } });
  const closed = html.split('<details')[0];
  assert.match(closed, /AI summary/);
  assert.match(closed, /Generated explanation\./);
  assert.doesNotMatch(closed, /Grok application freezes:|<blockquote/);
  assert.equal(helpers.compactReportSummary(item.title, item.title), null);
  assert.equal(helpers.compactReportSummary('Original: exact', 'Original'), 'exact');
});

test('related count is visible only when exact and never described as affected people', () => {
  const closed = render({ ...item, recurrence: { ...item.recurrence, counts_exact: false, supporting_report_count: 900 } }).split('<details')[0];
  assert.doesNotMatch(closed, /900|related reports|affected users|people/);
  assert.match(render().split('<details')[0], /4 related reports/);
});

test('source URLs cannot execute scripts and product labels omit the current page brand', () => {
  const html = render({ ...item, evidence: { ...evidence, source_url: 'javascript:alert(1)' } });
  assert.doesNotMatch(html, /href="javascript:/);
  assert.equal(helpers.rowProductLabel(item, 'grok'), null);
  assert.equal(helpers.rowProductLabel({ ...item, brand_name: 'claude' }, 'anthropic'), 'Claude');
  assert.equal(helpers.reportSourceLabel({ ...evidence, source_platform: 'sensor' }), null);
});

test('all-source views retain the plain source type while filtered views avoid repeating it', () => {
  assert.match(render(item, { showSourceKind: true }).split('<details')[0], /Personal experience/);
  assert.match(render({ ...item, evidence: { ...evidence, report_kind: 'coverage' } }, { showSourceKind: true }).split('<details')[0], /News &amp; discussion/);
  assert.match(render({ ...item, evidence: undefined }, { showSourceKind: true }).split('<details')[0], /Other report/);
  assert.doesNotMatch(render(item, { showSourceKind: false }).split('<details')[0], /Personal experience/);
});

test('brand list uses striped rows and clickable title plus compact read action without a heavy card grid', () => {
  const html = renderToStaticMarkup(React.createElement(Dashboard, { items: [item, { ...item, discovery_token: 'second-token' }] }));
  assert.equal((html.match(/<article/g) || []).length, 2);
  assert.match(html, /odd:bg-white even:bg-green-50\/50/);
  assert.match(html, /<h3[^>]*><button[^>]*>Grok application freezes<\/button><\/h3>/);
  assert.equal((html.match(/Read report/g) || []).length, 2);
  assert.doesNotMatch(html, /View report|rounded-xl|<article[^>]*grid-cols|border-green-200/);
});
