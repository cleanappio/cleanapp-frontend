const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the actual map callbacks and URL effect, without mounting WebGL.
const filename = path.resolve(__dirname, '../src/components/GlobeView.tsx');
const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const callbacks = new Map();
const effects = [];
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.initializer && ts.isCallExpression(node.initializer) && node.initializer.expression.getText(source) === 'useCallback') {
    callbacks.set(node.name.getText(source), node.initializer.arguments[0].getText(source));
  }
  if (ts.isCallExpression(node) && node.expression.getText(source) === 'useEffect') effects.push(node.arguments[0].getText(source));
  ts.forEachChild(node, visit);
}
visit(source);

function harness(query = {}, summaries = []) {
  const requests = [], routes = [], flights = [];
  const state = {
    embeddedPublicReport: null, selectedReport: null, selectedBrandName: null,
    seq: null, reportWithAnalysis: null, isLoadingReportFromUrl: false, isCleanAppProOpen: false,
    selectedTab: 'digital', isEmbeddedMode: false, isReactNativeWebView: false,
    lastFetchedSeqRef: { current: null }, lastFetchedBrandRef: { current: null }, openingFromClickRef: { current: false },
    latestDigitalReportsV2: summaries,
    router: {
      isReady: true, pathname: '/', query,
      push(target) { routes.push(target); if (target.query) this.query = target.query; return Promise.resolve(true); },
      replace() {},
    },
    setSelectedTab() {}, setShowLocationTutorial() {},
    getCurrentLocale: () => 'en', filterAnalysesByLanguage: rows => rows,
    getCanonicalReportPath: (classification, id) => id ? `/${classification}/report/${id}` : null,
    stringToLatLonColor: brand => ({ lat: brand === 'microsoft' ? 47 : 38, lon: brand === 'microsoft' ? -122 : -121 }),
    flyToReport: position => flights.push(position),
    fetch(url) {
      requests.push(url);
      const item = { report: { seq: 42 }, analysis: [{ classification: 'digital', brand_name: 'other', brand_display_name: 'Other' }] };
      return Promise.resolve({ ok: true, json: async () => url.includes('by-seq') ? item : { reports: [item] } });
    },
    process: { env: { NEXT_PUBLIC_LIVE_API_URL: 'https://live.example' } },
    console: { log() {}, error() {} }, setTimeout: () => 1,
  };
  for (const key of ['embeddedPublicReport', 'selectedReport', 'selectedBrandName', 'seq', 'reportWithAnalysis', 'isLoadingReportFromUrl', 'isCleanAppProOpen']) {
    state[`set${key[0].toUpperCase()}${key.slice(1)}`] = value => { state[key] = typeof value === 'function' ? value(state[key]) : value; };
  }
  const context = vm.createContext(state);
  function install(name, expression) {
    assert.ok(expression, `missing map callback ${name}`);
    const compiled = ts.transpileModule(`globalThis.${name} = (${expression});`, {
      compilerOptions: { target: ts.ScriptTarget.ES2020 },
    }).outputText;
    vm.runInContext(compiled, context, { filename });
  }
  for (const name of ['shouldUseSeqForDigital', 'openResolvedPublicReport', 'openCanonicalReport', 'closeEmbeddedPublicReport', 'openReportFromSummary']) install(name, callbacks.get(name));
  install('openFromUrl', effects.find(effect => effect.includes('const seqParam = router.query.seq')));
  install('fillBrandMetadata', effects.find(effect => effect.includes('embeddedPublicReport.total !== summary.total')));
  return { state, requests, routes, flights };
}

const summaries = [
  { classification: 'digital', brand_name: 'google', brand_display_name: 'Google', total: 61046 },
  { classification: 'digital', brand_name: 'microsoft', brand_display_name: 'Microsoft', total: 53177 },
];
const selection = state => JSON.parse(JSON.stringify(state.embeddedPublicReport));

