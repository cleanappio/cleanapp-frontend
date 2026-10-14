const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path').resolve(__dirname, '../src/lib/brand-report-inventory.ts');
const compiled = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const target = new Module(path, module);
target.paths = module.paths;
target._compile(compiled, path);
const { fetchBrandReportInventory } = target.exports;
const reports = (start, count) => Array.from({length: count}, (_, index) => ({report: {seq: start + index, public_id: `public-${start + index}`}, analysis: []}));

test('old 100-entry response keeps one request and original inventory totals', async () => {
  let calls = 0;
  const batch = await fetchBrandReportInventory(async (page) => {
    calls += 1;
    assert.equal(page.n, 100);
    assert.equal(page.offset, 0);
    return {reports: reports(1, 100), total_count: 234, high_priority_count: 10, medium_priority_count: 8};
  });
  assert.equal(calls, 1);
  assert.equal(batch.reports.length, 100);
  assert.equal(batch.total_count, 234);
  assert.equal(batch.high_priority_count, 10);
  assert.equal(batch.has_more, true);
});

test('short complete page does not request unavailable pages', async () => {
  let calls = 0;
  const batch = await fetchBrandReportInventory(async () => {
    calls += 1;
    return {reports: reports(1, 27), total_count: 27, has_more: false};
  });
  assert.equal(calls, 1);
  assert.equal(batch.reports.length, 27);
  assert.equal(batch.has_more, false);
});

test('capped backend returns 50 plus 50 while preserving first-page totals', async () => {
  const requests = [];
  const batch = await fetchBrandReportInventory(async (page) => {
    requests.push(page);
    return {reports: reports(page.offset + 1, 50), total_count: page.offset === 0 ? 150 : 151, high_priority_count: page.offset === 0 ? 7 : 9, has_more: true};
  });
  assert.deepEqual(requests, [{n:100, offset:0}, {n:50, offset:50}]);
  assert.equal(batch.reports.length, 100);
  assert.equal(batch.total_count, 150);
  assert.equal(batch.high_priority_count, 7);
  assert.equal(batch.has_more, true);
});

test('secondary page failure rejects the complete window', async () => {
  let calls = 0;
  await assert.rejects(fetchBrandReportInventory(async () => {
    calls += 1;
    if (calls === 2) throw new Error('Evidence service unavailable');
    return {reports: reports(1, 50), total_count: 100, has_more: true};
  }), /Evidence service unavailable/);
  assert.equal(calls, 2);
});

test('concurrent-insert overlap is deduplicated without filling more than two pages', async () => {
  let calls = 0;
  const batch = await fetchBrandReportInventory(async () => {
    calls += 1;
    return {reports: reports(calls === 1 ? 1 : 46, 50), total_count: 150, has_more: true};
  });
  assert.equal(calls, 2);
  assert.equal(batch.reports.length, 95);
  assert.equal(new Set(batch.reports.map(item => item.report.public_id)).size, 95);
  assert.equal(batch.has_more, true);
});
