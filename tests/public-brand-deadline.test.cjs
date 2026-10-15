const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const file = path.resolve(__dirname, '../src/lib/public-discovery-api.ts');
const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function harness(fetch) {
  let now = 0;
  let nextTimer = 0;
  let cleared = 0;
  const timers = new Map();
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, module: { exports }, process: { env: {} }, URL, AbortController, fetch,
    setTimeout(callback, delay) {
      const id = ++nextTimer;
      timers.set(id, { callback, at: now + delay });
      return id;
    },
    clearTimeout(id) { cleared += 1; timers.delete(id); },
  }, { filename: file });
  return {
    api: exports,
    get pendingTimers() { return timers.size; },
    get clearedTimers() { return cleared; },
    advance(ms) {
      now += ms;
      for (const [id, timer] of timers) {
        if (timer.at <= now) { timers.delete(id); timer.callback(); }
      }
    },
  };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('brand deadline rejects stalled headers at 20s and aborts once without retry', async () => {
  let calls = 0;
  let signal;
  const h = harness((_url, options) => {
    calls += 1; signal = options.signal;
    return new Promise(() => {});
  });
  const request = h.api.fetchPublicBrandReports('openai', 'en');
  assert.ok(signal, 'brand request must expose an abort signal');
  const rejected = assert.rejects(request, /timed out/i);
  let settled = false;
  request.then(() => { settled = true; }, () => { settled = true; });
  h.advance(19_999);
  await flush();
  assert.equal(settled, false);
  assert.equal(signal.aborted, false);
  h.advance(1);
  await rejected;
  assert.equal(signal.aborted, true);
  assert.equal(calls, 1);
  assert.equal(h.pendingTimers, 0);
  assert.equal(h.clearedTimers, 1);
});

test('brand deadline includes a stalled JSON body after successful headers', async () => {
  let signal;
  let bodyStarted = false;
  const h = harness(async (_url, options) => {
    signal = options.signal;
    return { ok: true, json: () => { bodyStarted = true; return new Promise(() => {}); } };
  });
  const request = h.api.fetchPublicBrandReports('claude', 'en');
  await flush();
  assert.equal(bodyStarted, true);
  assert.equal(h.pendingTimers, 1, 'headers must not clear the body deadline');
  const rejected = assert.rejects(request, /timed out/i);
  h.advance(20_000);
  await rejected;
  assert.equal(signal.aborted, true);
  assert.equal(h.pendingTimers, 0);
  assert.equal(h.clearedTimers, 1);
});

test('successful brand body clears timer and preserves filters and response', async () => {
  let signal;
  let finishBody;
  const body = { reports: [], total_count: 4, has_more: true };
  const h = harness(async (url, options) => {
    const parsed = new URL(url);
    assert.equal(parsed.pathname, '/api/v3/public/discovery/by-brand');
    assert.equal(parsed.searchParams.get('kind'), 'coverage');
    assert.equal(parsed.searchParams.get('offset'), '12');
    assert.equal(options.cache, 'no-store');
    signal = options.signal;
    return { ok: true, json: () => new Promise(resolve => { finishBody = resolve; }) };
  });
  const request = h.api.fetchPublicBrandReports('openai', 'en', 12, { kind: 'coverage', offset: 12 });
  await flush();
  h.advance(19_999);
  finishBody(body);
  assert.equal(await request, body);
  assert.equal(h.pendingTimers, 0);
  assert.equal(h.clearedTimers, 1);
  h.advance(1);
  assert.equal(signal.aborted, false);
});

test('HTTP and JSON failures clear the deadline and remain normal errors', async () => {
  for (const response of [
    { ok: false, status: 503 },
    { ok: true, json: async () => { throw new SyntaxError('Invalid response JSON'); } },
  ]) {
    let calls = 0;
    const h = harness(async () => { calls += 1; return response; });
    await assert.rejects(h.api.fetchPublicBrandReports('grok', 'en'), response.ok ? /Invalid response JSON/ : /503/);
    assert.equal(h.pendingTimers, 0);
    assert.equal(h.clearedTimers, 1);
    assert.equal(calls, 1);
  }
});

test('other discovery requests retain their existing behavior without deadline', async () => {
  let finishFetch;
  let signal;
  const h = harness((_url, options) => {
    signal = options.signal;
    return new Promise(resolve => { finishFetch = resolve; });
  });
  const request = h.api.fetchPublicLatest('digital', 'en');
  assert.equal(signal, undefined);
  assert.equal(h.pendingTimers, 0);
  h.advance(20_000);
  finishFetch({ ok: true, json: async () => ({ reports: [] }) });
  assert.deepEqual(await request, { reports: [] });
  assert.equal(h.clearedTimers, 0);
});

test('Latest forwards controller cancellation and preserves selected scope without caching', async () => {
  const controller = new AbortController();
  const h = harness(async (url, options) => {
    const parsed = new URL(url);
    assert.equal(parsed.pathname, '/api/v3/public/discovery/last');
    assert.equal(parsed.searchParams.get('classification'), 'digital');
    assert.equal(parsed.searchParams.get('lang'), 'en');
    assert.equal(parsed.searchParams.get('n'), '10');
    assert.equal(options.signal, controller.signal);
    assert.equal(options.cache, 'no-store');
    return { ok: true, json: async () => ({ items: [] }) };
  });
  assert.deepEqual(await h.api.fetchPublicLatest('digital', 'en', 10, controller.signal), { items: [] });
});
