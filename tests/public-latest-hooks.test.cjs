const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// A small React hook lifecycle harness: preserve state/ref/callback slots across
// renders and run dependency-aware effect cleanup before the replacement setup.
function hooks() {
  let cursor = 0;
  const slots = [];
  const pending = [];
  const same = (left, right) => left && right && left.length === right.length && left.every((value, index) => Object.is(value, right[index]));
  return {
    begin() { cursor = 0; },
    commit() { for (const run of pending.splice(0)) run(); },
    unmount() { for (const slot of slots) slot?.cleanup?.(); },
    react: {
      useState(initial) {
        const index = cursor++;
        slots[index] ??= { value: typeof initial === 'function' ? initial() : initial };
        return [slots[index].value, update => { slots[index].value = typeof update === 'function' ? update(slots[index].value) : update; }];
      },
      useRef(initial) { const index = cursor++; slots[index] ??= { current: initial }; return slots[index]; },
      useCallback(callback, deps) {
        const index = cursor++;
        if (!same(slots[index]?.deps, deps)) slots[index] = { deps, value: callback };
        return slots[index].value;
      },
      useEffect(effect, deps) {
        const index = cursor++;
        if (same(slots[index]?.deps, deps)) return;
        pending.push(() => { slots[index]?.cleanup?.(); slots[index] = { deps, cleanup: effect() }; });
      },
    },
  };
}

function load(relative, replacements, globals = {}) {
  const filename = path.resolve(__dirname, relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, module: { exports }, process, ...globals,
    require: name => { assert.ok(name in replacements, `unexpected dependency ${name}`); return replacements[name]; },
  }, { filename });
  return exports;
}

test('Latest hook isolates classification and locale scopes and keeps one stable refresh callback', () => {
  const h = hooks();
  let locale = 'en';
  const feeds = [];
  const requests = [];
  const { usePublicLatestReports } = load('../src/hooks/usePublicLatestReports.ts', {
    react: h.react,
    '@/lib/i18n': { getCurrentLocale: () => locale },
    '@/lib/public-discovery-api': { fetchPublicLatest: (...args) => { requests.push(args); return Promise.resolve({ items: [] }); } },
    '@/lib/public-latest-feed': {
      startPublicLatestFeed(loader, emit) {
        const signal = new AbortController().signal;
        const feed = { emit, signal, closed: false, refreshes: 0, refresh() { this.refreshes += 1; }, close() { this.closed = true; } };
        feeds.push(feed);
        void loader(signal);
        emit({ items: [], loading: true, error: null, refreshing: true });
        return feed;
      },
    },
  });
  const render = (classification, n = 10) => { h.begin(); return usePublicLatestReports(classification, n); };
  const first = render('physical');
  h.commit();
  feeds[0].emit({ items: [{ title: 'Physical report' }], loading: false, error: null, refreshing: false });
  const physical = render('physical');
  h.commit();
  assert.equal(physical.items[0].title, 'Physical report');
  assert.equal(physical.refresh, first.refresh);
  assert.equal(feeds.length, 1, 'rerender must not restart polling or websocket dependencies');

  const switching = render('digital', 12);
  assert.equal(switching.items.length, 0, 'old classification cannot flash before effect cleanup');
  assert.equal(switching.loading, true);
  h.commit();
  assert.equal(feeds[0].closed, true);
  switching.refresh();
  assert.equal(feeds[0].refreshes, 0);
  assert.equal(feeds[1].refreshes, 1);
  assert.deepEqual(requests.map(args => args.slice(0, 3)), [['physical', 'en', 10], ['digital', 'en', 12]]);
  assert.equal(requests[1][3], feeds[1].signal, 'the bounded controller signal must reach the API');

  feeds[1].emit({ items: [{ title: 'English digital report' }], loading: false, error: null, refreshing: false });
  locale = 'fr';
  assert.equal(render('digital', 12).items.length, 0, 'locale change cannot show previous language rows');
  h.commit();
  assert.equal(feeds[1].closed, true);
  assert.equal(requests[2][1], 'fr');
  h.unmount();
  first.refresh();
  assert.equal(feeds[2].closed, true);
  assert.equal(feeds[2].refreshes, 0, 'unmounted refresh callback cannot revive a feed');
});

