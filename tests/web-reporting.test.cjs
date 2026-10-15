const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const ts = require('typescript');

const filename = path.resolve(__dirname, '../src/lib/web-reporting.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function load(globals = {}, environment = {}) {
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, module: { exports }, crypto: webcrypto, TextEncoder, URL,
    process: { env: environment }, ...globals,
  }, { filename });
  return exports;
}

test('text-only and image-only drafts work, with UTF-8 byte limits after trimming', () => {
  const lib = load();
  assert.equal(lib.MAX_REPORT_TEXT_BYTES, 8192);
  assert.equal(lib.MAX_REPORT_IMAGE_BYTES, 1024 * 1024);
  assert.equal(lib.validateReportDraft('  pothole  ', false), null);
  assert.equal(lib.validateReportDraft('   ', true), null);
  assert.match(lib.validateReportDraft('   ', false), /Describe the problem/);
  assert.equal(lib.validateReportDraft('😀'.repeat(2048), false), null);
  assert.match(lib.validateReportDraft('😀'.repeat(2048) + 'é', true), /too long/);
  assert.throws(() => lib.newWebReportPayload('   '), /Describe the problem/);
});

test('draft identity and timestamp remain stable when payload is reused for retry', () => {
  const savedSession = '75d87241-c819-456e-ab22-95b5c64c878b';
  const lib = load({ window: { sessionStorage: {
    getItem() { return savedSession; },
    setItem() { throw new Error('Existing session should be reused'); },
  } } });
  const first = lib.newWebReportPayload('  A broken checkout  ');
  const serializedAttempt = JSON.stringify(first);
  assert.equal(first.version, '1.0');
  assert.equal(first.channel, 'web');
  assert.equal(first.annotation, 'A broken checkout');
  assert.equal(first.session_id, savedSession);
  assert.match(first.source_id, /^web_[a-f0-9-]{36}$/);
  assert.equal(new Date(first.observed_at).toISOString(), first.observed_at);
  assert.equal(JSON.stringify(first), serializedAttempt);
  const second = lib.newWebReportPayload('', '/9j/fresh-jpeg');
  assert.notEqual(first.source_id, second.source_id);
  assert.equal(first.session_id, second.session_id);
  assert.equal(second.image, '/9j/fresh-jpeg');
  assert.equal(second.annotation, '');
  assert.deepEqual(Object.keys(second).sort(), ['annotation', 'channel', 'image', 'observed_at', 'session_id', 'source_id', 'version']);
});

test('restricted storage and browsers without randomUUID do not block reporting', () => {
  const lib = load({
    crypto: { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) },
    window: { get sessionStorage() { throw new Error('Storage blocked'); } },
  });
  const first = lib.newWebReportPayload('A problem');
  const second = lib.newWebReportPayload('Another problem');
  assert.match(first.session_id, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  assert.equal(first.session_id, second.session_id);
  assert.notEqual(first.source_id, second.source_id);
});

test('intake URL is direct to the live service with no proxy or credentials', () => {
  assert.equal(load().reportApiBase(), 'https://live.cleanapp.io/api/v1/human-reports');
  assert.equal(load({}, { NEXT_PUBLIC_LIVE_API_URL: 'https://live.example///' }).reportApiBase(), 'https://live.example/api/v1/human-reports');
});

test('a real receipt is required even after a successful HTTP response', () => {
  const { readReportReceipt } = load();
  for (const status of ['received', 'accepted', 'published', 'shadowed', 'quarantined', 'duplicate']) {
    const receipt = readReportReceipt({ receipt_id: 'rcpt_123', status });
    assert.equal(receipt.status, status);
  }
  for (const malformed of [null, [], {}, { status: 'accepted' }, { receipt_id: 'rcpt_123' },
    { receipt_id: '', status: 'published' }, { receipt_id: 'rcpt_123', status: 'rejected' },
    { receipt_id: 'rcpt_123', status: 'failed' }, { receipt_id: 'rcpt_123', status: 'invented_success' },
    { receipt_id: 'rcpt_123', status: 'accepted', processing_status: 'failed' },
    { receipt_id: 'rcpt_123', status: 'accepted', publication_status: 'rejected' },
    { receipt_id: 'rcpt_123', status: 'accepted', processing_status: {} }]) {
    assert.equal(readReportReceipt(malformed), null);
  }
});

test('published paths match actual report routes and cannot redirect outside the site', () => {
  const { readReportReceipt } = load();
  const base = { receipt_id: 'rcpt_123', status: 'shadowed', processing_status: 'analyzed', publication_status: 'public', public_id: 'rpt_123' };
  const parsed = readReportReceipt({ ...base, canonical_path: '/digital/report/rpt_123', private_payload: 'must not leak' });
  assert.equal(parsed.canonical_path, '/digital/report/rpt_123');
  assert.equal(parsed.publication_status, 'public');
  assert.equal(parsed.status, 'shadowed');
  assert.equal('private_payload' in parsed, false);
  assert.equal(readReportReceipt({ ...base, canonical_path: '/physical/report/rpt_a-b' }).canonical_path, '/physical/report/rpt_a-b');
  for (const canonical_path of ['https://outside.example', '//outside.example', '/digital/report/../login', '/digital/report/rpt_123?next=evil', '/digital/report/rpt_123#fragment', '/digital/rpt_123', '/\\outside.example']) {
    assert.equal(readReportReceipt({ ...base, canonical_path }).canonical_path, undefined);
  }
});

