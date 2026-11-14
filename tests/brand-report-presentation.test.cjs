const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(relativePath, replacements = {}) {
  const filename = path.resolve(__dirname, relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, module: { exports }, URL,
    require: (name) => name in replacements ? replacements[name] : require(name),
  }, { filename });
  return exports;
}

const evidenceHelpers = load('../src/lib/report-evidence.ts');
const helpers = load('../src/lib/brand-report-presentation.ts', { '@/lib/report-evidence': evidenceHelpers });
const evidence = {
  report_kind: 'firsthand', intake_method: 'imported', intake_label: 'Imported public report',
  source_platform: 'bluesky', source_url: 'https://bsky.app/profile/example/post/original',
  source_published_at: '2026-02-06T12:00:00Z', observed_at: null, ingested_at: '2026-10-08T12:00:00Z',
  excerpt: 'Original wording with <script>unsafe</script> & an exact observation. 原文保留。',
  reported_impact: 'Cannot finish the task', classification_reason: 'The author describes their own experience.',
  entity_relationship: 'affected', validation_status: 'not_independently_reproduced',
  upstream_status: 'unknown', resolution_status: 'unknown', why_surfaced: [], evidence_version: 1,
};
const item = {
  discovery_token: 'opaque-token', title: 'Grok application freezes', summary: 'Grok application freezes: Generated explanation.',
  classification: 'digital', severity_level: 0.5, timestamp: '2026-10-08T12:00:00Z', brand_name: 'grok', evidence,
  recurrence: { supporting_report_count: 4, counts_exact: true, source_account_count: null, duplicate_import_count: 0, independence: 'unassessed' },
};
const CompactEvidence = load('../src/components/brand/BrandReportEvidence.tsx', {
  '@/lib/report-evidence': evidenceHelpers,
  '@/lib/brand-report-presentation': helpers,
}).default;
const NotificationCount = load('../src/components/brand/ReportNotificationCount.tsx').default;
const Dashboard = load('../src/components/brand/PublicBrandDashboard.tsx', {
  '@/components/brand/BrandReportEvidence': CompactEvidence,
  '@/components/report/ReportThumbnail': ({ item }) => item.evidence?.has_original_media ? React.createElement('img', { alt: 'Original report image', src: '/fixture.webp' }) : null,
  '@/components/brand/ReportNotificationCount': NotificationCount,
  '@/lib/brand-report-presentation': helpers,
  '@/lib/i18n': { getCurrentLocale() { return 'en-GB'; } },
  '@/lib/public-discovery-api': { resolvePublicDiscoveryToken() { throw new Error('Rendering must not resolve a token'); } },
  'next/router': { useRouter() { return { query: { brand_name: 'grok' }, push() {} }; } },
}).default;
const render = (report = item, props = {}) => renderToStaticMarkup(React.createElement(CompactEvidence, {
  item: report, locale: 'en-GB', action: React.createElement('button', null, 'Read report'), ...props,
}));

test('compact row foregrounds the exact original and one source link, keeping detail copy collapsed', () => {
  const html = render();
  const closed = html.split('<details')[0];
  assert.match(closed, /Original report wording/);
  assert.match(closed, /line-clamp-3/);
  assert.match(closed, /&lt;script&gt;unsafe&lt;\/script&gt;/);
  assert.match(closed, /原文保留。/);
  assert.match(closed, /From Bluesky/);
  assert.match(closed, /Published.*2026/);
  assert.match(closed, /4 related reports/);
  assert.doesNotMatch(closed, /Personal experience|Impact:|From the original report|Original report unavailable|Generated explanation|Added/);
  assert.match(html, /<details[^>]*><summary/);
  assert.doesNotMatch(html, /<details[^>]* open/);
  assert.match(html, /Original wording/);
  assert.match(html, /Cannot finish the task/);
  assert.match(html, /CleanApp AI summary/);
  assert.match(html, /not been checked for independence/);
});

