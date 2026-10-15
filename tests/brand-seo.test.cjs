const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, invoke, response, flush } = require('./seo-harness.cjs');
const id = 'rpt_1234567890123456789012';
const row = { public_id: id, canonical_path: `/digital/report/${id}`, title: 'Checkout failed', summary: 'The pay button did not respond.', report_kind: 'firsthand', excerpt: 'I cannot pay.\nThe screen is frozen.', source_url: 'https://github.com/example/project/issues/1', intake_method: 'imported', latitude: 12, id: 'PRIVATE_ACTOR', contact: 'PRIVATE_CONTACT' };
const body = reports => ({ brand_found: true, brand_name: 'openai', brand_display_name: 'Openai', classification: 'digital', evidence_kind: 'firsthand', reports, internal_notes: 'PRIVATE_SENTINEL' });

test('brand SSR uses a bounded exact-brand preview, preserving Firsthand and canonical public links', async () => {
  const h = harness(async (url, options) => {
    const parsed = new URL(url);
    assert.equal(parsed.pathname, '/api/v3/public/discovery/brand-preview');
    assert.equal(parsed.searchParams.get('brand_name'), 'openai');
    assert.equal(parsed.searchParams.get('n'), '6');
    assert.equal(parsed.searchParams.get('evidence_kind'), 'firsthand');
    assert.equal(options.credentials, 'omit'); assert.equal(options.cache, 'no-store');
    return response(200, body([row]));
  });
  const result = await invoke(h.load('src/lib/brand-seo.ts').getBrandSeoProps, { brand_name: 'openai' });
  assert.equal(result.page.props.seo.title, 'OpenAI reports | CleanApp');
  assert.equal(result.page.props.seo.found, true); assert.equal(result.page.props.seo.path, '/digital/openai');
  assert.equal(result.headers['Cache-Control'], 'no-store');
  const preview = result.page.props.initialPreview;
  assert.equal(preview.kind, 'firsthand'); assert.equal(preview.counts_exact, false);
  assert.equal(preview.items[0].canonical_path, row.canonical_path);
  assert.equal(preview.items[0].evidence.excerpt, row.excerpt);
  assert.equal(preview.total_count, undefined);
  for (const secret of ['PRIVATE_', 'latitude', 'contact', 'public_id']) assert.equal(JSON.stringify(result.page).includes(secret), false, secret);
});

test('known public brand with no firsthand observations remains a truthful empty preview', async () => {
  const h = harness(async () => response(200, body([])));
  const result = await invoke(h.load('src/lib/brand-seo.ts').getBrandSeoProps, { brand_name: 'openai' });
  assert.equal(result.page.props.seo.found, true);
  assert.equal(result.page.props.initialPreview.items.length, 0);
  assert.equal(result.page.props.initialPreview.kind, 'firsthand');
});

test('preview rejects mismatched identities, non-firsthand rows, unsafe links and oversized batches', async () => {
  for (const report of [{ ...row, public_id: 'different' }, { ...row, canonical_path: 'https://attacker.example/report' }, { ...row, canonical_path: '/digital/report/rpt_short' }, { ...row, report_kind: 'coverage' }, { ...row, visibility: 'shadow' }]) {
    const h = harness(async () => response(200, body([report])));
    const result = await invoke(h.load('src/lib/brand-seo.ts').getBrandSeoProps, { brand_name: 'openai' });
    assert.equal(result.status, 503); assert.equal(result.page.props.initialPreview, null);
  }
  const reports = Array.from({ length: 12 }, (_, i) => ({ ...row, public_id: 'rpt_' + String(i).padStart(22, '0'), canonical_path: '/digital/report/rpt_' + String(i).padStart(22, '0') }));
  const h = harness(async () => response(200, body(reports)));
  assert.equal((await invoke(h.load('src/lib/brand-seo.ts').getBrandSeoProps, { brand_name: 'openai' })).page.props.initialPreview.items.length, 6);
});

test('absent and nonpublic brands stay missing; transient errors invite retry instead of noindex', async () => {
  for (const status of [400, 401, 403, 404, 410]) {
    const h = harness(async () => response(status, body([row])));
    assert.equal((await invoke(h.load('src/lib/brand-seo.ts').getBrandSeoProps, { brand_name: 'openai' })).page.notFound, true);
  }
  for (const data of [{ ...body([]), brand_found: false }, { ...body([row]), visibility: 'private' }]) {
    const h = harness(async () => response(200, data));
    assert.equal((await invoke(h.load('src/lib/brand-seo.ts').getBrandSeoProps, { brand_name: 'openai' })).page.notFound, true);
  }
  for (const status of [429, 500, 503]) {
    const h = harness(async () => response(status, body([row])));
    const result = await invoke(h.load('src/lib/brand-seo.ts').getBrandSeoProps, { brand_name: 'openai' });
    assert.equal(result.status, 503); assert.equal(result.headers['Retry-After'], '60'); assert.equal(result.page.props.seo.unavailable, true);
  }
  const h = harness(async () => ({ status: 200, ok: true, json: () => new Promise(() => {}) }));
  const request = invoke(h.load('src/lib/brand-seo.ts').getBrandSeoProps, { brand_name: 'openai' });
  await flush(); h.advance(4000);
  assert.equal((await request).status, 503); assert.equal(h.pendingTimers, 0);
});
