const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../src/pages/api/reports/by-seq.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const response = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data });

function harness(fetch) {
  const exports = {};
  vm.runInNewContext(compiled, { exports, module: { exports }, fetch, AbortSignal,
    process: { env: { NEXT_PUBLIC_LIVE_API_URL: 'https://live.example' } },
  }, { filename });
  return async (query = { seq: '1280207' }, method = 'GET') => {
    const result = { headers: {} };
    const res = {
      setHeader(key, value) { result.headers[key] = value; },
      status(status) { result.status = status; return this; },
      json(body) { result.body = body; return this; },
    };
    await exports.default({ query, method }, res);
    return result;
  };
}

test('numeric report details always recheck notification counts, redaction and visibility', async () => {
  const calls = [];
  const run = harness(async (url, options) => {
    calls.push(url);
    assert.equal(options.cache, 'no-store');
    if (calls.length === 1) return response(200, { analysis: [{ inferred_contact_emails: '' }], notification_summary: { email_count: 4 } });
    if (calls.length === 2) return response(200, { analysis: [{ inferred_contact_emails: '' }], notification_summary: { email_count: 5 } });
    return response(404, { error: 'Report not found' });
  });
  const first = await run();
  const updated = await run();
  const revoked = await run();
  assert.equal(first.body.notification_summary.email_count, 4);
  assert.equal(updated.body.notification_summary.email_count, 5);
  assert.equal(updated.body.analysis[0].inferred_contact_emails, '');
  assert.equal(revoked.status, 404);
  assert.equal(revoked.body.notification_summary, undefined);
  assert.equal(calls.length, 4);
  for (const result of [first, updated, revoked]) assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.equal(calls[0], 'https://live.example/api/v3/reports/by-seq?seq=1280207');
});

test('numeric detail falls back only when the primary route is missing', async () => {
  for (const status of [404, 405]) {
    const calls = [];
    const run = harness(async (url) => { calls.push(url); return response(calls.length === 1 ? status : 200, { report: { seq: 1280207 } }); });
    assert.equal((await run()).status, 200);
    assert.deepEqual(calls, [
      'https://live.example/api/v3/reports/by-seq?seq=1280207',
      'https://live.example/api/v4/reports/by-seq?seq=1280207',
    ]);
  }
  for (const status of [401, 403, 429, 500, 503]) {
    let calls = 0;
    const run = harness(async () => { calls++; return response(status, { private: 'not forwarded' }); });
    const result = await run();
    assert.equal(result.status, status);
    assert.equal(result.headers['Cache-Control'], 'no-store');
    assert.equal(result.body.private, undefined);
    assert.equal(calls, 1);
  }
});

test('numeric detail rejects invalid input and never caches transport errors', async () => {
  let calls = 0;
  const run = harness(async () => { calls++; throw new Error('transport unavailable'); });
  for (const seq of ['', '0', '-1', '1&private=1', 'abc', ['1280207']]) {
    const result = await run({ seq });
    assert.equal(result.status, 400);
    assert.equal(result.headers['Cache-Control'], 'no-store');
  }
  assert.equal((await run({ seq: '1280207' }, 'POST')).status, 405);
  assert.equal(calls, 0);
  for (let index = 0; index < 2; index++) {
    const result = await run();
    assert.equal(result.status, 500);
    assert.equal(result.headers['Cache-Control'], 'no-store');
  }
  assert.equal(calls, 2);
});