function expandableHook() {
  const h = hooks();
  const feeds = [], requests = [];
  let locale = 'en';
  const { usePublicLatestReports } = load('../src/hooks/usePublicLatestReports.ts', {
    react: h.react,
    '@/lib/i18n': { getCurrentLocale: () => locale },
    '@/lib/public-discovery-api': { fetchPublicLatest: (...args) => { requests.push(args); return Promise.resolve({ items: [] }); } },
    '@/lib/public-latest-feed': {
      startPublicLatestFeed(loader, emit, initialItems = []) {
        const feed = { emit, initialItems, closed: false, retries: 0,
          refresh() { this.retries += 1; emit({ items: initialItems, loading: !initialItems.length, error: null, refreshing: true }); },
          close() { this.closed = true; },
        };
        feeds.push(feed);
        void loader(new AbortController().signal);
        emit({ items: initialItems, loading: !initialItems.length, error: null, refreshing: true });
        return feed;
      },
    },
  });
  return {
    feeds, requests,
    setLocale(value) { locale = value; },
    render(classification = 'digital') { h.begin(); return usePublicLatestReports(classification); },
    commit() { h.commit(); },
    finish(count, error = null) {
      const feed = feeds.at(-1);
      const items = error ? feed.initialItems : Array.from({ length: count }, (_, index) => ({ discovery_token: `response-${feeds.length}-${index}`, title: `Report ${index}` }));
      feed.emit({ items, loading: false, error, refreshing: false });
    },
  };
}

test('Load more expands 10 to30 to50 with replacement snapshots, retaining rows while loading and stopping at cap', () => {
  const h = expandableHook();
  h.render(); h.commit();
  assert.equal(h.requests[0][2], 10);
  h.finish(10);
  let view = h.render();
  assert.equal(view.hasMore, true);
  view.loadMore(); view.loadMore();
  view = h.render();
  assert.equal(view.items.length, 10);
  assert.equal(view.loadingMore, true);
  assert.equal(view.loading, false);
  h.commit();
  assert.equal(h.feeds[0].closed, true);
  assert.equal(h.feeds[1].initialItems.length, 10);
  assert.equal(h.requests[1][2], 30, 'double click must not skip to50');
  h.finish(30);
  view = h.render();
  assert.equal(view.items.length, 30, 'larger authoritative snapshot replaces the rotating-token list');
  assert.equal(view.loadingMore, false);
  view.loadMore();
  h.render(); h.commit();
  assert.equal(h.requests[2][2], 50);
  h.finish(50);
  view = h.render();
  assert.equal(view.hasMore, false);
  view.loadMore();
  h.render(); h.commit();
  assert.equal(h.requests.length, 3, 'never request more than backend50 cap');
});

test('short batches stop expansion; failed expansion retains rows and retries the same size', () => {
  const h = expandableHook();
  h.render(); h.commit(); h.finish(10);
  h.render().loadMore(); h.render(); h.commit();
  h.finish(0, 'Request failed:503');
  let view = h.render();
  assert.equal(view.items.length, 10);
  assert.equal(view.loadingMore, false);
  assert.equal(view.hasMore, true);
  view.loadMore();
  assert.equal(h.feeds[1].retries, 1);
  assert.equal(h.render().loadingMore, true);
  h.finish(24);
  view = h.render();
  assert.equal(view.items.length, 24);
  assert.equal(view.hasMore, false);
  view.loadMore();
  h.render(); h.commit();
  assert.deepEqual(h.requests.map(args => args[2]), [10, 30]);
});

test('expanded limit and retained rows reset on classification or locale changes', () => {
  const h = expandableHook();
  h.render(); h.commit(); h.finish(10);
  h.render().loadMore(); h.render(); h.commit(); h.finish(30);
  const changing = h.render('physical');
  assert.equal(changing.items.length, 0);
  assert.equal(changing.loading, true);
  h.commit();
  assert.equal(h.requests.at(-1)[0], 'physical');
  assert.equal(h.requests.at(-1)[2], 10);
  assert.equal(h.feeds.at(-1).initialItems.length, 0);
  h.finish(10);
  h.render('physical').loadMore(); h.render('physical'); h.commit(); h.finish(30);
  h.render('digital'); h.commit();
  assert.equal(h.requests.at(-1)[2], 10, 'returning to a previous tab also starts with10');
  assert.equal(h.feeds.at(-1).initialItems.length, 0);
  h.finish(10);
  h.setLocale('fr');
  assert.equal(h.render('digital').items.length, 0);
  h.commit();
  assert.equal(h.requests.at(-1)[1], 'fr');
  assert.equal(h.requests.at(-1)[2], 10);
  assert.equal(h.feeds.at(-1).initialItems.length, 0);
});

