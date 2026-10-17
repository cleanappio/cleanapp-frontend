const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const flush = () => new Promise(setImmediate);

function harness(initial = {}) {
  const states = [], effects = [], requests = [];
  let cursor = 0, dirty = false, pending = [];
  let options = { brand: 'microsoft', locale: 'en', enabled: true, query: { kind: 'firsthand', sort: 'recent' }, ...initial };
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], update => {
        const next = typeof update === 'function' ? update(states[index]) : update;
        if (!Object.is(next, states[index])) { states[index] = next; dirty = true; }
      }];
    },
    useEffect(callback, dependencies) {
      const index = cursor++;
      if (!effects[index] || dependencies.some((value, i) => !Object.is(value, effects[index].dependencies[i]))) {
        pending.push(() => {
          effects[index]?.cleanup?.();
          effects[index] = { dependencies, cleanup: callback() };
        });
      }
    },
  };
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(__dirname, relative);
    if (cache.has(filename)) return cache.get(filename);
    const exports = {};
    cache.set(filename, exports);
    const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    vm.runInNewContext(js, { exports, module: { exports }, Error, AbortController, require(name) {
      if (name === 'react') return react;
      if (name === '@/lib/public-discovery-api') return { fetchPublicBrandReports(...args) {
        return new Promise((resolve, reject) => requests.push({ args, resolve, reject }));
      } };
      if (name === '@/lib/report-evidence') return load('../src/lib/report-evidence.ts');
      throw new Error('Unexpected hook dependency ' + name);
    } }, { filename });
    return exports;
  }
  const hook = load('../src/hooks/usePublicReportsByBrand.ts').usePublicReportsByBrand;
  const render = (next = {}) => {
    options = { ...options, ...next };
    let result;
    do {
      dirty = false; cursor = 0;
      result = hook(options.brand, options.locale, options.enabled, options.query, options.preview);
      for (const commit of pending.splice(0)) commit();
    } while (dirty);
    return result;
  };
  return {
    requests, render,
    async respond(index, batch) { requests[index].resolve(batch); await flush(); return render(); },
    async fail(index) { requests[index].reject(new Error('Request failed: 503')); await flush(); return render(); },
    unmount() { for (const effect of effects) effect?.cleanup?.(); },
  };
}

const card = (title, kind = 'firsthand', brand = 'microsoft', display = 'Microsoft') => ({
  title, classification: 'digital', brand_name: brand, brand_display_name: display,
  evidence: { report_kind: kind }, discovery_token: title,
});
function batch({ brand = 'microsoft', product = null, kind = 'firsthand', sort = 'recent', offset = 0,
  counts = { firsthand: 2, coverage: 3, unknown: 0, all: 5 }, items = [card('A personal report', kind, brand)], ...extra } = {}) {
  return {
    items, count: items.length, total_count: counts[kind], counts_exact: true,
    kind, sort, offset, has_more: false, kind_counts: counts,
    scope: { brand_name: brand, product, includes_products: !product, products: [brand, 'windows'] },
    overview: { total_reports: 8, reports_last_30_days: 4, reports_last_7_days: 1, reports_previous_7_days: 2,
      latest_report_at: '2026-10-16T13:00:00Z', as_of: '2026-10-17T11:00:00Z', classification: 'digital', date_basis: 'added_to_cleanapp' },
    snapshot_at: '2026-10-17T10:59:00Z',
    ...extra,
  };
}
const titles = view => Array.from(view.items, item => item.title);

test('SSR preview hydrates once into full counts while preserving useful evidence and company casing', async () => {
  const preview = { items: [card('Preview')], count: 1, kind: 'firsthand', sort: 'recent', offset: 0, counts_exact: false };
  const h = harness({ preview });
  let view = h.render();
  assert.deepEqual(titles(view), ['Preview']);
  assert.equal(view.isRefreshing, true);
  assert.equal(view.isLoading, false);
  assert.equal(view.metadata, null, 'a bounded sample cannot supply category totals');
  assert.equal(view.brandDisplayName, 'Microsoft');
  h.render();
  assert.equal(h.requests.length, 1);
  view = await h.respond(0, batch());
  assert.equal(view.isPreview, false);
  assert.equal(view.isRefreshing, false);
  assert.equal(view.metadata.kind_counts.unknown, 0);
  assert.equal(view.metadata.overview.total_reports, 8);
  assert.equal(view.metadata.snapshot_at, '2026-10-17T10:59:00Z');
  assert.ok(Number.isFinite(Date.parse(view.metadataReceivedAt)));
  assert.equal(view.hasScopedCounts, true);
  assert.equal(view.totalCount, 2);
});

test('an empty scoped SSR preview preserves the provided display name without inventing counts', () => {
  const h = harness({ preview: { items: [], count: 0, brand_name: 'microsoft', brand_display_name: 'Microsoft', counts_exact: false } });
  let view = h.render();
  assert.equal(view.brandDisplayName, 'Microsoft');
  assert.equal(view.isPreview, true);
  assert.equal(view.metadata, null);
  assert.equal(h.requests.length, 1);
  view = h.render({ brand: 'google' });
  assert.equal(view.isPreview, false);
  assert.equal(view.brandDisplayName, 'google');
});

