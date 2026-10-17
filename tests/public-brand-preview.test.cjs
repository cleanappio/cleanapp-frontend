const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { harness, response, flush } = require('./seo-harness.cjs');

const id = 'rpt_1234567890123456789012';
const row = {
  public_id: id, canonical_path: `/digital/report/${id}`, title: 'Checkout failed', summary: 'The button did not respond.',
  report_kind: 'firsthand', intake_method: 'imported', excerpt: 'I cannot pay.\nThe screen is frozen.',
  source_url: 'https://github.com/example/project/issues/1', latitude: 12, id: 'PRIVATE_ACTOR', contact: 'PRIVATE_CONTACT',
};
const body = reports => ({ brand_found: true, brand_name: 'google', brand_display_name: 'Google', classification: 'digital', evidence_kind: 'all', reports, total_count: 999, internal_notes: 'PRIVATE_SENTINEL' });
const api = h => h.load('src/lib/public-brand-preview.ts').fetchPublicBrandPreview;

test('map preview uses only the deployed bounded endpoint and projects all evidence kinds without counts', async () => {
  let calls = 0;
  const h = harness(async (url, options) => {
    calls++;
    const parsed = new URL(url);
    assert.equal(parsed.pathname, '/api/v3/public/discovery/brand-preview');
    assert.equal(parsed.searchParams.get('brand_name'), 'google');
    assert.equal(parsed.searchParams.get('lang'), 'fr');
    assert.equal(parsed.searchParams.get('n'), '6');
    assert.equal(parsed.searchParams.get('evidence_kind'), 'all');
    assert.equal(options.credentials, 'omit'); assert.equal(options.cache, 'no-store');
    return response(200, body(Array.from({ length: 9 }, (_, i) => ({
      ...row, public_id: `rpt_${String(i).padStart(22, '0')}`, canonical_path: `/digital/report/rpt_${String(i).padStart(22, '0')}`,
      report_kind: ['firsthand', 'coverage', 'unknown'][i % 3],
    }))));
  });
  const preview = await api(h)(' Google ', 'fr');
  assert.equal(calls, 1); assert.equal(preview.items.length, 6);
  assert.deepEqual(Array.from(preview.items.slice(0, 3), item => item.evidence.report_kind), ['firsthand', 'coverage', 'unknown']);
  assert.equal(preview.items[0].evidence.excerpt, row.excerpt);
  assert.equal(preview.items[0].notification_count.state, 'unavailable');
  assert.equal(preview.total_count, undefined); assert.equal(preview.items[0].recurrence, undefined);
  for (const privateField of ['PRIVATE_', 'latitude', 'contact', 'public_id', 'total_count']) assert.equal(JSON.stringify(preview).includes(privateField), false, privateField);
  assert.equal(h.pendingTimers, 0);
});

test('preview rejects wrong scope, private records and noncanonical identity links', async () => {
  for (const data of [
    { ...body([row]), brand_name: 'microsoft' }, { ...body([row]), classification: 'physical' },
    { ...body([row]), evidence_kind: 'firsthand' }, { ...body([row]), brand_found: false },
    { ...body([row]), visibility: 'private' },
    ...[{ ...row, is_public: false }, { ...row, public_id: 'rpt_short' },
      { ...row, canonical_path: 'https://attacker.example/report' }, { ...row, canonical_path: `/physical/report/${id}` },
      { ...row, public_id: 'rpt_0000000000000000000000' }, { ...row, report_kind: 'invented' },
      { ...row, classification: 'physical' }].map(report => body([report])),
  ]) {
    const h = harness(async () => response(200, data));
    await assert.rejects(api(h)('google', 'en'), /Invalid public brand preview/);
    assert.equal(h.pendingTimers, 0);
  }
  const h = harness(async () => response(200, body([row, { ...row, source_url: 'javascript:alert(1)' }, { ...row, public_id: 'rpt_0000000000000000000000', canonical_path: '/digital/report/rpt_0000000000000000000000', source_url: 'https://user:password@example.com/' }])));
  const preview = await api(h)('google', 'en');
  assert.equal(preview.items.length, 2, 'canonical report links are unique');
  assert.equal(preview.items[1].evidence.source_url, null);
});

test('preview deadline covers stalled headers and full JSON bodies; cancellation aborts without retry', async () => {
  for (const stalledBody of [false, true]) {
    let signal;
    let calls = 0;
    const h = harness((_url, options) => {
      signal = options.signal; calls++;
      return stalledBody ? Promise.resolve({ ok: true, json: () => new Promise(() => {}) }) : new Promise(() => {});
    });
    const request = api(h)('google', 'en');
    const rejected = assert.rejects(request, /timed out/i);
    await flush(); h.advance(3999); await flush();
    assert.equal(signal.aborted, false);
    h.advance(1); await rejected;
    assert.equal(signal.aborted, true); assert.equal(calls, 1); assert.equal(h.pendingTimers, 0);
  }
  let signal;
  const h = harness((_url, options) => { signal = options.signal; return new Promise(() => {}); });
  const controller = new AbortController();
  const request = api(h)('google', 'en', controller.signal);
  controller.abort();
  await assert.rejects(request, { name: 'AbortError' });
  assert.equal(signal.aborted, true); assert.equal(h.pendingTimers, 0);
});

