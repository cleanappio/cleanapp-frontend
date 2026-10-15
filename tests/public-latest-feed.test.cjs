const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(relative, globals = {}, replacements = {}) {
  const filename = path.resolve(__dirname, relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, module: { exports }, Error, process,
    require: name => name in replacements ? replacements[name] : require(name), ...globals,
  }, { filename });
  return exports;
}

const flush = () => new Promise(resolve => setImmediate(resolve));
function eventTarget() {
  const listeners = new Map();
  return {
    addEventListener(name, fn) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); },
    removeEventListener(name, fn) { listeners.get(name)?.delete(fn); },
    dispatch(name) { for (const fn of listeners.get(name) || []) fn(); },
    get listenerCount() { return [...listeners.values()].reduce((sum, set) => sum + set.size, 0); },
  };
}

function harness(loader, visibility = 'visible') {
  let now = 0;
  let nextId = 0;
  const timers = new Map();
  const window = eventTarget();
  const document = Object.assign(eventTarget(), { visibilityState: visibility });
  const snapshots = [];
  const calls = [];
  function timer(fn, delay, interval) {
    const id = ++nextId;
    timers.set(id, { fn, at: now + delay, interval });
    return id;
  }
  class Clock extends Date { static now() { return now; } }
  const { startPublicLatestFeed } = load('../src/lib/public-latest-feed.ts', {
    window, document, AbortController, Date: Clock,
    setTimeout: (fn, delay) => timer(fn, delay), clearTimeout: id => timers.delete(id),
    setInterval: (fn, delay) => timer(fn, delay, delay), clearInterval: id => timers.delete(id),
  });
  const feed = startPublicLatestFeed(signal => {
    calls.push({ signal, at: now });
    return loader(signal, calls.length);
  }, snapshot => snapshots.push(snapshot));
  return {
    feed, calls, snapshots, window, document,
    get latest() { return snapshots.at(-1); },
    get timerCount() { return timers.size; },
    async advance(ms) {
      const target = now + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        const [id, item] = due;
        now = item.at;
        if (item.interval) item.at += item.interval;
        else timers.delete(id);
        item.fn();
        await flush();
      }
      now = target;
      await flush();
    },
  };
}

const card = token => ({ discovery_token: token, title: 'New web report', classification: 'physical', severity_level: 0.4 });

test('visible feed refreshes every 30s, pauses hidden, and refreshes when visible again', async () => {
  const h = harness(async () => ({ items: [card('first')] }));
  await flush();
  assert.equal(h.calls.length, 1);
  assert.equal(h.latest.items[0].title, 'New web report');
  assert.equal(h.latest.items[0].latitude, undefined, 'unlocated reports remain in Latest');
  await h.advance(29_999);
  assert.equal(h.calls.length, 1);
  await h.advance(1);
  assert.equal(h.calls.length, 2);
  h.document.visibilityState = 'hidden';
  h.document.dispatch('visibilitychange');
  h.window.dispatch('focus');
  await h.advance(60_000);
  assert.equal(h.calls.length, 2, 'background tab must not keep polling');
  h.document.visibilityState = 'visible';
  h.document.dispatch('visibilitychange');
  await flush();
  assert.equal(h.calls.length, 3);
  h.feed.close();
});

test('initial hidden mount waits; focus and online refresh are bounded and coalesced', async () => {
  const h = harness(async () => ({ items: [] }), 'hidden');
  assert.equal(h.calls.length, 0);
  h.document.visibilityState = 'visible';
  h.document.dispatch('visibilitychange');
  await flush();
  h.window.dispatch('focus');
  h.window.dispatch('online');
  h.feed.refresh();
  await h.advance(4_999);
  assert.equal(h.calls.length, 1);
  await h.advance(1);
  assert.equal(h.calls.length, 2, 'all wake signals share a single trailing refresh');
  h.feed.close();
});

