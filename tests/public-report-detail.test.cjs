const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const file = path.resolve(__dirname, '../src/pages/api/reports/by-public-id.ts');
const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
function harness(fetch) {
  const exports = {};
  vm.runInNewContext(compiled, { exports, module: {exports}, process: {env: {NEXT_PUBLIC_LIVE_API_URL: 'https://live.example'}}, fetch }, {filename: file});
  return async (query = {public_id: 'public-id'}, method = 'GET') => {
    const result = {headers: {}};
    const response = {
      setHeader(name, value) { result.headers[name] = value; },
      status(status) { result.status = status; return this; },
      json(body) { result.body = body; return this; },
    };
    await exports.default({method, query}, response);
    return result;
  };
}
const response = (status, body) => ({ok: status >= 200 && status < 300, status, headers: {get: () => 'application/json'}, text: async () => JSON.stringify(body)});
test('canonical v3 response preserves evidence and recurrence', async () => {
  const calls = [];
  const run = harness(async (url, options) => {
    calls.push(url);
    assert.equal(options.cache, 'no-store');
    return response(200, {evidence: {report_kind: 'firsthand', excerpt: 'original author wording'}, recurrence: {supporting_report_count: 1}});
  });
  const result = await run({public_id: 'id /?&'});
  assert.deepEqual(calls, ['https://live.example/api/v3/reports/by-public-id?public_id=id%20%2F%3F%26']);
  assert.equal(result.status, 200);
  assert.equal(result.body.evidence.excerpt, 'original author wording');
  assert.equal(result.body.recurrence.supporting_report_count, 1);
  assert.equal(result.headers['Cache-Control'], 'no-store');
});
test('legacy fallback is restricted to missing route statuses', async () => {
  for (const status of [404, 405]) {
    const calls = [];
    const run = harness(async url => { calls.push(url); return response(calls.length === 1 ? status : 200, {report: {public_id: 'public-id'}}); });
    assert.equal((await run()).status, 200);
    assert.equal(calls.length, 2);
    assert.match(calls[0], /\/api\/v3\//);
    assert.match(calls[1], /\/api\/v4\//);
  }
  for (const status of [401, 403, 429, 500, 503]) {
    let calls = 0;
    const run = harness(async () => { calls++; return response(status, {error: 'denied or unavailable'}); });
    const result = await run();
    assert.equal(result.status, status);
    assert.equal(calls, 1);
    assert.equal(result.headers['Cache-Control'], 'no-store');
  }
});
test('every request rechecks evidence and visibility instead of caching a body', async () => {
  let calls = 0;
  const run = harness(async () => {
    calls++;
    if (calls === 1) return response(200, {evidence: {excerpt: 'first'}});
    if (calls === 2) return response(200, {evidence: {excerpt: 'updated'}});
    return response(404, {error: 'Report not found'});
  });
  assert.equal((await run()).body.evidence.excerpt, 'first');
  assert.equal((await run()).body.evidence.excerpt, 'updated');
  const revoked = await run();
  assert.equal(revoked.status, 404);
  assert.equal(revoked.body.evidence, undefined);
  assert.equal(calls, 4);
});
test('invalid input makes no request and transport failures remain uncached', async () => {
  let calls = 0;
  const run = harness(async () => { calls++; throw new Error('transport unavailable'); });
  assert.equal((await run({}, 'GET')).status, 400);
  assert.equal((await run({public_id: 'id'}, 'POST')).status, 405);
  assert.equal(calls, 0);
  for (let i = 0; i < 2; i++) {
    const result = await run();
    assert.equal(result.status, 500);
    assert.equal(result.headers['Cache-Control'], 'no-store');
  }
  assert.equal(calls, 2);
});
