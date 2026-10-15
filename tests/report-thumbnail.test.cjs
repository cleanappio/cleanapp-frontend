const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const sharp = require('sharp');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(relative, replacements = {}, globals = {}) {
  const filename = path.resolve(__dirname, relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, module: { exports },
    require: (name) => name in replacements ? replacements[name] : require(name),
    Buffer, URL, AbortController, AbortSignal, setTimeout, clearTimeout, fetch,
    process: { env: { NEXT_PUBLIC_LIVE_API_URL: 'https://live.example' } },
    ...globals,
  }, { filename });
  return exports;
}

const media = load('../src/lib/server/report-thumbnail.ts');
const token = `gdt_${'a'.repeat(120)}`;
const publicId = 'rpt_aUl-fseGsxzbWPAXbgKxGw';
const target = { kind: 'report', classification: 'digital', public_id: publicId, canonical_path: `/digital/report/${publicId}` };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const input = () => sharp({ create: { width: 900, height: 600, channels: 3, background: '#165d34' } }).png().withMetadata().toBuffer();

test('thumbnail fetch uses one report-only token media request, never resolver/detail quotas or a full report', async () => {
  const original = await input();
  const calls = [];
  const image = await media.fetchReportThumbnail(token, 'https://live.example/', async (url, options) => {
    calls.push({ url, options });
    return new Response(original, { headers: { 'Content-Type': 'image/png' } });
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `https://live.example/api/v3/public/report-media?token=${token}`);
  for (const { url, options } of calls) {
    assert.equal(options.cache, 'no-store');
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal);
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.headers.Cookie, undefined);
    assert.doesNotMatch(url, /\/reports\/by-public-id|seq=|public\/resolve|rawimage/);
  }
  const metadata = await sharp(image).metadata();
  assert.equal(metadata.format, 'webp');
  assert.ok(metadata.width <= 336 && metadata.height <= 252);
  assert.ok(image.length <= media.MAX_THUMBNAIL_OUTPUT_BYTES);
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.icc, undefined);
});

test('expired, non-report, malformed and nonpublic targets fail closed before exposing bytes', async () => {
  for (const response of [
    json({}, 400), json({ ...target, kind: 'brand' }),
    json({ ...target, classification: 'internal' }), json({ ...target, public_id: '../../private' }),
  ]) {
    let calls = 0;
    await assert.rejects(media.fetchReportThumbnail(token, 'https://live.example', async () => { calls++; return response; }));
    assert.equal(calls, 1);
  }
  let calls = 0;
  await assert.rejects(media.fetchReportThumbnail(token, 'https://live.example', async () => { calls++; return json({}, 404); }));
  assert.equal(calls, 1);
  for (const invalid of ['', 'https://evil.example/image', 'gdt_short', `gdt_${'x'.repeat(3000)}`]) {
    assert.equal(media.isDiscoveryThumbnailToken(invalid), false);
    await assert.rejects(media.fetchReportThumbnail(invalid, 'https://live.example', async () => { throw new Error('must not fetch'); }));
  }
});

test('thumbnail reads enforce declared and streamed byte budgets and reject arbitrary documents', async () => {
  await assert.rejects(media.readThumbnailBody(new Response('x', { headers: { 'Content-Length': String(media.MAX_THUMBNAIL_INPUT_BYTES + 1) } }), media.MAX_THUMBNAIL_INPUT_BYTES));
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(12)); },
    cancel() { cancelled = true; },
  });
  await assert.rejects(media.readThumbnailBody(new Response(stream), 8));
  assert.equal(cancelled, true);
  for (const document of ['<svg xmlns="http://www.w3.org/2000/svg"></svg>', '<html>private error</html>', '%PDF-1.7']) {
    await assert.rejects(media.makeReportThumbnail(Buffer.from(document)));
  }
  await assert.rejects(media.makeReportThumbnail(Buffer.from([0xff, 0xd8, 0xff, 0x00])));
});

test('thumbnail decoder caps pixels and never enlarges a small original', async () => {
  const small = await sharp({ create: { width: 48, height: 32, channels: 3, background: '#ffffff' } }).png().toBuffer();
  const metadata = await sharp(await media.makeReportThumbnail(small)).metadata();
  assert.equal(metadata.width, 48);
  assert.equal(metadata.height, 32);
  const tooManyPixels = await sharp({ create: { width: 5000, height: 4000, channels: 3, background: '#ffffff' } }).png().toBuffer();
  await assert.rejects(media.makeReportThumbnail(tooManyPixels), /pixel limit/i);
});

