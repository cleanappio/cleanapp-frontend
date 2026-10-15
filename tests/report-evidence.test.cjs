const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const file = require('node:path').resolve(__dirname, '../src/lib/report-evidence.ts');
const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const target = new Module(file);
target._compile(compiled, file);
const { safeOriginalSourceUrl, evidenceDate, contentKind, matchesContentKind, brandLabel, cleanAppSubmissionLabel } = target.exports;

test('source links reject executable protocols, credentials and relative URLs', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,hello', '/reports/1', 'https://user:secret@example.org/']) assert.equal(safeOriginalSourceUrl(url), null);
  assert.equal(safeOriginalSourceUrl('https://github.com/openai/openai-node/issues/1'), 'https://github.com/openai/openai-node/issues/1');
});

test('missing legacy metadata never enters firsthand and remains explicitly unknown', () => {
  assert.equal(contentKind(undefined), 'unknown');
  assert.equal(contentKind('unsupported'), 'unknown');
  assert.equal(matchesContentKind(undefined, 'firsthand'), false);
  assert.equal(matchesContentKind('unknown', 'firsthand'), false);
  assert.equal(matchesContentKind(undefined, 'unknown'), true);
  assert.equal(matchesContentKind('coverage', 'all'), true);
});

test('dates distinguish absence or malformed input from publication', () => {
  assert.equal(evidenceDate(undefined), 'Unknown');
  assert.equal(evidenceDate('not a date'), 'Unknown');
  assert.match(evidenceDate('2025-07-20T12:00:00Z', 'en-GB'), /2025/);
});

test('known brand names take canonical casing without rewriting arbitrary names', () => {
  assert.equal(brandLabel('anthropic', 'anthropic'), 'Anthropic');
  assert.equal(brandLabel('openai', 'openai'), 'OpenAI');
  assert.equal(brandLabel('claude-code'), 'Claude Code');
  assert.equal(brandLabel('custom-product', 'Custom Product'), 'Custom Product');
});