test('lite-map append callbacks stay stable across live updates while preserving deduplication', () => {
  const h = hooks();
  const { useLiteReportsByTabV2 } = load('../src/hooks/v2/useLiteReports.ts', {
    react: h.react, '@/lib/i18n': { getCurrentLocale: () => 'en' },
  });
  const render = () => { h.begin(); return useLiteReportsByTabV2(); };
  const first = render();
  first.appendPhysicalLite([{ classification: 'physical', latitude: 47, longitude: 8, severity_level: 0.4 }]);
  first.appendPhysicalLite([
    { classification: 'physical', latitude: 47, longitude: 8, severity_level: 0.4 },
    { classification: 'physical', latitude: 47, longitude: 8, severity_level: 0.7 },
  ]);
  first.appendDigitalLite([{ classification: 'digital', brand_name: 'grok', total: 1 }]);
  first.appendDigitalLite([
    { classification: 'digital', brand_name: 'grok', total: 2 },
    { classification: 'digital', brand_name: 'anthropic', total: 1 },
  ]);
  const updated = render();
  assert.equal(updated.appendPhysicalLite, first.appendPhysicalLite);
  assert.equal(updated.appendDigitalLite, first.appendDigitalLite);
  assert.equal(updated.refetch, first.refetch);
  assert.equal(updated.physicalReports.length, 2);
  assert.deepEqual(Array.from(updated.physicalReports, item => item.severity_level), [0.4, 0.7]);
  assert.equal(updated.digitalReports.length, 2);
  assert.equal(updated.digitalReports[0].total, 2, 'new representative replaces the old brand node');
});

