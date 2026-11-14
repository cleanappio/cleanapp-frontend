const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { harness, flush } = require('./seo-harness.cjs');
const id = 'rpt_1234567890123456789012';
const brand = { brand_found: true, brand_name: 'grok', brand_display_name: 'Grok', classification: 'digital', evidence_kind: 'firsthand', reports: [] };
const report = { report: { public_id: id, image: 'PRIVATE_IMAGE', private_notes: 'PRIVATE_NOTE' }, analysis: [{ language: 'en', classification: 'digital', title: 'Answer ignores the supplied context', brand_display_name: 'Grok' }], evidence: { report_kind: 'firsthand' } };
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status });

test('image URLs key the canonical page and renderer version without receipt or tracking tokens', () => {
  const { socialImageUrl } = harness().load('src/lib/seo.ts');
  const url = new URL(socialImageUrl('/digital/grok?receipt=PRIVATE_TOKEN#private'));
  assert.equal(url.origin, 'https://www.cleanapp.io');
  assert.equal(url.pathname, '/social-preview');
  assert.equal(url.searchParams.get('path'), '/digital/grok');
  assert.equal(url.searchParams.get('v'), '1');
  assert.equal(url.href.includes('PRIVATE'), false);
});

test('canonical paths normalize locale/trailing slash and reject URLs, encoded traversal and query secrets', () => {
  const { normalizePreviewPath: normalize } = harness().load('src/lib/server/social-preview.ts');
  assert.equal(normalize('/me/digital/grok/'), '/digital/grok');
  assert.equal(normalize('/en'), '/');
  for (const input of [undefined, ['/', '/agents'], 'https://attacker.test', '//attacker.test', '/%2e%2e/private', '/a/../b', '/digital%3fgrok', '/a?token=secret', '/a#token', '/a\\b', '/a%00b', '/' + 'a'.repeat(513)]) assert.equal(normalize(input), null, String(input));
});

test('page purpose changes the artwork: report hub, single report, agent guide and editorial article', async () => {
  const h = harness(async url => reply(url.includes('brand-preview') ? brand : report));
  const { resolveSocialPreview: resolve } = h.load('src/lib/server/social-preview.ts');
  const hub = await resolve('/digital/grok');
  assert.equal(hub.title, 'GROK'); assert.equal(hub.kind, 'brand');
  assert.equal(hub.label, 'DIGITAL · PUBLIC REPORTS'); assert.equal(hub.dynamic, true);
  const individual = await resolve(`/digital/report/${id}`);
  assert.equal(individual.kind, 'digital'); assert.equal(individual.title, report.analysis[0].title);
  assert.equal(JSON.stringify(individual).includes('PRIVATE_'), false);
  assert.equal((await resolve('/agents')).kind, 'agents');
  assert.equal((await resolve('/blog/best-incident-reporting-apps')).kind, 'editorial');
  assert.equal((await resolve('/report-a-pothole')).kind, 'physical');
  assert.equal((await resolve('/solutions/brands')).kind, 'organization');
});

test('dynamic cards use only fixed first-party public readers, omit credentials and validate identity', async () => {
  const h = harness(async (url, options) => {
    assert.equal(new URL(url).origin, 'https://live.example');
    assert.equal(options.credentials, 'omit'); assert.equal(options.cache, 'no-store'); assert.equal(options.redirect, 'error');
    return reply({ ...brand, brand_name: 'other' });
  });
  const { resolveSocialPreview: resolve, PreviewUnavailable } = h.load('src/lib/server/social-preview.ts');
  await assert.rejects(resolve('/digital/grok'), PreviewUnavailable);
  assert.equal(h.pendingTimers, 0);
});

test('private, revoked and mismatched reports never render their text; transient failures stay retryable', async () => {
  const h = harness();
  const { resolveSocialPreview: resolve, PreviewMissing, PreviewUnavailable } = h.load('src/lib/server/social-preview.ts');
  for (const raw of [{ ...report, visibility: 'private' }, { ...report, report: { ...report.report, is_public: false } }]) {
    h.setFetch(async () => reply(raw)); await assert.rejects(resolve(`/digital/report/${id}`), PreviewMissing);
  }
  h.setFetch(async () => reply(report));
  await assert.rejects(resolve(`/physical/report/${id}`), PreviewMissing);
  for (const status of [404, 410]) { h.setFetch(async () => reply(null, status)); await assert.rejects(resolve(`/digital/report/${id}`), PreviewMissing); }
  for (const status of [429, 503]) { h.setFetch(async () => reply(null, status)); await assert.rejects(resolve(`/digital/report/${id}`), PreviewUnavailable); }
  h.setFetch(async () => reply({ ...brand, visibility: 'shadow' })); await assert.rejects(resolve('/digital/grok'), PreviewMissing);
});