test('date stays sourced: observed first, published next, receipt fallback only for direct submissions', () => {
  assert.equal(helpers.brandReportDate({ ...evidence, observed_at: '2026-09-20T12:00:00Z' }).label, 'Observed');
  assert.equal(helpers.brandReportDate({ ...evidence, observed_at: 'invalid date' }).label, 'Published');
  const native = helpers.brandReportDate({ ...evidence, intake_method: 'cleanapp_submission', source_published_at: null });
  assert.equal(native.label, 'Added');
  assert.equal(native.value, '2026-10-08T12:00:00Z');
  const agent = helpers.brandReportDate({ ...evidence, intake_method: 'agent_submission', source_published_at: null });
  assert.equal(agent.label, 'Received');
  assert.equal(agent.value, '2026-10-08T12:00:00Z');
  assert.equal(helpers.brandReportDate({ ...evidence, source_published_at: null }), null);
  const closed = render({ ...item, evidence: { ...evidence, source_published_at: null } }).split('<details')[0];
  assert.doesNotMatch(closed, /<time|2026-10-08|Added|Published|Observed/);
});

test('native reports retain their submission provenance without repeating source-type labels', () => {
  const closed = render({ ...item, evidence: { ...evidence, intake_method: 'cleanapp_submission', source_platform: 'sensor', source_url: null, source_published_at: null } }).split('<details')[0];
  assert.match(closed, /via CleanApp/);
  assert.doesNotMatch(closed, /via CleanApp mobile/);
  assert.match(closed, /Added/);
  assert.doesNotMatch(closed, /sensor|Personal experience|Imported|From Bluesky/);
});

test('brand rows show the recorded submission route in the feed and expanded details', () => {
  const native = { ...item, evidence: { ...evidence, intake_method: 'cleanapp_submission', source_url: null } };
  for (const [intake_channel, label] of [
    ['mobile', 'via CleanApp mobile'], ['web', 'via CleanApp web'], ['share', 'via CleanApp share'],
    ['legacy_v2', 'via CleanApp'], [null, 'via CleanApp'], [undefined, 'via CleanApp'],
  ]) {
    const html = render({ ...native, evidence: { ...native.evidence, intake_channel } });
    assert.ok(html.split('<details')[0].includes(label));
    assert.ok(html.includes(`How received</dt><dd>${label}`));
  }
  assert.doesNotMatch(render({ ...native, evidence: { ...native.evidence, intake_method: 'imported', intake_channel: 'mobile' } }).split('<details')[0], /via CleanApp/);
});

test('image-only and missing-source rows have no empty evidence boxes or invented wording', () => {
  const image = render({ ...item, evidence: { ...evidence, excerpt: null, has_original_media: true } }).split('<details')[0];
  assert.doesNotMatch(image, /<blockquote|AI summary|available in report details|Original text unavailable|Original source unconfirmed/);
  const unknown = render({ ...item, evidence: undefined, recurrence: undefined, summary: '' });
  assert.doesNotMatch(unknown, /<blockquote|<time|Evidence details|Original report|Unknown|Personal experience/);
});

test('unquoted generated summaries are labeled and title duplication is removed only from generated text', () => {
  const html = render({ ...item, evidence: { ...evidence, excerpt: null, has_original_media: false } });
  const closed = html.split('<details')[0];
  assert.match(closed, /AI summary/);
  assert.match(closed, /Generated explanation\./);
  assert.doesNotMatch(closed, /Grok application freezes:|<blockquote/);
  assert.equal(helpers.compactReportSummary(item.title, item.title), null);
  assert.equal(helpers.compactReportSummary('Original: exact', 'Original'), 'exact');
});

test('related count is visible only when exact and never described as affected people', () => {
  const closed = render({ ...item, recurrence: { ...item.recurrence, counts_exact: false, supporting_report_count: 900 } }).split('<details')[0];
  assert.doesNotMatch(closed, /900|related reports|affected users|people/);
  assert.match(render().split('<details')[0], /4 related reports/);
});