test('empty samples remain empty and HTTP/JSON failures remain failures', async () => {
  const empty = harness(async () => response(200, body([])));
  assert.equal((await api(empty)('google', 'en')).items.length, 0);
  for (const result of [response(404, null), response(503, null), { ok: true, json: async () => { throw new SyntaxError('Invalid JSON'); } }]) {
    const h = harness(async () => result);
    await assert.rejects(api(h)('google', 'en'));
    assert.equal(h.pendingTimers, 0);
  }
  let calls = 0;
  const h = harness(async () => { calls++; return response(200, body([])); });
  const cancelled = new AbortController(); cancelled.abort();
  await assert.rejects(api(h)('google', 'en', cancelled.signal), { name: 'AbortError' });
  assert.equal(calls, 0); assert.equal(h.pendingTimers, 0);
});

function load(relative, replacements) {
  const filename = path.resolve(__dirname, '..', relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, module: { exports }, AbortController,
    require(name) { return name in replacements ? replacements[name] : require(name); },
  }, { filename });
  return exports;
}

test('hook cancels old scopes/unmount and never flashes a prior brand or locale', async () => {
  const states = [];
  let cursor = 0;
  let effect, previousDeps, cleanup;
  const requests = [];
  const { usePublicBrandPreview } = load('src/hooks/usePublicBrandPreview.ts', {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in states)) states[index] = initial;
        return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next; }];
      },
      useCallback: callback => callback,
      useEffect(next, deps) {
        if (!previousDeps || deps.some((value, i) => value !== previousDeps[i])) { previousDeps = deps; effect = next; }
      },
    },
    '@/lib/public-brand-preview': { fetchPublicBrandPreview(brand, locale, signal) {
      return new Promise((resolve, reject) => requests.push({ brand, locale, signal, resolve, reject }));
    } },
  });
  const render = (brand, locale) => { cursor = 0; return usePublicBrandPreview(brand, locale); };
  const commit = () => { if (effect) { cleanup?.(); cleanup = effect(); effect = null; } };
  assert.equal(render('google', 'en').isLoading, true); commit();
  requests[0].resolve({ items: [{ title: 'Google sample' }], brandDisplayName: 'Google' }); await flush();
  assert.equal(render('google', 'en').items[0].title, 'Google sample');
  assert.equal(render('microsoft', 'en').items.length, 0); commit();
  assert.equal(requests[0].signal.aborted, true);
  assert.equal(render('microsoft', 'fr').items.length, 0); commit();
  assert.equal(requests[1].signal.aborted, true);
  requests[1].resolve({ items: [{ title: 'Stale sample' }] }); await flush();
  assert.equal(render('microsoft', 'fr').items.length, 0);
  requests[2].reject(new Error('Unavailable')); await flush();
  assert.equal(render('microsoft', 'fr').isLoading, false);
  const failed = render('microsoft', 'fr');
  assert.ok(failed.error); assert.equal(requests.length, 3);
  failed.refresh();
  assert.equal(render('microsoft', 'fr').isLoading, true); commit();
  assert.equal(requests.length, 4, 'only explicit retry starts another request');
  assert.equal(requests[2].signal.aborted, true);
  cleanup(); assert.equal(requests[3].signal.aborted, true);
});

test('embedded brand shows bounded sample separately from map total and preserves canonical report behavior', () => {
  let preview = { items: [{ canonical_path: row.canonical_path }], isLoading: false, error: null, brandDisplayName: 'Google' };
  let dashboardProps, detailProps;
  const div = props => React.createElement('div', null, props.children);
  const { default: Dialog } = load('src/components/report/EmbeddedPublicReportDialog.tsx', {
    '@radix-ui/react-dialog': Object.fromEntries(['Root', 'Portal', 'Overlay', 'Content', 'Title'].map(key => [key, div])),
    'next/link': { __esModule: true, default: ({ href, children }) => React.createElement('a', { href }, children) },
    '@/components/report/PublicReportDetailPage': { __esModule: true, default: props => { detailProps = props; return React.createElement('article', null, 'Canonical detail'); }, EmbeddedReportBackBar: div },
    '@/lib/i18n': { getCurrentLocale: () => 'en', useTranslations: () => ({ t: key => key }) },
    '@/hooks/usePublicBrandPreview': { usePublicBrandPreview: () => preview },
    '@/lib/report-evidence': { brandLabel: (_name, display) => display },
    '@/components/brand/PublicBrandDashboard': { __esModule: true, default: props => { dashboardProps = props; return React.createElement('section', null, 'Bounded sample'); } },
  });
  const onOpenReport = () => {};
  const render = report => renderToStaticMarkup(React.createElement(Dialog, { report, onClose() {}, onOpenReport }));
  const html = render({ kind: 'brand', brandName: 'google', total: 123456 });
  assert.match(html, /Reports on map: 123,456/); assert.match(html, /Recent reports/); assert.match(html, /1 report in this preview/);
  assert.match(html, /href="\/digital\/google\?kind=all&amp;sort=recent"/); assert.match(html, /View all reports/);
  assert.equal(dashboardProps.items, preview.items); assert.equal(dashboardProps.onOpenReport, onOpenReport);
  assert.equal(dashboardProps.activeKind, 'all');
  assert.doesNotMatch(render({ kind: 'brand', brandName: 'google' }), /Reports on map/);
  preview = { ...preview, items: [], error: 'Unavailable' };
  const failed = render({ kind: 'brand', brandName: 'google' });
  assert.match(failed, /role="alert"/); assert.match(failed, /Try again/); assert.match(failed, /View all reports/); assert.doesNotMatch(failed, /0 reports/);
  assert.match(render({ kind: 'report', publicId: id, classification: 'digital' }), /Canonical detail/);
  assert.equal(detailProps.publicId, id); assert.equal(detailProps.expectedClassification, 'digital'); assert.equal(detailProps.presentation, 'embedded');
});
