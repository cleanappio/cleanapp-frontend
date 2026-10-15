const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, invoke, response, flush } = require('./seo-harness.cjs');
const row = { classification: 'digital', discovery_token: 'private-token-not-props', brand_name: 'openai', brand_display_name: 'OpenAI', title: 'An observed error', summary: 'PRIVATE_SENTINEL' };

test('brand SSR verifies existing public discovery and returns only neutral brand metadata', async () => {
  const h = harness(async (url, options) => {
    const parsed = new URL(url);
    assert.equal(parsed.pathname, '/api/v3/public/discovery/by-brand');
    assert.equal(parsed.searchParams.get('brand_name'), 'openai');
    assert.equal(parsed.searchParams.get('kind'), 'all');
    assert.equal(options.credentials, 'omit'); assert.equal(options.cache, 'no-store');
    return response(200, { items: [row], scope: { brand_name: 'openai' }, subscriber_data: 'PRIVATE_SENTINEL' });
  });
  const result = await invoke(h.load('src/lib/brand-seo.ts').getBrandSeoProps, { brand_name: 'openai' });
  assert.equal(result.page.props.seo.title, 'OpenAI reports | CleanApp');
  assert.equal(result.page.props.seo.found, true); assert.equal(result.page.props.seo.path, '/digital/openai');
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.equal(JSON.stringify(result.page).includes('PRIVATE_SENTINEL'), false);
  assert.equal(JSON.stringify(result.page).includes('private-token-not-props'), false);
});

test('brand failures, empty reports, mismatched scope and nonpublic response shapes remain noindex', async () => {
  for (const data of [null, [], {}, { items: [] }, { items: [{ ...row, brand_name: 'other' }] },
    { items: [{ ...row, classification: 'physical' }] }, { items: [row], is_public: false },
    { items: [row], visibility: 'private' }, { items: [row], scope: { brand_name: 'other' } }]) {
    const h = harness(async () => response(200, data));
    const result = await invoke(h.load('src/lib/brand-seo.ts').getBrandSeoProps, { brand_name: 'openai' });
    assert.equal(result.page.props.seo.found, false);
  }
  const h = harness(async () => ({ status: 200, ok: true, json: () => new Promise(() => {}) }));
  const request = invoke(h.load('src/lib/brand-seo.ts').getBrandSeoProps, { brand_name: 'openai' });
  await flush(); h.advance(4000);
  assert.equal((await request).page.props.seo.found, false); assert.equal(h.pendingTimers, 0);
});
