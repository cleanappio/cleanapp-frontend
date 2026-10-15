const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, invoke, response, flush } = require('./seo-harness.cjs');
const file = 'src/pages/sitemap-brands.xml.tsx';

test('brand sitemap validates and deduplicates public rows, escapes XML and omits invented lastmod', async () => {
  const h = harness(async () => response(200, [
    { brand_name: 'openai', total: 2 }, { brand_name: 'OpenAI', total: 4 },
    { brand_name: "a&b'", total: 1, classification: 'digital' }, { brand_name: 'empty', total: 0 },
    { brand_name: 'invalid', total: '100' }, null,
  ]));
  const result = await invoke(h.load(file).getServerSideProps);
  assert.equal(result.status, 200); assert.equal((result.body.match(/<loc>/g) || []).length, 2);
  assert.match(result.body, /https:\/\/www.cleanapp.io\/digital\/openai/);
  assert.match(result.body, /a%26b&apos;/);
  assert.equal(result.body.includes('<lastmod>'), false);
  assert.equal(result.body.includes('/digital/invalid'), false);
});

test('initial outages or malformed shapes return 503/no-store, never empty success for an hour', async () => {
  for (const backend of [response(503, null), response(200, { error: 'unavailable' }), response(200, [{}])]) {
    const h = harness(async () => backend);
    const result = await invoke(h.load(file).getServerSideProps);
    assert.equal(result.status, 503); assert.equal(result.headers['Cache-Control'], 'no-store');
    assert.equal(result.headers['Retry-After'], '60'); assert.equal(result.body.includes('<urlset'), false);
  }
});

test('temporary outage retains last successful XML with short cache and bounded retry interval', async () => {
  let calls = 0;
  const h = harness(async () => { calls++; return response(200, [{ brand_name: 'openai', total: 2 }]); });
  const handler = h.load(file).getServerSideProps;
  const original = await invoke(handler);
  h.advance(3_600_001); h.setFetch(async () => { calls++; return response(503, null); });
  const stale = await invoke(handler);
  assert.equal(stale.body, original.body); assert.match(stale.headers['Cache-Control'], /s-maxage=60,/);
  h.advance(30_000); await invoke(handler); assert.equal(calls, 2);
  h.advance(30_001); h.setFetch(async () => { calls++; return response(200, [{ brand_name: 'claude', total: 1 }]); });
  const recovered = await invoke(handler);
  assert.equal(calls, 3); assert.match(recovered.body, /\/digital\/claude/);
});

test('sitemap body stalls are bounded and fail unavailable without a success cache', async () => {
  const h = harness(async () => ({ status: 200, ok: true, json: () => new Promise(() => {}) }));
  const request = invoke(h.load(file).getServerSideProps);
  await flush(); h.advance(6000);
  const result = await request;
  assert.equal(result.status, 503); assert.equal(h.pendingTimers, 0);
});
