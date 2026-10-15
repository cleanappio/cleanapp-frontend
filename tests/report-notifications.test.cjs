const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(relativePath, replacements = {}, globals = {}) {
  const filename = path.resolve(__dirname, relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, module: { exports },
    require: (name) => name in replacements ? replacements[name] : require(name),
    AbortSignal, URL, process: { env: { NEXT_PUBLIC_LIVE_API_URL: 'https://live.example' } },
    ...globals,
  }, { filename });
  return exports;
}

const helpers = load('../src/lib/report-notifications.ts');
const contacts = load('../src/lib/report-contact-summary.ts');
const { ReportNotificationsView } = load('../src/components/report/ReportNotifications.tsx', {
  '@/lib/report-notifications': helpers,
  '@/lib/auth-store': { useAuthStore() { return false; } },
  '@/lib/auth-api-client': { authApiClient: { getAuthToken() { return null; } } },
  'next/link': ({ children, ...props }) => React.createElement('a', props, children),
});
const OrganizationPanel = load('../src/components/report/ReportContactStrategyPanel.tsx', {
  '@/lib/report-contact-summary': contacts,
}).default;
const summary = {
  state: 'sent', email_count: 4, recipient_count: 4,
  latest_sent_at: '2026-09-21T18:36:41Z',
  preview_recipients: ['support@x.ai'], hidden_recipient_count: 3,
  history_complete: false, full_log_requires_subscription: true,
  content_kind: 'brand_digest',
  events: [{ sent_at: '2026-09-21T18:36:41Z', email_count: 4, content_kind: 'brand_digest' }],
};
const history = { ...summary, recipients: [
  { email: 'support@x.ai', sent_at: summary.latest_sent_at, status: 'sent', content_kind: 'brand_digest' },
  { email: 'private-recipient@x.ai', sent_at: summary.latest_sent_at, status: 'sent', content_kind: 'brand_digest' },
] };
const render = (props = {}) => renderToStaticMarkup(React.createElement(ReportNotificationsView, {
  summary, returnPath: '/digital/report/rpt_example', locale: 'en-GB', ...props,
}));

test('public report shows actual sends, one preview recipient and a gated history link', () => {
  const html = render({ summary: { ...summary, preview_recipients: [...summary.preview_recipients, 'private-recipient@x.ai'] }, history, historyState: 'open' });
  assert.match(html, /4 notification emails sent/);
  assert.match(html, /support@x\.ai/);
  assert.match(html, /\+ 3 more/);
  assert.match(html, /2026-09-21T18:36:41Z/);
  assert.match(html, /Sign in to view full history/);
  assert.match(html, /redirect=%2Fdigital%2Freport%2Frpt_example/);
  assert.doesNotMatch(html, /private-recipient|SendGrid|Delivered|Read|Acknowledged/);
});

test('subscriber records render only after access succeeds, never while loading or denied', () => {
  for (const historyState of ['closed', 'loading', 'subscribe', 'signin', 'error']) {
    const html = render({ authenticated: true, historyState, history });
    assert.doesNotMatch(html, /private-recipient/);
  }
  assert.match(render({ authenticated: true, historyState: 'subscribe', history }), /Subscribe to view full history/);
  const html = render({ authenticated: true, historyState: 'open', history });
  assert.match(html, /private-recipient@x\.ai/);
  assert.match(html, /Sent · Included in a digest/);
  assert.match(html, /Available recorded history/);
  assert.doesNotMatch(html, /Delivered|Read|Acknowledged|SendGrid/);
});

test('missing, failed and unavailable summaries cannot masquerade as zero sends', () => {
  for (const props of [{ summary: null }, { error: true }, { summary: { ...summary, state: 'unavailable', email_count: 0 } }]) {
    const html = render(props);
    assert.match(html, /Notification history unavailable/);
    assert.doesNotMatch(html, /No notification emails|emails sent/);
  }
  const empty = render({ summary: { ...summary, state: 'none_recorded', email_count: 0, events: [] } });
  assert.match(empty, /No notification emails recorded yet/);
});

test('subscriber history distinguishes linked reports without promising inline evidence', () => {
  const html = render({ authenticated: true, historyState: 'open', history: {
    ...history, recipients: [{ ...history.recipients[0], content_kind: 'report_email' }],
  } });
  assert.match(html, /Report linked in email/);
  assert.doesNotMatch(html, /Included in a digest|Screenshot|Featured|Delivered/);
});

const response = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
function apiHarness(fetch, route = 'notifications') {
  const replacements = { '@/lib/report-notifications': helpers, '@/lib/report-contact-summary': contacts };
  const handler = load(`../src/pages/api/reports/${route}.ts`, replacements, { fetch }).default;
  return async ({ query = { public_id: 'rpt_example' }, headers = {}, method = 'GET' } = {}) => {
    const result = { headers: {} };
    const res = {
      setHeader(key, value) { result.headers[key] = value; },
      status(status) { result.status = status; return this; },
      json(body) { result.body = body; return this; },
    };
    await handler({ query, headers, method }, res);
    return result;
  };
}

