const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(relativePath, replacements = {}, append = '') {
  const filename = path.resolve(__dirname, relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8') + append, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, module: { exports }, process,
    require: name => name in replacements ? replacements[name] : require(name),
  }, { filename });
  return exports;
}
const location = load('../src/lib/report-location.ts');
const { reportMapCoordinates } = location;

test('missing and legacy unknown coordinates never become physical map positions', () => {
  for (const pair of [[0, 0], [-0, 0], [null, null], [undefined, undefined], [null, 8], [47, undefined], ['', ''], ['47.37', '8.55']]) {
    assert.equal(reportMapCoordinates(...pair), null, `unexpected map position for ${JSON.stringify(pair)}`);
  }
});

test('nonfinite and out-of-range coordinates are rejected on either axis', () => {
  for (const pair of [[NaN, 8], [47, NaN], [Infinity, 8], [47, -Infinity], [90.001, 8], [-90.001, 8], [47, 180.001], [47, -180.001]]) {
    assert.equal(reportMapCoordinates(...pair), null);
  }
});

test('real coordinates retain axis order, including equator, prime meridian and limits', () => {
  for (const pair of [[47.37, 8.55], [0, 8.55], [47.37, 0], [-90, -180], [90, 180]]) {
    assert.deepEqual(Array.from(reportMapCoordinates(...pair)), [pair[1], pair[0]]);
  }
});

const { PublicRecentReportCard } = load('../src/components/RecentReports.tsx', {
  'next/router': { useRouter() { return {}; } },
  '@/lib/i18n': { getCurrentLocale() { return 'en'; }, useTranslations() { return { t: key => key }; } },
  '@/lib/report-location': location,
  '@/lib/public-discovery-api': {},
  './RecentReports/LocationsCard': () => null,
  './RecentReports/AIInsightsCard': () => null,
}, '\nexport { PublicRecentReportCard };\n');
const card = (latitude, longitude) => renderToStaticMarkup(React.createElement(PublicRecentReportCard, {
  item: { discovery_token: 'opaque', title: 'Blocked entrance', summary: 'Entrance is blocked.', classification: 'physical', severity_level: 0.4, latitude, longitude },
  onOpen() {},
}));

test('unknown-location report remains readable in the feed without invented coordinates', () => {
  for (const pair of [[0, 0], [undefined, undefined], [null, 8], [NaN, 8], [91, 8]]) {
    const html = card(...pair);
    assert.match(html, /Blocked entrance/);
    assert.match(html, /Entrance is blocked/);
    assert.match(html, /readReport/);
    assert.doesNotMatch(html, /0\.0000|NaN|91\.0000/);
  }
});

test('feed preserves legitimate single-zero-axis locations', () => {
  assert.match(card(0, 8.55), /0\.0000, 8\.5500/);
  assert.match(card(47.37, 0), /47\.3700, 0\.0000/);
});