test('live invalidation bursts never overlap requests and trailing refresh reconciles a full snapshot', async () => {
  const pending = [];
  const h = harness(() => new Promise(resolve => pending.push(resolve)));
  h.feed.refresh(); h.feed.refresh(); h.feed.refresh();
  assert.equal(h.calls.length, 1);
  await h.advance(1_000);
  pending.shift()({ items: [card('rotating-token-a')] });
  await flush();
  await h.advance(3_999);
  assert.equal(h.calls.length, 1);
  await h.advance(1);
  assert.equal(h.calls.length, 2);
  pending.shift()({ items: [card('rotating-token-b')] });
  await flush();
  assert.equal(h.latest.items.length, 1, 'HTTP snapshots replace cards rather than merging random discovery tokens');
  assert.equal(h.latest.items[0].discovery_token, 'rotating-token-b');
  h.feed.close();
});

test('temporary refresh failure retains the last successful rows and recovery replaces them', async () => {
  const h = harness(async (_signal, count) => {
    if (count === 2) throw new Error('Request failed: 503');
    return { items: [card(count === 1 ? 'saved' : 'recovered')] };
  });
  await flush();
  await h.advance(5_000);
  h.feed.refresh();
  await flush();
  assert.equal(h.latest.loading, false);
  assert.match(h.latest.error, /503/);
  assert.equal(h.latest.items[0].discovery_token, 'saved');
  await h.advance(5_000);
  h.feed.refresh();
  await flush();
  assert.equal(h.latest.error, null);
  assert.equal(h.latest.items[0].discovery_token, 'recovered');
  h.feed.close();
});

test('15s deadline aborts stalled loading and a late old response cannot replace recovery', async () => {
  let oldResolve;
  const h = harness((_signal, count) => count === 1
    ? new Promise(resolve => { oldResolve = resolve; })
    : Promise.resolve({ items: [card('current')] }));
  await h.advance(14_999);
  assert.equal(h.calls[0].signal.aborted, false);
  await h.advance(1);
  assert.equal(h.calls[0].signal.aborted, true);
  assert.equal(h.latest.loading, false);
  assert.match(h.latest.error, /timed out/);
  h.feed.refresh();
  await flush();
  oldResolve({ items: [card('stale')] });
  await flush();
  assert.equal(h.latest.items[0].discovery_token, 'current');
  h.feed.close();
});

test('scope cleanup aborts loading, removes lifecycle listeners, and ignores late results', async () => {
  let finish;
  const h = harness(() => new Promise(resolve => { finish = resolve; }));
  h.feed.refresh();
  const before = h.snapshots.length;
  h.feed.close();
  assert.equal(h.calls[0].signal.aborted, true);
  assert.equal(h.timerCount, 0);
  assert.equal(h.window.listenerCount, 0);
  assert.equal(h.document.listenerCount, 0);
  finish({ items: [card('old-tab')] });
  await flush();
  h.feed.refresh();
  h.window.dispatch('focus');
  await h.advance(60_000);
  assert.equal(h.snapshots.length, before);
  assert.equal(h.calls.length, 1);
});

const { default: PublicLatestReports } = load('../src/components/PublicLatestReports.tsx', {}, {
  '@/lib/i18n': { useTranslations: () => ({ t: key => key }) },
  './GlobeView': { useIsMobile: () => false },
});
test('Latest keeps readable saved rows during a refresh failure, but reports initial failures', () => {
  const render = props => renderToStaticMarkup(React.createElement(PublicLatestReports, { loading: false, onItemClick() {}, ...props }));
  const saved = render({ items: [card('saved')], error: 'Request failed: 503' });
  assert.match(saved, /New web report/);
  assert.match(saved, /role="status"/);
  assert.match(saved, /Showing the last update/);
  const initial = render({ items: [], error: 'Request failed: 503' });
  assert.match(initial, /Request failed: 503/);
  assert.doesNotMatch(initial, /noReportsFound|Showing the last update/);
});
