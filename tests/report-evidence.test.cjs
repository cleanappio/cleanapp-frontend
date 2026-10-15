const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const file = require('node:path').resolve(__dirname, '../src/lib/report-evidence.ts');
const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const target = new Module(file);
target._compile(compiled, file);
const { safeOriginalSourceUrl, evidenceDate, contentKind, matchesContentKind } = target.exports;

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
  assert.match(html, /Original source wording/);
  assert.match(html, /CleanApp AI summary/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /Integration dependency/);
  assert.match(html, /Not independently reproduced/);
  assert.match(html, /Observed: Unknown/);
  assert.match(html, /2025/);
  assert.match(html, /2026/);
});

test('render never invents direct submission, firsthand, validation or original links for legacy reports', () => {
  const html = renderToStaticMarkup(React.createElement(ReportEvidence, {}));
  assert.match(html, /Unclassified source/);
  assert.match(html, /Intake unknown/);
  assert.match(html, /Independent validation unknown/);
  assert.match(html, /Supporting source count unconfirmed/);
  assert.doesNotMatch(html, /Firsthand account|Submitted through CleanApp|href=/);
});

test('dedup recurrence is labeled source reports and keeps independence unassessed', () => {
  const recurrence = { supporting_report_count: 4, source_account_count: 2, duplicate_import_count: 3, independence: 'unassessed', counts_exact: true, related_observation_count: 5 };
  const html = renderToStaticMarkup(React.createElement(ReportEvidence, { evidence, recurrence }));
  assert.match(html, /4 supporting source reports/);
  assert.match(html, /Independence unassessed/);
  assert.match(html, /3 duplicate imports excluded/);
  assert.match(html, /5 related observations/);
  assert.doesNotMatch(html, /4 affected users|4 users/);
});

test('image-only originals remain visible as established source evidence', () => {
  const html = renderToStaticMarkup(React.createElement(ReportEvidence, {
    evidence: { ...evidence, excerpt: null, source_url: null, has_original_media: true },
  }));
  assert.match(html, /Original image is available in report details/);
  assert.doesNotMatch(html, /Source evidence has not been established/);
  assert.doesNotMatch(html, /Original source wording/);
});