test('source URLs cannot execute scripts and product labels omit the current page brand', () => {
  const html = render({ ...item, evidence: { ...evidence, source_url: 'javascript:alert(1)' } });
  assert.doesNotMatch(html, /href="javascript:/);
  assert.equal(helpers.rowProductLabel(item, 'grok'), null);
  assert.equal(helpers.rowProductLabel({ ...item, brand_name: 'claude' }, 'anthropic'), 'Claude');
  assert.equal(helpers.reportSourceLabel({ ...evidence, source_platform: 'sensor' }), null);
});

test('all-source views retain the plain source type while filtered views avoid repeating it', () => {
  assert.match(render(item, { showSourceKind: true }).split('<details')[0], /Personal experience/);
  assert.match(render({ ...item, evidence: { ...evidence, report_kind: 'coverage' } }, { showSourceKind: true }).split('<details')[0], /News &amp; discussion/);
  assert.match(render({ ...item, evidence: undefined }, { showSourceKind: true }).split('<details')[0], /Other report/);
  assert.doesNotMatch(render(item, { showSourceKind: false }).split('<details')[0], /Personal experience/);
});

test('brand list uses striped rows and clickable title plus compact read action without a heavy card grid', () => {
  const html = renderToStaticMarkup(React.createElement(Dashboard, { items: [item, { ...item, discovery_token: 'second-token' }] }));
  assert.equal((html.match(/<article/g) || []).length, 2);
  assert.match(html, /odd:bg-green-100\/50 even:bg-white/);
  assert.match(html, /<h3[^>]*><button[^>]*>Grok application freezes<\/button><\/h3>/);
  assert.equal((html.match(/Read report/g) || []).length, 2);
  assert.doesNotMatch(html, /View report|rounded-xl|<article[^>]*grid-cols|border-green-200/);
});

test('feed shows the representative notification count separately from related report counts without resolving tokens', () => {
  const html = renderToStaticMarkup(React.createElement(Dashboard, {
    activeKind: 'firsthand',
    items: [{ ...item, notification_count: { state: 'sent', email_count: 4 },
      recurrence: { ...item.recurrence, supporting_report_count: 120 } }],
  }));
  const closed = html.split('<details')[0];
  assert.match(closed, /4 notification emails sent/);
  assert.match(closed, /120 related reports/);
  assert.doesNotMatch(closed, /120 notification|480|delivered|acknowledged|SendGrid|@x\.ai/);
});

test('notification count handles singular, zero, unavailable and older or malformed API data honestly', () => {
  const renderCount = (count) => renderToStaticMarkup(React.createElement(NotificationCount, {
    count, reportTitle: 'Original finding', onOpen() {}, locale: 'en-GB',
  }));
  const one = renderCount({ state: 'sent', email_count: 1 });
  assert.match(one, />1 notification email sent</);
  assert.doesNotMatch(one, /1 notification emails/);
  const zero = renderCount({ state: 'none_recorded', email_count: 0 });
  assert.match(zero, />0 notification emails</);
  assert.doesNotMatch(zero, /emails sent|No one notified|text-green-800/);
  for (const count of [undefined, null, { state: 'unavailable' }, { state: 'unavailable', email_count: 9 },
    { state: 'sent', email_count: 0 }, { state: 'sent', email_count: -4 }, { state: 'sent', email_count: 2.5 },
    { state: 'sent', email_count: '4' }, { state: 'none_recorded' }, { state: 'sent', email_count: Number.MAX_SAFE_INTEGER + 1 }]) {
    const html = renderCount(count);
    assert.match(html, />Notification count unavailable</);
    assert.doesNotMatch(html, />0 notification emails<|emails sent|text-green-800/);
  }
});

test('notification count is a keyboard-accessible history action with decorative icon and no recipient disclosure', () => {
  let opened = 0;
  const count = { state: 'sent', email_count: 1234, recipients: ['private@example.invalid'], provider: 'private-provider' };
  const props = { count, reportTitle: 'A <script>finding</script>', locale: 'en-GB', onOpen() { opened++; } };
  const html = renderToStaticMarkup(React.createElement(NotificationCount, props));
  assert.match(html, /<button type="button"/);
  assert.match(html, /aria-label="1,234 notification emails sent\. View notification history for A &lt;script&gt;finding&lt;\/script&gt;"/);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /min-h-\[44px\]/);
  assert.doesNotMatch(html, /private@example|private-provider|delivered|acknowledged/);
  NotificationCount(props).props.onClick();
  assert.equal(opened, 1);
  const opening = renderToStaticMarkup(React.createElement(NotificationCount, { ...props, opening: true }));
  assert.match(opening, /disabled=""/);
  assert.match(opening, /aria-busy="true"/);
});

