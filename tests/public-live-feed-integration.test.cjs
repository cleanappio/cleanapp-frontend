const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function execute(source, globals = {}) {
  const exports = {};
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(compiled, { exports, module: { exports }, ...globals });
  return exports;
}
const { reportMapCoordinates } = execute(fs.readFileSync(path.resolve(__dirname, '../src/lib/report-location.ts'), 'utf8'));

// Execute the actual Globe subscription callback with map/refresh dependencies
// supplied, without needing a WebGL browser to mount the full map component.
const globeFile = path.resolve(__dirname, '../src/components/GlobeView.tsx');
const globe = ts.createSourceFile(globeFile, fs.readFileSync(globeFile, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let messageMethod;
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(globe) === 'subscribePublicLive') {
    messageMethod = node.arguments[0].properties.find(property => property.name?.getText(globe) === 'onMessage');
  }
  ts.forEachChild(node, visit);
}
visit(globe);
assert.ok(messageMethod, 'Globe must provide a public-live message handler');
function handler(selectedTab) {
  const physical = [], digital = [], animations = [];
  let refreshes = 0, digitalRefreshes = 0;
  const { receive } = execute(`export const receive = ({ ${messageMethod.getText(globe)} }).onMessage;`, {
    selectedTab, reportMapCoordinates,
    pickPublicLiveAnalysis: analyses => analyses[0],
    appendPhysicalLiteV2: rows => physical.push(...rows),
    appendDigitalLiteV2: rows => digital.push(...rows),
    invalidateDigitalLiteV2: () => { digitalRefreshes += 1; },
    animateLiveUpdate: update => animations.push(update),
    refreshPublicLatest: () => { refreshes += 1; },
  });
  return { receive, physical, digital, animations, get refreshes() { return refreshes; }, get digitalRefreshes() { return digitalRefreshes; } };
}
const report = (classification, coordinates = {}) => ({
  discovery_token: 'rotating-live-token', timestamp: '2026-10-16T12:00:00Z',
  analysis: [{ classification, title: 'Fresh report', severity_level: 0.4, brand_name: 'cleanapp' }],
  ...coordinates,
});
const frame = reports => JSON.stringify({ type: 'public_reports', data: { reports } });

test('unlocated physical live reports refresh Latest without inventing map positions', () => {
  const h = handler('physical');
  h.receive(frame([report('physical'), report('physical', { latitude: 0, longitude: 0 })]));
  assert.equal(h.refreshes, 1, 'unlocated observations still invalidate the selected feed');
  assert.equal(h.physical.length, 0);
  assert.equal(h.animations.length, 0);
  assert.equal(h.digitalRefreshes, 0);
});

test('real physical live points update the map immediately and a whole frame refreshes Latest once', () => {
  const h = handler('physical');
  h.receive(frame([
    report('physical', { latitude: 0, longitude: 8.55 }),
    report('physical', { latitude: 47.37, longitude: 0 }),
  ]));
  assert.equal(h.refreshes, 1);
  assert.deepEqual(h.physical.map(row => [row.latitude, row.longitude]), [[0, 8.55], [47.37, 0]]);
  assert.equal(h.animations.length, 2);
  assert.equal(h.digitalRefreshes, 0);
});

test('live digital updates preserve tab scope and malformed chunks cannot block later valid data', () => {
  const physicalView = handler('physical');
  physicalView.receive(frame([report('digital')]));
  assert.equal(physicalView.refreshes, 0);
  assert.equal(physicalView.digital.length, 0, 'a live preview cannot replace authoritative brand counts');
  assert.equal(physicalView.digitalRefreshes, 1);
  assert.equal(physicalView.animations.length, 1);
  const digitalView = handler('digital');
  digitalView.receive(`bad json\nnull\n${frame([report('digital'), report('digital')])}\n${frame([report('digital')])}\n`);
  assert.equal(digitalView.refreshes, 1);
  assert.equal(digitalView.digital.length, 0);
  assert.equal(digitalView.digitalRefreshes, 1, 'a whole batch invalidates digital summaries once');
});
