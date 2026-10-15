const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, invoke, response, flush } = require('./seo-harness.cjs');
const body = (classification = 'digital') => ({ report: { public_id: 'rpt_sample', image: 'base64', private_notes: 'PRIVATE_SENTINEL' }, analysis: [{ language: 'en', classification, is_valid: false, title: 'Checkout failed', summary: 'The pay button did not respond.', brand_display_name: 'Example', analysis_text: 'PRIVATE_SENTINEL' }] });

test('report SSR derives public metadata only, with no-store request and response', async () => {
  const h = harness(async (url, options) => {
    assert.match(url, /\/api\/v3\/reports\/by-public-id\?public_id=rpt_sample$/);
    assert.equal(options.cache, 'no-store'); assert.equal(options.credentials, 'omit');
    return response(200, body());
  });
  const result = await invoke(h.load('src/lib/report-seo.ts').makeReportSeoProps('digital'), { public_id: 'rpt_sample' });
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.equal(result.page.props.seo.found, true);
  assert.equal(result.page.props.seo.title, 'Checkout failed – Example | CleanApp');
  assert.match(result.page.props.seo.image, /rawimage\/by-public-id\?public_id=rpt_sample$/);
  assert.equal(JSON.stringify(result.page).includes('PRIVATE_SENTINEL'), false);
  assert.equal(h.pendingTimers, 0);
});

test('report identity, visibility, valid analysis and classification must match before metadata is used', async () => {
  for (const data of [null, [], {}, { ...body(), report: { public_id: 'different' } },
    { ...body(), visibility: 'shadow' }, { ...body(), is_public: false },
    { ...body(), analysis: [{ title: 'PRIVATE_SENTINEL', classification: 'invented' }] },
    { ...body(), analysis: [{ title: '', classification: 'digital' }] },
    { ...body(), analysis: [null, {}] }]) {
    const h = harness(async () => response(200, data));
    const result = await invoke(h.load('src/lib/report-seo.ts').makeReportSeoProps('digital'), { public_id: 'rpt_sample' });
    assert.equal(result.page.props.seo.found, false);
    assert.equal(JSON.stringify(result.page).includes('PRIVATE_SENTINEL'), false);
    assert.equal(h.pendingTimers, 0);
  }
});

test('wrong report kind redirects to actual canonical route; actual 404 stays missing', async () => {
  const h = harness(async () => response(200, body('physical')));
  let result = await invoke(h.load('src/lib/report-seo.ts').makeReportSeoProps('digital'), { public_id: 'rpt_sample' });
  assert.equal(result.page.redirect.destination, '/physical/report/rpt_sample');
  h.setFetch(async () => response(404, { error: 'PRIVATE_SENTINEL' }));
  result = await invoke(h.load('src/lib/report-seo.ts').makeReportSeoProps('digital'), { public_id: 'rpt_sample' });
  assert.equal(result.page.notFound, true);
  for (const status of [403, 429, 500, 503]) {
    h.setFetch(async () => response(status, { error: 'PRIVATE_SENTINEL' }));
    result = await invoke(h.load('src/lib/report-seo.ts').makeReportSeoProps('digital'), { public_id: 'rpt_sample' });
    assert.equal(result.page.props.seo.found, false); assert.equal(result.headers['Cache-Control'], 'no-store');
  }
});

test('SSR deadline covers stalled headers and JSON bodies and clears every timer', async () => {
  for (const stalledBody of [false, true]) {
    let signal;
    const h = harness(async (_url, options) => {
      signal = options.signal;
      return stalledBody ? { ok: true, status: 200, json: () => new Promise(() => {}) } : new Promise(() => {});
    });
    const request = invoke(h.load('src/lib/report-seo.ts').makeReportSeoProps('digital'), { public_id: 'rpt_sample' });
    await flush(); assert.equal(h.pendingTimers, 1);
    h.advance(4000);
    const result = await request;
    assert.equal(result.page.props.seo.found, false); assert.equal(signal.aborted, true); assert.equal(h.pendingTimers, 0);
  }
});
