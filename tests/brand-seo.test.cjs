const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, invoke, response, flush } = require('./seo-harness.cjs');
const row = { classification: 'digital', discovery_token: 'private-token-not-props', brand_name: 'openai', brand_display_name: 'OpenAI', total: 3, internal_notes: 'PRIVATE_SENTINEL' };

test('brand SSR verifies public summary presence without loading evidence briefings or serializing counts', async () => {
  const h = harness(async (url, options) => {
    const parsed = new URL(url);
    assert.equal(parsed.pathname, '/api/v3/public/discovery/brands/summary');
    assert.equal(parsed.searchParams.get('classification'), 'digital');
    assert.equal(parsed.searchParams.get('lang'), 'en');
    assert.equal(parsed.searchParams.has('brand_name'), false);
    assert.equal(options.credentials, 'omit'); assert.equal(options.cache, 'no-store');
    return response(200, [{ brand_name: 'other', total: 10, classification: 'digital' }, row]);
  });
  const result = await invoke(h.load('src/lib/brand-seo.ts').getBrandSeoProps, { brand_name: 'openai' });
  assert.equal(result.page.props.seo.title, 'OpenAI reports | CleanApp');
  assert.equal(result.page.props.seo.found, true); assert.equal(result.page.props.seo.path, '/digital/openai');
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.equal(JSON.stringify(result.page).includes('PRIVATE_SENTINEL'), false);
  assert.equal(JSON.stringify(result.page).includes('private-token-not-props'), false);
  assert.equal('total' in result.page.props.seo, false);
  // Older public summary rows may omit classification; the request is explicitly digital.
  h.setFetch(async () => response(200, [{ ...row, classification: undefined }]));
  assert.equal((await invoke(h.load('src/lib/brand-seo.ts').getBrandSeoProps, { brand_name: 'OpenAI' })).page.props.seo.found, true);
});

test('unknown, zero-count, malformed, nonpublic or unavailable public brand summaries remain noindex', async () => {
  for (const data of [null, [], {}, { items: [row] }, [null, {}], [{ ...row, brand_name: 'other' }],
    [{ ...row, classification: 'physical' }], [{ ...row, classification: null }], [{ ...row, is_public: false }],
    [{ ...row, visibility: 'private' }], ...[0, -1, 1.5, '3', null, Infinity, NaN].map(total => [{ ...row, total }])]) {
    const h = harness(async () => response(200, data));
    const result = await invoke(h.load('src/lib/brand-seo.ts').getBrandSeoProps, { brand_name: 'openai' });
    assert.equal(result.page.props.seo.found, false);
  }
  for (const status of [403, 404, 429, 503]) {
    const h = harness(async () => response(status, [row]));
    assert.equal((await invoke(h.load('src/lib/brand-seo.ts').getBrandSeoProps, { brand_name: 'openai' })).page.props.seo.found, false);
  }
  const h = harness(async () => ({ status: 200, ok: true, json: () => new Promise(() => {}) }));
  const request = invoke(h.load('src/lib/brand-seo.ts').getBrandSeoProps, { brand_name: 'openai' });
  await flush(); h.advance(4000);
  assert.equal((await request).page.props.seo.found, false); assert.equal(h.pendingTimers, 0);
});