test('agent reports show their API channel while retaining the original source link in details', () => {
  const report = { ...item, evidence: { ...evidence, intake_method: 'imported', intake_channel: 'agent_api' } };
  const html = render(report);
  assert.match(html.split('<details')[0], /via CleanApp Agentic API/);
  assert.match(html, /How received<\/dt><dd>via CleanApp Agentic API/);
  assert.match(html, /Read supplied source reference/);
  assert.ok(html.includes('href="https://bsky.app/profile/example/post/original"'));
  const imported = render({ ...item, evidence: { ...evidence, intake_channel: null } }).split('<details')[0];
  assert.match(imported, /From Bluesky/);
  assert.doesNotMatch(imported, /via CleanApp Agentic API/);
});

test('brand feed qualifies linked-post timestamps and keeps claimed client, product and source counts separate', () => {
  const post = 'https://x.com/example/status/2121547352817406330';
  const context = {
    ...evidence, intake_channel: 'agent_api', source_platform: 'x', source_url: post,
    source_published_at_basis: 'derived_x_status_id', submission_transport: 'mcp',
    submission_client: 'grok', submission_client_claimed: true, reporter_context: 'relayed',
    reported_product_or_site: 'X / Cloudflare', source_reference_count: 2,
    source_references: [{ kind: 'linked_post', url: post }],
    referenced_urls: [post, 'https://x.com/account/access'],
  };
  const derived = helpers.brandReportDate(context);
  assert.equal(derived.label, 'Post URL timestamp (derived)');
  assert.equal(derived.value, context.source_published_at);
  assert.equal(helpers.brandReportDate({ ...context, observed_at: '2026-02-05T12:00:00Z' }).label, 'Observed');
  const html = render({ ...item, evidence: context });
  assert.match(html.split('<details')[0], /Post URL timestamp \(derived\)/);
  assert.doesNotMatch(html.split('<details')[0], /Published/);
  assert.match(html, /Derived from the linked X post ID; publication not independently checked/);
  assert.match(html, /Grok \(declared, not identity-verified\)/);
  assert.match(html, /Relayed source material \(declared\)/);
  assert.match(html, /Affected product or site<\/dt><dd[^>]*>X \/ Cloudflare/);
  assert.match(html, /Read linked X post/);
  assert.doesNotMatch(html, /Read original source/);
  assert.match(html, /1 submitted report · 2 linked source references/);
  assert.match(html, /4 related source reports/);
  assert.match(html, /Links in the submitted report/);
  assert.match(html, /href="https:\/\/x.com\/account\/access"/);
});

test('brand feed never borrows receipt dates or infers a client from affected product', () => {
  const context = { ...evidence, intake_channel: 'agent_api', source_platform: 'web', source_url: null,
    source_published_at: null, observed_at: null, submission_client: null,
    reported_product_or_site: 'Grok', source_reference_count: 0 };
  const html = render({ ...item, evidence: context });
  assert.equal(helpers.brandReportDate(context), null);
  assert.match(html.split('<details')[0], /via CleanApp Agentic API/);
  assert.doesNotMatch(html.split('<details')[0], /<time|Published|Observed|Imported from web/);
  assert.match(html, /Observation time not supplied/);
  assert.match(html, /No separate publication date supplied/);
  assert.match(html, /Submitting client<\/dt><dd>Not recorded by the submitting adapter/);
  assert.match(html, /Affected product or site<\/dt><dd[^>]*>Grok/);
  assert.match(html, /1 submitted report · 0 linked source references/);
});

test('brand feed checks raw client-rendered source references with the shared privacy boundary', () => {
  const unsafe = 'https://example.com/view?tracking_token=PRIVATE_TEST_ONLY';
  const html = render({ ...item, evidence: { ...evidence, intake_channel: 'agent_api', source_url: unsafe,
    source_references: [{ kind: 'declared_source', url: unsafe }, { kind: 'declared_source', url: 'http://127.0.0.1/private' }],
    referenced_urls: [unsafe, 'https://grok.com/c/PRIVATE_CHAT_TEST_ONLY', 'javascript:alert(1)'],
  } });
  assert.doesNotMatch(html, /PRIVATE_TEST_ONLY|PRIVATE_CHAT_TEST_ONLY|127\.0\.0\.1|javascript:|Supplied source references|Links in the submitted report|Read original source/);
  const web = render({ ...item, evidence: { ...evidence, intake_channel: 'agent_api', submission_transport: 'web', submission_client: 'grok', submission_client_claimed: true } });
  assert.match(web, /How received<\/dt><dd>Submitted through the CleanApp report form/);
  assert.match(web, /Grok \(declared, not identity-verified\)/);
});
