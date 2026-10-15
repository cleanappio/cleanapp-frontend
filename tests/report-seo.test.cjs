const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, invoke, response, flush } = require('./seo-harness.cjs');
const id = 'rpt_1234567890123456789012';
const body = (classification = 'digital') => ({
  report: { public_id: id, image: 'PRIVATE_IMAGE_BYTES', id: 'PRIVATE_ACTOR', seq: 777, latitude: 12.34, longitude: 56.78, private_notes: 'PRIVATE_SENTINEL' },
  analysis: [{ language: 'en', classification, is_valid: false, title: 'Checkout failed', summary: 'The pay button did not respond.', brand_display_name: 'Example', analysis_text: 'PRIVATE_SENTINEL', inferred_contact_emails: 'PRIVATE_CONTACT' }],
  evidence: { report_kind: 'firsthand', intake_method: 'imported', source_platform: 'github', excerpt: 'I pressed Pay.\nThe page stopped.', source_url: 'https://github.com/example/project/issues/1', source_published_at: '2026-10-15T12:00:00Z', has_original_media: true, private_notes: 'PRIVATE_SENTINEL' },
  recurrence: { issue_id: 'PRIVATE_FAMILY', case_id: 'PRIVATE_CASE', supporting_report_count: 2, counts_exact: true, source_account_count: null },
});

test('report SSR serializes a bounded public document, not raw actor, location, image or routing data', async () => {
  const h = harness(async (url, options) => {
    assert.match(url, new RegExp(`/api/v3/reports/by-public-id\\?public_id=${id}$`));
    assert.equal(options.cache, 'no-store'); assert.equal(options.credentials, 'omit');
    return response(200, body());
  });
  const result = await invoke(h.load('src/lib/report-seo.ts').makeReportSeoProps('digital'), { public_id: id });
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.equal(result.status, 200);
  assert.equal(result.page.props.seo.found, true);
  assert.equal(result.page.props.seo.title, 'Checkout failed – Example | CleanApp');
  const initial = result.page.props.initialReport;
  assert.equal(initial.analysis[0].title, 'Checkout failed');
  assert.equal(initial.evidence.excerpt, 'I pressed Pay.\nThe page stopped.');
  assert.equal(initial.evidence.source_url, 'https://github.com/example/project/issues/1');
  assert.match(initial.report.image, /rawimage\/by-public-id\?public_id=/);
  for (const secret of ['PRIVATE_', 'latitude', 'longitude', 'inferred_contact_emails', 'analysis_text', 'issue_id', 'case_id']) {
    assert.equal(JSON.stringify(result.page).includes(secret), false, secret);
  }
  assert.equal(h.pendingTimers, 0);
});

test('raw legacy image bytes do not override media suppressed or unconfirmed by the public evidence projection', async () => {
  for (const evidence of [undefined, { ...body().evidence, has_original_media: false }, { ...body().evidence, has_original_media: undefined }]) {
    const h = harness(async () => response(200, { ...body(), evidence }));
    const result = await invoke(h.load('src/lib/report-seo.ts').makeReportSeoProps('digital'), { public_id: id });
    assert.equal(result.status, 200);
    assert.equal(result.page.props.seo.image, null);
    assert.equal(result.page.props.initialReport.report.image, undefined);
    assert.equal(JSON.stringify(result.page).includes('PRIVATE_IMAGE_BYTES'), false);
  }
});

test('explicitly nonpublic and missing reports produce 404 without serializing their content', async () => {
  for (const data of [{ ...body(), visibility: 'shadow' }, { ...body(), is_public: false }, { ...body(), report: { ...body().report, visibility: 'private' } }]) {
    const h = harness(async () => response(200, data));
    const result = await invoke(h.load('src/lib/report-seo.ts').makeReportSeoProps('digital'), { public_id: id });
    assert.equal(result.page.notFound, true);
    assert.equal(JSON.stringify(result.page).includes('PRIVATE_'), false);
  }
  for (const status of [404, 410]) {
    const h = harness(async () => response(status, body()));
    assert.equal((await invoke(h.load('src/lib/report-seo.ts').makeReportSeoProps('digital'), { public_id: id })).page.notFound, true);
  }
});

test('malformed public payloads and transient failures are retryable 503 responses, not 200 noindex', async () => {
  for (const data of [null, [], {}, { ...body(), report: { public_id: 'different' } },
    { ...body(), analysis: [{ title: 'PRIVATE_SENTINEL', classification: 'invented' }] },
    { ...body(), analysis: [{ title: '', classification: 'digital' }] }, { ...body(), analysis: [null, {}] }]) {
    const h = harness(async () => response(200, data));
    const result = await invoke(h.load('src/lib/report-seo.ts').makeReportSeoProps('digital'), { public_id: id });
    assert.equal(result.status, 503); assert.equal(result.headers['Retry-After'], '60');
    assert.equal(result.page.props.seo.unavailable, true); assert.equal(result.page.props.initialReport, null);
    assert.equal(JSON.stringify(result.page).includes('PRIVATE_'), false);
  }
  for (const status of [400, 401, 403, 429, 500, 503]) {
    const h = harness(async () => response(status, body()));
    const result = await invoke(h.load('src/lib/report-seo.ts').makeReportSeoProps('digital'), { public_id: id });
    assert.equal(result.status, 503); assert.equal(result.headers['Cache-Control'], 'no-store');
  }
});

test('wrong kind redirects to the actual canonical route; malformed IDs never call upstream', async () => {
  const h = harness(async () => response(200, body('physical')));
  const result = await invoke(h.load('src/lib/report-seo.ts').makeReportSeoProps('digital'), { public_id: id });
  assert.equal(result.page.redirect.destination, `/physical/report/${id}`);
  h.setFetch(async () => { throw new Error('must not fetch'); });
  for (const public_id of ['rpt_short', '1234', '../private', 'rpt_' + 'x'.repeat(23)]) {
    assert.equal((await invoke(h.load('src/lib/report-seo.ts').makeReportSeoProps('digital'), { public_id })).page.notFound, true);
  }
});

test('SSR deadlines cover stalled headers and bodies and preserve temporary failure semantics', async () => {
  for (const stalledBody of [false, true]) {
    let signal;
    const h = harness(async (_url, options) => {
      signal = options.signal;
      return stalledBody ? { ok: true, status: 200, json: () => new Promise(() => {}) } : new Promise(() => {});
    });
    const request = invoke(h.load('src/lib/report-seo.ts').makeReportSeoProps('digital'), { public_id: id });
    await flush(); assert.equal(h.pendingTimers, 1);
    h.advance(4000);
    const result = await request;
    assert.equal(result.status, 503); assert.equal(result.page.props.seo.unavailable, true);
    assert.equal(signal.aborted, true); assert.equal(h.pendingTimers, 0);
  }
});