test('a stalled fetch or oversized response cannot tie up the renderer indefinitely', async () => {
  const h = harness(async () => new Promise(() => {}));
  const { resolveSocialPreview: resolve, PreviewUnavailable } = h.load('src/lib/server/social-preview.ts');
  const request = resolve('/digital/grok'); await flush(); h.advance(4000);
  await assert.rejects(request, PreviewUnavailable); assert.equal(h.pendingTimers, 0);
  h.setFetch(async () => new Response('{}', { headers: { 'content-length': String(9 * 1024 * 1024) } }));
  await assert.rejects(resolve('/digital/grok'), PreviewUnavailable);
});

test('case and workspace art does not read authenticated content or echo unverified path text', async () => {
  const h = harness(async () => { throw new Error('must not fetch'); });
  const { resolveSocialPreview: resolve } = h.load('src/lib/server/social-preview.ts');
  assert.equal((await resolve('/cases/PRIVATE_ID')).kind, 'case');
  for (const path of ['/cases/PRIVATE_ID', '/dashboard', '/billing', '/unknown-PRIVATE_PATH']) assert.equal(JSON.stringify(await resolve(path)).includes('PRIVATE'), false);
});

test('real PNG rendering is correctly sized, bounded, distinct across themes and safe for markup/unicode', async () => {
  const h = harness();
  const { renderSocialImage: render, escapePreviewText: escape } = h.load('src/lib/server/social-image.ts');
  const { staticSocialPreview: descriptor } = h.load('src/lib/server/social-preview.ts');
  assert.equal(escape('<span>&"\u202e'), '&lt;span&gt;&amp;&quot;');
  const outputs = [];
  for (const path of ['/', '/agents', '/report-a-pothole', '/blog/best-incident-reporting-apps']) {
    const png = await render(descriptor(path)); const info = await sharp(png).metadata();
    assert.equal(info.format, 'png'); assert.equal(info.width, 1200); assert.equal(info.height, 630); assert.ok(png.length < 512 * 1024);
    outputs.push(png.toString('base64'));
  }
  assert.equal(new Set(outputs).size, outputs.length);
  const unusual = await render({ ...descriptor('/agents'), title: '<b>Long & multilingual café — 日本語</b> '.repeat(20), label: 'A'.repeat(500) });
  assert.equal((await sharp(unusual).metadata()).width, 1200);
});

async function invokeApi(handler, path, method = 'GET') {
  const result = { headers: {}, status: 0 };
  const res = { setHeader(k, v) { result.headers[k] = v; }, status(v) { result.status = v; return this; }, end() { return result; }, send(body) { result.body = body; return result; } };
  await handler({ method, query: { path } }, res); return result;
}

test('API rechecks a dynamic report after revocation instead of serving stale cached text', async () => {
  const h = harness(async () => reply(report));
  const handler = h.load('src/pages/api/share-image.ts').default;
  const first = await invokeApi(handler, `/digital/report/${id}`);
  assert.equal(first.status, 200); assert.equal(first.headers['Content-Type'], 'image/png'); assert.match(first.headers['Cache-Control'], /no-store/);
  h.setFetch(async () => reply({ ...report, visibility: 'private' }));
  const hidden = await invokeApi(handler, `/digital/report/${id}`);
  assert.equal(hidden.status, 404); assert.equal(hidden.body, undefined); assert.match(hidden.headers['Cache-Control'], /no-store/);
});

test('API rejects unsupported methods and malformed paths; static HEAD has correct MIME/length/cache', async () => {
  const h = harness(async () => { throw new Error('must not fetch'); });
  const handler = h.load('src/pages/api/share-image.ts').default;
  assert.equal((await invokeApi(handler, '/agents', 'POST')).status, 405);
  assert.equal((await invokeApi(handler, 'https://attacker.test')).status, 400);
  const head = await invokeApi(handler, '/agents', 'HEAD');
  assert.equal(head.status, 200); assert.equal(head.headers['Content-Type'], 'image/png'); assert.ok(head.headers['Content-Length'] > 1000); assert.equal(head.body, undefined); assert.match(head.headers['Cache-Control'], /public/);
});