test('typed company names prefer their exact saved totals over products mentioning the company', () => {
  const expression = effects.find(effect => effect.includes('const normalized = searchTerm.trim().toLowerCase()'));
  assert.ok(expression);
  for (const summary of summaries) {
    let matched;
    const context = vm.createContext({
      searchTerm: ` ${summary.brand_display_name.toUpperCase()} `, isDigital: true,
      latestReports: [
        { classification: 'digital', brand_name: 'aaa-product', brand_display_name: `A product from ${summary.brand_display_name}`, total: 1 },
        { ...summary, brand_name: 'bbb-display-alias', total: 2 },
        summary,
      ],
      setMatchingBrand: value => { matched = value; },
      setTimeout: callback => { callback(); return 1; }, clearTimeout() {},
    });
    vm.runInContext(ts.transpileModule(`(${expression})();`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context);
    assert.deepEqual(JSON.parse(JSON.stringify(matched)), {
      brand_name: summary.brand_name, brand_display_name: summary.brand_display_name, total: summary.total,
    });
  }
});

test('repeated brand query parameters do not crash or load an ambiguous brand', () => {
  const h = harness({ tab: 'digital', brand_name: ['google', 'microsoft'] }, summaries);
  assert.doesNotThrow(() => h.state.openFromUrl());
  assert.equal(h.state.embeddedPublicReport, null);
  assert.equal(h.requests.length, 0);
});

test('Google and Microsoft map summary clicks open bounded brand selection without a full report lookup', () => {
  for (const summary of summaries) {
    const h = harness({ tab: 'digital', seq: '99' }, summaries);
    assert.equal(h.state.openReportFromSummary(summary), true);
    assert.deepEqual(selection(h.state), { kind: 'brand', brandName: summary.brand_name, brandDisplayName: summary.brand_display_name, total: summary.total });
    assert.equal(h.state.router.query.seq, undefined);
    h.state.openFromUrl();
    assert.equal(h.requests.length, 0);
    assert.equal(h.state.isLoadingReportFromUrl, false);
    assert.equal(h.state.isCleanAppProOpen, false);
    assert.equal(h.state.selectedReport, null);
    assert.equal(h.state.reportWithAnalysis, null);
    assert.equal(h.flights.length, 1);
  }
});

test('brand deep links use renderer metadata, close cleanly and reopen the same brand', () => {
  const h = harness({ tab: 'digital', brand_name: 'microsoft' }, summaries);
  h.state.openFromUrl();
  assert.deepEqual(selection(h.state), { kind: 'brand', brandName: 'microsoft', brandDisplayName: 'Microsoft', total: 53177 });
  assert.equal(h.requests.length, 0);
  assert.equal(h.state.lastFetchedBrandRef.current, 'microsoft');
  h.state.closeEmbeddedPublicReport();
  assert.equal(h.state.embeddedPublicReport, null);
  assert.equal(h.state.router.query.brand_name, undefined);
  assert.equal(h.state.lastFetchedBrandRef.current, null);
  assert.equal(h.state.lastFetchedSeqRef.current, null);
  h.state.fillBrandMetadata();
  assert.equal(h.state.embeddedPublicReport, null, 'metadata arrival cannot reopen a closed dialog');
  h.state.router.query = { tab: 'digital', brand_name: 'microsoft' };
  h.state.openFromUrl();
  assert.equal(h.state.embeddedPublicReport.total, 53177);
  assert.equal(h.requests.length, 0);
  h.state.router.query = { tab: 'digital' };
  h.state.openFromUrl();
  assert.equal(h.state.embeddedPublicReport, null, 'browser back removes the selected brand');
  assert.equal(h.state.lastFetchedBrandRef.current, null);
});

test('deep links opened before the renderer index fills do not invent a count or block metadata updates', () => {
  const h = harness({ tab: 'digital', brand_name: 'google' });
  h.state.openFromUrl();
  assert.deepEqual(selection(h.state), { kind: 'brand', brandName: 'google' });
  assert.equal(h.state.isLoadingReportFromUrl, false);
  h.state.latestDigitalReportsV2 = summaries;
  h.state.fillBrandMetadata();
  assert.deepEqual(selection(h.state), { kind: 'brand', brandName: 'google', brandDisplayName: 'Google', total: 61046 });
  assert.equal(h.requests.length, 0);
});

test('resolved brands open the map dialog on desktop while canonical report navigation stays unchanged', () => {
  const h = harness({}, summaries);
  h.state.openResolvedPublicReport({ kind: 'brand', classification: 'digital', brand_name: 'google', canonical_path: '/digital/google' });
  assert.equal(h.state.embeddedPublicReport.total, 61046);
  assert.equal(h.routes.length, 0);
  h.state.openReportFromSummary({ classification: 'digital', public_id: 'public-report', brand_name: 'google', total: 1 });
  assert.equal(h.routes.at(-1), '/digital/report/public-report');
  h.state.isReactNativeWebView = true;
  h.state.openCanonicalReport('physical', 'physical-report');
  assert.deepEqual(selection(h.state), { kind: 'report', classification: 'physical', publicId: 'physical-report' });
  assert.equal(h.requests.length, 0);
});

test('special other selections keep report seq routing, including legacy brand-only links', async () => {
  const click = harness({ tab: 'digital' });
  click.state.openReportFromSummary({ classification: 'digital', brand_name: 'other', seq: 42, total: 1 });
  assert.equal(click.state.router.query.seq, 42);
  assert.equal(click.state.embeddedPublicReport, null);
  const deep = harness({ tab: 'digital', brand_name: 'other' });
  deep.state.openFromUrl();
  assert.equal(deep.state.isLoadingReportFromUrl, true);
  await new Promise(setImmediate);
  assert.equal(deep.state.router.query.seq, '42');
  assert.equal(deep.state.router.query.brand_name, 'other');
  assert.equal(deep.state.seq, 42);
  assert.equal(deep.state.embeddedPublicReport, null);
  assert.equal(deep.requests.length, 1, 'only the legacy other branch may look up its initial seq');
});