test('public proxy never forwards credentials or leaks private recipients/provider fields', async () => {
  const calls = [];
  const run = apiHarness(async (url, options) => {
    calls.push({ url, options });
    return response(200, { ...history, provider: 'private-provider', extra: 'private-transport' });
  });
  const result = await run({ query: { public_id: 'id /?&' }, headers: { authorization: 'Bearer client-token' } });
  assert.equal(result.status, 200);
  assert.equal(result.headers['Cache-Control'], 'private, no-store');
  assert.equal(result.headers.Vary, 'Authorization');
  assert.equal(calls[0].url, 'https://live.example/api/v3/reports/notifications/by-public-id?public_id=id%20%2F%3F%26');
  assert.equal(calls[0].options.cache, 'no-store');
  assert.equal(calls[0].options.headers.Authorization, undefined);
  assert.doesNotMatch(JSON.stringify(result.body), /private-recipient|private-provider|private-transport|"recipients":/);
});

test('full proxy requires bearer auth, preserves backend entitlement denials, never trusts query flags', async () => {
  let calls = 0;
  const run = apiHarness(async (url, options) => {
    calls++;
    assert.equal(url, 'https://live.example/api/v3/reports/notifications/full/by-public-id?public_id=rpt_example');
    assert.equal(options.headers.Authorization, 'Bearer client-token');
    return response(403, { ...history });
  });
  const anonymous = await run({ query: { public_id: 'rpt_example', full: '1', subscriber: 'true', token: 'client-token' } });
  assert.equal(anonymous.status, 401);
  assert.equal(calls, 0);
  const denied = await run({ query: { public_id: 'rpt_example', full: '1', subscriber: 'true' }, headers: { authorization: 'Bearer client-token' } });
  assert.equal(denied.status, 403);
  assert.equal(calls, 1);
  assert.doesNotMatch(JSON.stringify(denied.body), /private-recipient|support@/);
  assert.equal(denied.headers['Cache-Control'], 'private, no-store');
});

test('full proxy returns subscriber history only after a backend success', async () => {
  const run = apiHarness(async () => response(200, history));
  const result = await run({ query: { public_id: 'rpt_example', full: '1' }, headers: { authorization: 'Bearer subscriber-token' } });
  assert.equal(result.status, 200);
  assert.equal(result.body.recipients[1].email, 'private-recipient@x.ai');
  assert.equal(result.headers['Cache-Control'], 'private, no-store');
});

test('history client sends bearer only for full access and preserves 401/403 failures', async () => {
  let calls = 0;
  const client = load('../src/lib/report-notifications.ts', {}, { fetch: async (url, options) => {
    calls++;
    assert.match(url, /&full=1$/);
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    return response(403, history);
  } });
  await assert.rejects(() => client.fetchReportNotifications('rpt_example', { full: true }), (error) => error.status === 401);
  assert.equal(calls, 0);
  await assert.rejects(() => client.fetchReportNotifications('rpt_example', { full: true, token: 'test-token' }), (error) => error.status === 403);
  assert.equal(calls, 1);
  const unavailable = load('../src/lib/report-notifications.ts', {}, { fetch: async () => response(200, { ...summary, state: 'unavailable', email_count: 0 }) });
  await assert.rejects(() => unavailable.fetchReportNotifications('rpt_example'), (error) => error.status === 503);
});

test('public contact strategy exposes organization context without addresses, people or execution details', async () => {
  const run = apiHarness(async () => response(200, {
    report_seq: 1280207, public_id: 'rpt_example',
    escalation_targets: [{ organization: 'xAI', email: 'hidden@x.ai', display_name: 'Private Person', provider: 'private-provider' }],
    contact_observations: [{ organization_name: 'hidden@x.ai', website: 'https://www.x.ai/contact' }],
    notify_plan: { summary: 'private-routing' }, execution_tasks: [{ payload_json: 'private-routing' }],
  }), 'contact-strategy');
  const result = await run();
  assert.equal(result.status, 200);
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.match(JSON.stringify(result.body), /xAI|x\.ai/);
  assert.doesNotMatch(JSON.stringify(result.body), /hidden@|Private Person|private-provider|private-routing/);
});

test('organization UI does not display inferred contacts as confirmed notifications', () => {
  const html = renderToStaticMarkup(React.createElement(OrganizationPanel, {
    strategy: {
      escalation_targets: [{ organization: 'xAI', email: 'hidden@x.ai', display_name: 'Private Person', confidence_score: 0.95 }],
      contact_observations: [],
      execution_tasks: [{ payload_json: 'private-routing' }],
      notify_outcomes: [{ source_ref: 'private-provider' }],
    },
    loading: false, error: null,
  }));
  assert.match(html, /Relevant organizations/);
  assert.match(html, /xAI/);
  assert.doesNotMatch(html, /hidden@|Private Person|confidence|private-routing|private-provider|Notify now|Sent/);
});