function imageHarness({ width = 4096, height = 2048, blobSize = () => 600_000, blobType = 'image/jpeg', readFails = false } = {}) {
  const draws = [], encodes = [], reads = [];
  let releases = 0, decoded = 0;
  const canvas = { width: 0, height: 0,
    getContext() { return { fillRect() {}, drawImage(...args) { draws.push({ args, width: canvas.width, height: canvas.height }); } }; },
    toBlob(callback, type, quality) {
      encodes.push({ type, quality, width: canvas.width, height: canvas.height });
      callback({ type: blobType, size: blobSize(quality, canvas.width, canvas.height) });
    },
  };
  const lib = load({
    createImageBitmap: async () => { decoded++; return { width, height, close() { releases++; } }; },
    document: { createElement(tag) { assert.equal(tag, 'canvas'); return canvas; } },
    FileReader: class {
      readAsDataURL(blob) {
        reads.push(blob);
        if (readFails) { this.onerror(); return; }
        this.result = 'data:image/jpeg;base64,/9j/encoded-pixels-only';
        this.onload();
      }
    },
  });
  return { lib, draws, encodes, reads, canvas, releases: () => releases, decoded: () => decoded };
}
const imageFile = (overrides = {}) => ({ size: 2_000_000, type: 'image/png', name: 'screenshot.png', ...overrides });

test('images are re-encoded, dimension-limited and returned as plain base64', async () => {
  const harness = imageHarness();
  const original = imageFile();
  const base64 = await harness.lib.prepareReportImage(original);
  assert.equal(base64, '/9j/encoded-pixels-only');
  assert.doesNotMatch(base64, /^data:/);
  assert.equal(harness.encodes[0].type, 'image/jpeg');
  assert.equal(harness.draws[0].width, 2048);
  assert.equal(harness.draws[0].height, 1024);
  assert.notEqual(harness.reads[0], original);
  assert.equal(harness.releases(), 1);
  assert.equal(harness.canvas.width, 0);
});

test('large encodings reduce quality and then dimensions until within the byte cap', async () => {
  const harness = imageHarness({ blobSize: (quality, width) => width > 1500 || quality > 0.76 ? 1_100_000 : 900_000 });
  await harness.lib.prepareReportImage(imageFile());
  assert.ok(harness.encodes.length > 5);
  assert.ok(harness.encodes.every(({ width, height }) => width <= 2048 && height <= 2048));
  assert.ok(harness.reads[0].size <= harness.lib.MAX_REPORT_IMAGE_BYTES);
  assert.equal(harness.releases(), 1);
});

test('oversized sources and invalid files are rejected before decoding', async () => {
  const harness = imageHarness();
  await assert.rejects(() => harness.lib.prepareReportImage(imageFile({ size: 21 * 1024 * 1024 })), /20 MB/);
  await assert.rejects(() => harness.lib.prepareReportImage(imageFile({ size: 0 })), /empty/);
  await assert.rejects(() => harness.lib.prepareReportImage(imageFile({ type: 'text/plain', name: 'file.txt' })), /photo or screenshot/);
  await assert.rejects(() => harness.lib.prepareReportImage(imageFile({ type: 'image/svg+xml', name: 'file.svg' })), /photo or screenshot/);
  assert.equal(harness.decoded(), 0);
});

test('pixel bombs and encoding/read errors release decoded image resources', async () => {
  const huge = imageHarness({ width: 10_000, height: 6000 });
  await assert.rejects(() => huge.lib.prepareReportImage(imageFile()), /50 megapixels/);
  assert.equal(huge.releases(), 1);
  const failedEncoding = imageHarness({ blobType: 'image/png' });
  await assert.rejects(() => failedEncoding.lib.prepareReportImage(imageFile()), /couldn't prepare/);
  assert.equal(failedEncoding.releases(), 1);
  const failedRead = imageHarness({ readFails: true });
  await assert.rejects(() => failedRead.lib.prepareReportImage(imageFile()), /couldn't read/);
  assert.equal(failedRead.releases(), 1);
  const decodeFailure = load({ createImageBitmap: async () => { throw new Error('Internal decoder failure'); } });
  await assert.rejects(() => decodeFailure.prepareReportImage(imageFile()), /couldn't open that image/);
});

test('analytics emit only event/surface/safe status and never block reporting', () => {
  const dataLayer = [], gtagCalls = [], customEvents = [];
  const lib = load({ window: { dataLayer, gtag(...args) { gtagCalls.push(args); }, dispatchEvent(event) { customEvents.push(event); } },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
  });
  lib.trackReportEvent('report_submitted', 'widget', 'shadowed');
  assert.equal(JSON.stringify(dataLayer[0]), JSON.stringify({ event: 'report_submitted', surface: 'widget', status: 'shadowed' }));
  assert.equal(gtagCalls[0][0], 'event');
  assert.equal(customEvents[0].type, 'cleanapp:report');
  lib.trackReportEvent('report_failed', 'page', 429);
  assert.equal(dataLayer[1].status, 429);
  lib.trackReportEvent('report_failed', 'page', 'private@example.com');
  assert.equal('status' in dataLayer[2], false);
  lib.trackReportEvent('private@example.com', 'page');
  assert.equal(dataLayer.length, 3);
  const brokenAnalytics = load({ window: { get dataLayer() { throw new Error('Broken tracker'); }, gtag() { throw new Error('Broken tracker'); }, dispatchEvent() { throw new Error('Broken listener'); } }, CustomEvent: class {} });
  assert.doesNotThrow(() => brokenAnalytics.trackReportEvent('report_submitted', 'widget', 'accepted'));
  assert.doesNotThrow(() => load().trackReportEvent('report_opened', 'page'));
});

test('submission errors are concise and actionable without server messages', () => {
  const { submissionError } = load();
  assert.match(submissionError(429), /Wait a moment/);
  assert.match(submissionError(413), /smaller image/);
  assert.match(submissionError(0), /connection/);
  assert.match(submissionError(422), /Check your report/);
  assert.match(submissionError(500), /try again/);
});