function digitalSummaryHook(visibility = 'visible') {
  const h = hooks();
  let now = 0;
  let nextTimer = 0;
  let physicalRequests = 0;
  const requests = [];
  const timers = new Map();
  function eventTarget() {
    const listeners = new Map();
    return {
      addEventListener(name, callback) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(callback); },
      removeEventListener(name, callback) { listeners.get(name)?.delete(callback); },
      dispatch(name) { for (const callback of listeners.get(name) || []) callback(); },
      get listenerCount() { return [...listeners.values()].reduce((count, callbacks) => count + callbacks.size, 0); },
    };
  }
  const window = eventTarget();
  const document = Object.assign(eventTarget(), { visibilityState: visibility });
  class Clock extends Date { static now() { return now; } }
  const { useLiteReportsByTabV2 } = load('../src/hooks/v2/useLiteReports.ts', {
    react: h.react, '@/lib/i18n': { getCurrentLocale: () => 'en' },
  }, {
    window, document, AbortController, Date: Clock,
    setTimeout(callback, delay) { const id = ++nextTimer; timers.set(id, { callback, at: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    fetch(url, options = {}) {
      if (url.includes('/reports/points')) {
        physicalRequests += 1;
        return Promise.resolve({ json: async () => [] });
      }
      assert.ok(url.endsWith('/api/v4/brands/summary?classification=digital&lang=en'));
      return new Promise((resolve, reject) => requests.push({ resolve, reject, signal: options.signal, at: now }));
    },
  });
  return {
    requests, window, document,
    render() { h.begin(); return useLiteReportsByTabV2(); },
    commit() { h.commit(); },
    unmount() { h.unmount(); },
    respond(index, rows) { requests[index].resolve({ ok: true, json: async () => rows }); },
    snapshot() { return Array.from(this.render().digitalReports, item => [item.brand_name, item.total]); },
    get physicalRequests() { return physicalRequests; },
    get timerCount() { return timers.size; },
    async advance(ms) {
      const target = now + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        const [id, timer] = due;
        now = timer.at;
        timers.delete(id);
        timer.callback();
        await new Promise(setImmediate);
      }
      now = target;
      await new Promise(setImmediate);
    },
  };
}

test('digital summary invalidation bursts coalesce with a minute gap and retain authoritative snapshots', async () => {
  const h = digitalSummaryHook();
  const first = h.render(); h.commit();
  assert.equal(h.requests.length, 1, 'the first summary load starts immediately');
  for (let index = 0; index < 100; index++) first.invalidateDigital();
  assert.equal(h.requests.length, 1, 'live events cannot overlap the initial whole-index download');
  h.respond(0, [{ brand_name: 'google', total: 30000 }, { brand_name: 'microsoft', total: 22000 }]);
  await h.advance(0);
  assert.deepEqual(h.snapshot(), [['google', 30000], ['microsoft', 22000]], 'events cannot invalidate a successful in-flight snapshot');
  assert.equal(h.render().invalidateDigital, first.invalidateDigital, 'the live callback remains stable across renders');
  await h.advance(59_999);
  assert.equal(h.requests.length, 1);
  for (let index = 0; index < 100; index++) first.invalidateDigital();
  await h.advance(1);
  assert.equal(h.requests.length, 2, 'all bursts share one trailing refresh at60 seconds');
  assert.deepEqual(h.snapshot(), [['google', 30000], ['microsoft', 22000]], 'pending refresh cannot replace totals with preview counts');
  h.respond(1, [{ brand_name: 'google', total: 29000 }, { brand_name: 'microsoft', total: 0 }, { brand_name: 'new-brand', total: 7 }]);
  await h.advance(0);
  const updated = [['google', 29000], ['microsoft', 0], ['new-brand', 7]];
  assert.deepEqual(h.snapshot(), updated, 'successful snapshots permit decreases, zero, and new brands');

  first.invalidateDigital();
  await h.advance(60_000);
  h.requests[2].resolve({ ok: false, status: 503 });
  await h.advance(0);
  assert.deepEqual(h.snapshot(), updated);
  assert.match(h.render().errors.digital, /503/);
  assert.equal(h.render().loading.digital, false);
  assert.equal(h.physicalRequests, 1, 'digital events do not reload physical points');
  h.unmount();
});

test('digital summary invalidation pauses hidden and resumes on visibility, focus, or online', async () => {
  const h = digitalSummaryHook('hidden');
  const first = h.render(); h.commit();
  first.invalidateDigital();
  assert.equal(h.requests.length, 0);
  h.document.visibilityState = 'visible';
  h.document.dispatch('visibilitychange');
  assert.equal(h.requests.length, 1);
  h.respond(0, [{ brand_name: 'google', total: 30000 }]);
  await h.advance(0);
  h.window.dispatch('focus');
  h.window.dispatch('online');
  h.document.visibilityState = 'hidden';
  await h.advance(60_000);
  assert.equal(h.requests.length, 1, 'a pending timer cannot start a hidden download');
  h.document.visibilityState = 'visible';
  h.document.dispatch('visibilitychange');
  assert.equal(h.requests.length, 2);
  h.respond(1, [{ brand_name: 'google', total: 30001 }]);
  await h.advance(0);
  assert.deepEqual(h.snapshot(), [['google', 30001]]);
  h.unmount();
  assert.equal(h.timerCount, 0);
  assert.equal(h.window.listenerCount, 0);
  assert.equal(h.document.listenerCount, 0);
  first.invalidateDigital();
  assert.equal(h.requests.length, 2, 'unmounted callbacks cannot revive downloads');
});

test('digital summary deadline covers the response body and cleanup ignores late results', async () => {
  const h = digitalSummaryHook();
  const first = h.render(); h.commit();
  let finishBody;
  h.requests[0].resolve({ ok: true, json: () => new Promise(resolve => { finishBody = resolve; }) });
  await h.advance(0);
  await h.advance(15_000);
  assert.equal(h.requests[0].signal.aborted, true);
  assert.match(h.render().errors.digital, /timed out/);
  assert.equal(h.render().loading.digital, false);
  first.invalidateDigital();
  await h.advance(45_000);
  assert.equal(h.requests.length, 2);
  h.respond(1, [{ brand_name: 'google', total: 30000 }]);
  await h.advance(0);
  finishBody([{ brand_name: 'google', total: 1 }]);
  await h.advance(0);
  assert.deepEqual(h.snapshot(), [['google', 30000]], 'late timed-out JSON cannot overwrite recovery');
  first.invalidateDigital();
  await h.advance(60_000);
  assert.equal(h.requests.length, 3);
  h.unmount();
  assert.equal(h.requests[2].signal.aborted, true);
  assert.equal(h.timerCount, 0);
  h.respond(2, [{ brand_name: 'google', total: 1 }]);
  await h.advance(0);
  assert.deepEqual(h.snapshot(), [['google', 30000]], 'cleanup ignores a late in-flight replacement');
});