test('thumbnail proxy returns only compressed images and disables caching for visibility changes', async () => {
  const original = await input();
  const calls = [];
  const helpers = load('../src/lib/server/report-thumbnail.ts', {}, { fetch: async (url, options) => {
    calls.push({ url, options });
    return new Response(original);
  } });
  const handler = load('../src/pages/api/reports/thumbnail.ts', { '@/lib/server/report-thumbnail': helpers }).default;
  const result = { headers: {} };
  const response = {
    setHeader(name, value) { result.headers[name] = value; },
    status(status) { result.status = status; return this; },
    send(body) { result.body = body; return this; },
    end() { return this; },
  };
  await handler({ method: 'GET', query: { token }, headers: { authorization: 'Bearer private-token', cookie: 'private-cookie' } }, response);
  assert.equal(result.status, 200);
  assert.equal(result.headers['Content-Type'], 'image/webp');
  assert.equal(result.headers['Cache-Control'], 'private, no-store, max-age=0');
  assert.equal(result.headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(result.headers['Content-Length'], result.body.length);
  assert.ok(Buffer.isBuffer(result.body));
  for (const { options } of calls) assert.doesNotMatch(JSON.stringify(options.headers), /private-token|private-cookie/);
});

test('proxy hides upstream failures and rejects methods/invalid tokens without fetching', async () => {
  let calls = 0;
  const helpers = { ...media, async fetchReportThumbnail() { calls++; throw new Error('private upstream details'); } };
  const handler = load('../src/pages/api/reports/thumbnail.ts', { '@/lib/server/report-thumbnail': helpers }).default;
  for (const [method, value, expected] of [['POST', token, 405], ['GET', 'bad-token', 400], ['GET', token, 404]]) {
    const result = { headers: {} };
    await handler({ method, query: { token: value } }, {
      setHeader(name, value) { result.headers[name] = value; },
      status(status) { result.status = status; return this; },
      end() { return this; },
    });
    assert.equal(result.status, expected);
    assert.equal(result.body, undefined);
    assert.equal(result.headers['Cache-Control'], 'private, no-store, max-age=0');
  }
  assert.equal(calls, 1);
});

test('thumbnail waits near viewport, opens report accessibly and removes itself on broken media', () => {
  const values = [];
  const effects = [];
  let cursor = 0;
  let intersection;
  let clicked = 0;
  const hooks = {
    ...React,
    useRef() { return { current: {} }; },
    useState(initial) { const index = cursor++; if (!(index in values)) values[index] = initial; return [values[index], (value) => { values[index] = value; }]; },
    useEffect(callback) { effects.push(callback); },
  };
  const Thumbnail = load('../src/components/report/ReportThumbnail.tsx', { react: hooks }, {
    IntersectionObserver: class {
      constructor(callback) { intersection = callback; }
      observe() {}
      disconnect() {}
    },
  }).default;
  const item = { discovery_token: token, title: 'Original screenshot', evidence: { has_original_media: true } };
  function render(current = item) { cursor = 0; effects.length = 0; return Thumbnail({ item: current, onOpen: () => { clicked++; }, className: 'float-right w-24' }); }
  let element = render();
  assert.equal(element.type, 'button');
  assert.match(element.props['aria-label'], /Open report: Original screenshot/);
  assert.match(element.props.className, /float-right/);
  assert.equal(element.props.children, false, 'no image request should exist before intersection');
  effects[0]();
  intersection([{ isIntersecting: true }]);
  element = render();
  const image = element.props.children;
  assert.equal(image.props.src, `/api/reports/thumbnail?token=${token}`);
  assert.equal(image.props.loading, 'lazy');
  assert.equal(image.props.decoding, 'async');
  element.props.onClick();
  assert.equal(clicked, 1);
  const html = renderToStaticMarkup(element);
  assert.match(html, /type="button"/);
  assert.match(html, /object-contain/);
  assert.doesNotMatch(html, /data:image|rawimage|No image|unavailable/);
  image.props.onError();
  assert.equal(render(), null, 'failed image must remove the button and float gutter');
  assert.equal(render({ ...item, evidence: { has_original_media: false } }), null);
});

test('thumbnail work limits concurrent decoders and rejects queue overflow without starting extra work', async () => {
  const capacity = load('../src/lib/server/report-thumbnail.ts');
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let started = 0;
  const jobs = Array.from({ length: 28 }, () => capacity.runThumbnailJob(async () => { started++; await gate; return true; }));
  assert.equal(started, 4, 'only four image jobs can run at once');
  await assert.rejects(capacity.runThumbnailJob(async () => { throw new Error('must not start'); }), capacity.ThumbnailBusy);
  assert.equal(started, 4);
  release();
  await Promise.all(jobs);
  assert.equal(started, 28);
  assert.equal(await capacity.runThumbnailJob(async () => 'new-request'), 'new-request', 'all slots must be released');
});

test('temporary upstream limits get bounded backoff rather than consuming resolver quotas or retrying forever', async () => {
  const delays = [];
  const retry = load('../src/lib/server/report-thumbnail.ts', {}, {
    setTimeout(callback, milliseconds) {
      if (milliseconds < 12000) { delays.push(milliseconds); queueMicrotask(callback); }
      return 1;
    },
    clearTimeout() {},
  });
  const original = await input();
  let calls = 0;
  const result = await retry.fetchReportThumbnail(token, 'https://live.example', async () => ++calls < 3 ? json({}, 429) : new Response(original));
  assert.equal(calls, 3);
  assert.deepEqual(delays, [750, 1500]);
  assert.ok(result.length > 0);
  calls = 0;
  await assert.rejects(retry.fetchReportThumbnail(token, 'https://live.example', async () => { calls++; return json({}, 429); }), retry.ThumbnailBusy);
  assert.equal(calls, 3);
});