test('all category counts, overview and title survive Most reported loading and failure without old order leakage', async () => {
  const h = harness(); h.render();
  const first = await h.respond(0, batch());
  let view = h.render({ query: { kind: 'firsthand', sort: 'recurrence' } });
  assert.equal(view.metadata, first.metadata);
  assert.equal(view.metadataRetained, true);
  assert.equal(view.brandDisplayName, 'Microsoft');
  assert.deepEqual(titles(view), []);
  assert.equal(view.isLoading, true);
  view = await h.fail(1);
  assert.equal(view.error, 'Request failed: 503');
  assert.equal(view.metadata, first.metadata);
  assert.equal(view.metadata.kind_counts.coverage, 3);
  assert.equal(view.brandDisplayName, 'Microsoft');
  assert.deepEqual(titles(view), []);
  view.refresh(); h.render();
  view = await h.respond(2, batch({ sort: 'recurrence', items: [card('Largest family'), card('Smaller family')] }));
  assert.deepEqual(titles(view), ['Largest family', 'Smaller family'], 'server ordering is preserved');
  assert.equal(view.metadataRetained, false);
  assert.deepEqual(h.requests.map(request => request.args[3].sort), ['recent', 'recurrence', 'recurrence']);
});

test('retry retains evidence only for the identical kind, product, sort and page', async () => {
  const h = harness(); h.render();
  let view = await h.respond(0, batch());
  view.refresh(); view = h.render();
  assert.deepEqual(titles(view), ['A personal report']);
  assert.equal(view.isRefreshing, true);
  view = await h.fail(1);
  assert.deepEqual(titles(view), ['A personal report']);
  assert.equal(view.metadataRetained, true);
  view = h.render({ query: { kind: 'firsthand', sort: 'signal' } });
  assert.deepEqual(titles(view), []);
  view = await h.respond(2, batch({ sort: 'signal', items: [card('Best evidence')] }));
  assert.deepEqual(titles(view), ['Best evidence']);
  view = h.render({ query: { kind: 'coverage', sort: 'signal' } });
  assert.deepEqual(titles(view), []);
  assert.equal(view.metadata.kind_counts.firsthand, 2);
  view = await h.respond(3, batch({ kind: 'coverage', sort: 'signal' }));
  view = h.render({ query: { kind: 'coverage', sort: 'signal', offset: 12 } });
  assert.deepEqual(titles(view), []);
  assert.equal(view.metadata.kind_counts.coverage, 3);
  assert.equal(h.requests[4].args[3].offset, 12);
});

test('count caches are isolated by brand, locale and product and cannot be overwritten by cancelled views', async () => {
  const h = harness(); h.render();
  const company = await h.respond(0, batch());
  let view = h.render({ query: { kind: 'all', sort: 'recent', product: 'windows' } });
  assert.equal(view.metadata, null);
  assert.equal(view.brandDisplayName, 'Microsoft', 'company casing also survives product changes');
  view = await h.respond(1, batch({ product: 'windows', kind: 'all', counts: { firsthand: 0, coverage: 1, unknown: 0, all: 1 } }));
  assert.equal(view.metadata.kind_counts.all, 1);
  view = h.render({ query: { kind: 'unknown', sort: 'recent' } });
  assert.equal(view.metadata, company.metadata, 'returning to all products restores only that scope');
  view = h.render({ brand: 'google', query: { kind: 'firsthand', sort: 'recent' } });
  assert.equal(h.requests[2].args[4].aborted, true, 'changing views cancels the old HTTP request');
  assert.equal(view.metadata, null);
  assert.equal(view.brandDisplayName, 'google', 'Microsoft display metadata must not leak to another company');
  await h.respond(2, batch({ kind: 'unknown', counts: { firsthand: 999, coverage: 0, unknown: 0, all: 999 } }));
  assert.equal(h.render().metadata, null, 'cancelled Microsoft response cannot populate Google');
  await h.respond(3, batch({ brand: 'google', items: [card('Google report', 'firsthand', 'google', 'Google')] }));
  view = h.render({ locale: 'fr' });
  assert.equal(view.metadata, null);
  assert.deepEqual(titles(view), []);
  view = h.render({ brand: 'microsoft', locale: 'en' });
  assert.equal(view.metadata.kind_counts.firsthand, 2, 'cancelled result also cannot alter the cached prior company');
  assert.equal(view.brandDisplayName, 'Microsoft');
  h.unmount();
  assert.equal(h.requests.at(-1).args[4].aborted, true, 'unmount cancels the active request');
});

test('malformed, approximate or mismatched metadata never replaces known exact counts', async () => {
  const h = harness(); h.render();
  let view = await h.respond(0, batch());
  const exact = view.metadata;
  for (const invalid of [
    batch({ counts_exact: false }),
    batch({ counts: { firsthand: 2, coverage: -1, unknown: 0, all: 5 } }),
    batch({ counts: { firsthand: 2, coverage: '3', unknown: 0, all: 5 } }),
    batch({ total_count: 999 }),
    batch({ overview: { total_reports: -1 } }),
  ]) {
    view.refresh(); h.render();
    view = await h.respond(h.requests.length - 1, invalid);
    assert.equal(view.metadata, exact);
    assert.equal(view.metadataRetained, true);
  }
  for (const invalid of [batch({ brand: 'google' }), batch({ product: 'windows' }), batch({ sort: 'recurrence' }), batch({ offset: 12 })]) {
    view.refresh(); h.render();
    view = await h.respond(h.requests.length - 1, invalid);
    assert.match(view.error, /selected view/);
    assert.equal(view.metadata, exact);
  }
});

test('returning to a previously completed view still starts a distinct request and labels its saved counts', async () => {
  const h = harness(); h.render();
  await h.respond(0, batch());
  h.render({ query: { kind: 'all', sort: 'recent', product: 'windows' } });
  await h.respond(1, batch({ product: 'windows', kind: 'all' }));
  let view = h.render({ query: { kind: 'firsthand', sort: 'recent' } });
  assert.equal(view.isLoading, true);
  assert.equal(view.metadataRetained, true);
  view = await h.fail(2);
  assert.equal(view.metadata.kind_counts.firsthand, 2);
  assert.equal(view.metadataRetained, true);
  assert.equal(view.error, 'Request failed: 503');
});