function loadComponent(relativePath) {
  const componentFile = require('node:path').resolve(__dirname, relativePath);
  const js = ts.transpileModule(fs.readFileSync(componentFile, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const componentModule = new Module(componentFile, module);
  componentModule.paths = module.paths;
  componentModule.require = (name) => name === '@/lib/report-evidence' ? target.exports : require(name);
  componentModule._compile(js, componentFile);
  return componentModule.exports.default;
}
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ReportEvidence = loadComponent('../src/components/evidence/ReportEvidence.tsx');
const BrandOverview = loadComponent('../src/components/brand/BrandOverview.tsx');
const EvidenceFilters = loadComponent('../src/components/evidence/EvidenceFilters.tsx');
const evidence = {
  report_kind: 'firsthand', intake_method: 'imported', intake_label: 'Imported GitHub report',
  source_platform: 'GitHub', source_url: 'https://github.com/openai/openai-node/issues/1477',
  source_published_at: '2025-07-20T12:00:00Z', observed_at: null, ingested_at: '2026-10-14T12:00:00Z',
  excerpt: '<script>unsafe</script> Original report wording.', reported_impact: 'Workflow blocked',
  classification_reason: 'Original source describes the author’s experience', entity_relationship: 'dependency',
  validation_status: 'not_independently_reproduced', upstream_status: 'unknown', resolution_status: 'unknown',
  why_surfaced: ['Reproduction steps supplied'], evidence_version: 1,
};

test('render keeps original text distinct from AI summary and escapes source text', () => {
  const html = renderToStaticMarkup(React.createElement(ReportEvidence, { evidence, summary: 'Generated summary' }));
  assert.match(html, /From the original report/);
  assert.match(html, /CleanApp AI summary/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /Connected service/);
  assert.match(html, /Not independently reproduced/);
  assert.match(html, /Observed<\/dt><dd>Unknown/);
  assert.match(html, /2025/);
  assert.match(html, /2026/);
});

test('render never invents direct submission, firsthand, validation or original links for legacy reports', () => {
  const html = renderToStaticMarkup(React.createElement(ReportEvidence, {}));
  assert.match(html, /Other report/);
  assert.match(html, /How received<\/dt><dd>Unknown/);
  assert.match(html, /Independent validation unknown/);
  assert.match(html, /Source count unknown/);
  assert.doesNotMatch(html, /Personal experience|via CleanApp|href=/);
  assert.doesNotMatch(html.split('<details')[0], /How received|Source date unknown/);
});

test('dedup recurrence is labeled source reports and keeps independence unassessed', () => {
  const recurrence = { supporting_report_count: 4, source_account_count: 2, duplicate_import_count: 3, independence: 'unassessed', counts_exact: true, related_observation_count: 5 };
  const html = renderToStaticMarkup(React.createElement(ReportEvidence, { evidence, recurrence }));
  assert.match(html, /4 related source reports/);
  assert.match(html, /Sources not checked for independence/);
  assert.match(html, /3 duplicate imports excluded/);
  assert.match(html, /5 related reports/);
  assert.doesNotMatch(html, /4 affected users|4 users/);
});

test('image-only originals remain visible as established source evidence', () => {
  const html = renderToStaticMarkup(React.createElement(ReportEvidence, {
    evidence: { ...evidence, excerpt: null, source_url: null, has_original_media: true },
  }));
  assert.match(html, /Original image available in report details/);
  assert.doesNotMatch(html, /Original source unconfirmed/);
  assert.doesNotMatch(html, /From the original report/);
});

test('summary gives raw report totals and additions without presenting grouped results as totals', () => {
  const batch = {
    kind_counts: { firsthand: 110, coverage: 2050, unknown: 4903, all: 7063 },
    overview: { total_reports: 7196, reports_last_30_days: 325, reports_last_7_days: 42, reports_previous_7_days: 80 },
  };
  const html = renderToStaticMarkup(React.createElement(BrandOverview, { batch, locale: 'en', brandName: 'anthropic' }));
  assert.match(html, /7,196/);
  assert.match(html, /reports about Anthropic in CleanApp/);
  assert.match(html, /325<\/span> added in the past 30 days/);
  assert.match(html, /42<\/span> in the past 7 days/);
  assert.doesNotMatch(html, /7,063|110|new issues|affected users/);
});

test('missing overview never invents a total and zero is valid', () => {
  assert.equal(renderToStaticMarkup(React.createElement(BrandOverview, { batch: { kind_counts: { all: 7063 } } })), '');
  const html = renderToStaticMarkup(React.createElement(BrandOverview, {
    batch: { overview: { total_reports: 0, reports_last_30_days: 0, reports_last_7_days: 0 } },
  }));
  assert.match(html, />0<\/strong>/);
});

test('compact report keeps validation and missing observation dates in collapsed details', () => {
  const html = renderToStaticMarkup(React.createElement(ReportEvidence, { evidence }));
  const beforeDetails = html.split('<details')[0];
  assert.match(beforeDetails, /Imported from GitHub/);
  assert.match(beforeDetails, /Published/);
  assert.doesNotMatch(beforeDetails, /Not independently reproduced|Observed|Why surfaced/);
  assert.match(html, /<details[^>]*><summary/);
  assert.doesNotMatch(html, /<details[^>]* open/);
  assert.match(html, /Not independently reproduced/);
});

test('compact date follows recent ranking: observed first, then published; imported date is never source date', () => {
  const observed = renderToStaticMarkup(React.createElement(ReportEvidence, {
    evidence: { ...evidence, observed_at: '2026-10-15T12:00:00Z' },
  })).split('<details')[0];
  assert.match(observed, /Observed.*2026/);
  assert.doesNotMatch(observed, /Published/);
  const missing = renderToStaticMarkup(React.createElement(ReportEvidence, {
    evidence: { ...evidence, source_published_at: null },
  })).split('<details')[0];
  assert.doesNotMatch(missing, /Published|Observed|Source date unknown/);
  assert.doesNotMatch(missing, /2026/);
});

test('plain source filters avoid jargon and retain exact per-view counts', () => {
  const html = renderToStaticMarkup(React.createElement(EvidenceFilters, {
    kind: 'firsthand', sort: 'recent', product: '',
    batch: { counts_exact: true, kind_counts: { firsthand: 110, coverage: 2050, unknown: 4903, all: 7063 } },
    onKind() {}, onSort() {}, onProduct() {},
  }));
  for (const label of ['Personal experiences', 'News &amp; discussion', 'Other reports', 'All reports', 'Recent', 'Relevance']) assert.match(html, new RegExp(label));
  assert.doesNotMatch(html, /Firsthand|Coverage|Unclassified/);
  for (const count of ['110', '2,050', '4,903', '7,063']) assert.match(html, new RegExp(count));
  assert.match(html, /Reports from people describing their own experience/);
});

test('personal experiences retain direct versus imported provenance', () => {
  const imported = renderToStaticMarkup(React.createElement(ReportEvidence, { evidence })).split('<details')[0];
  assert.match(imported, /Personal experience/);
  assert.match(imported, /Imported from GitHub/);
  assert.doesNotMatch(imported, /via CleanApp/);
  const direct = renderToStaticMarkup(React.createElement(ReportEvidence, {
    evidence: { ...evidence, intake_method: 'cleanapp_submission' },
  })).split('<details')[0];
  assert.match(direct, /via CleanApp/);
  assert.doesNotMatch(direct, /via CleanApp mobile/);
  assert.doesNotMatch(direct, /Imported from/);
});

test('overview names the authoritative brand or selected product while retaining all-source raw totals', () => {
  const overview = { total_reports: 301, reports_last_30_days: 44, reports_last_7_days: 6 };
  const brand = renderToStaticMarkup(React.createElement(BrandOverview, {
    batch: { overview, scope: { brand_name: 'grok', product: null }, kind_counts: { firsthand: 13 } },
    brandName: 'anthropic',
  }));
  assert.match(brand, /301<\/strong>/);
  assert.match(brand, /reports about Grok in CleanApp/);
  assert.doesNotMatch(brand, /Anthropic|13<\/strong>/);
  const product = renderToStaticMarkup(React.createElement(BrandOverview, {
    batch: { overview: { ...overview, total_reports: 1 }, scope: { brand_name: 'anthropic', product: 'claude-code' } },
    brandName: 'anthropic',
  }));
  assert.match(product, /report about Claude Code in CleanApp/);
  assert.doesNotMatch(product, /reports about|report about Anthropic/);
});

test('recent activity keeps the real counts static with one decorative reduced-motion-safe sheen', () => {
  const overview = { total_reports: 301, reports_last_30_days: 44, reports_last_7_days: 6 };
  const html = renderToStaticMarkup(React.createElement(BrandOverview, { batch: { overview }, brandName: 'grok' }));
  assert.match(html, /aria-hidden="true" class="brand-recent-sheen"/);
  assert.match(html, /44<\/span> added in the past 30 days/);
  assert.match(html, /6<\/span> in the past 7 days/);
  assert.doesNotMatch(html, /Live|Novel|aria-live/);
  const empty = renderToStaticMarkup(React.createElement(BrandOverview, {
    batch: { overview: { ...overview, reports_last_30_days: 0, reports_last_7_days: 0 } }, brandName: 'grok',
  }));
  assert.doesNotMatch(empty, /brand-recent-sheen/);
  const css = fs.readFileSync(require('node:path').resolve(__dirname, '../src/styles/globals.css'), 'utf8');
  assert.match(css, /animation: brandRecentSheen 1800ms ease-out 350ms 1;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.brand-recent-sheen\s*\{[^}]*animation: none;[^}]*display: none;/);
});

test('native provenance does not invent a mobile client from a sensor, image or generic submission label', () => {
  for (const source_platform of ['sensor', 'mobile', 'web', null]) {
    assert.equal(cleanAppSubmissionLabel({ intake_method: 'cleanapp_submission', source_platform, has_original_media: true, intake_label: 'Submitted through CleanApp' }), 'via CleanApp');
  }
  assert.equal(cleanAppSubmissionLabel({ intake_method: 'imported', source_platform: 'sensor' }), null);
  assert.equal(cleanAppSubmissionLabel({ intake_method: 'unknown', source_platform: 'mobile' }), null);
});

test('mobile provenance requires the server-projected native mobile channel', () => {
  assert.equal(cleanAppSubmissionLabel({ intake_method: 'cleanapp_submission', intake_channel: 'mobile' }), 'via CleanApp mobile');
  for (const intake_channel of ['web', 'share', 'legacy_v2', 'unrecognized', null, undefined]) {
    assert.equal(cleanAppSubmissionLabel({ intake_method: 'cleanapp_submission', intake_channel }), 'via CleanApp');
  }
  for (const intake_method of ['imported', 'unknown', undefined]) {
    assert.equal(cleanAppSubmissionLabel({ intake_method, intake_channel: 'mobile' }), null);
  }
  const html = renderToStaticMarkup(React.createElement(ReportEvidence, {
    evidence: { ...evidence, intake_method: 'cleanapp_submission', intake_channel: 'mobile' },
  }));
  assert.match(html.split('<details')[0], /via CleanApp mobile/);
  assert.match(html, /How received<\/dt><dd>via CleanApp mobile/);
});
