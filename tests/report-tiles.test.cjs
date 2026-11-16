const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load() {
  const filename = path.resolve(__dirname, '../src/lib/report-tiles.ts');
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const module = { exports: {} };
  const stubs = {
    '@/lib/util': { getColorByValue: value => `color-${value}` },
    '@/lib/map-spires': { SPIRE_LABEL_LAYER: 'report-spire-labels' },
  };
  vm.runInNewContext(outputText, { module, exports: module.exports, require: name => stubs[name], console: { warn() {} } });
  return module.exports;
}
const tiles = load();
const plain = value => JSON.parse(JSON.stringify(value));

function fakeMap(existingLayers = []) {
  const sources = new Map(), layers = new Map(existingLayers.map(id => [id, {}])), added = [], layout = [];
  return {
    sources, layers, added, layout,
    getSource: id => sources.get(id),
    addSource: (id, source) => sources.set(id, source),
    getLayer: id => layers.get(id),
    addLayer(layer, before) { layers.set(layer.id, layer); added.push([layer.id, before]); },
    setLayoutProperty: (...args) => layout.push(args),
  };
}

test('the map asks the renderer for tiles, never for the whole point list', () => {
  assert.equal(tiles.reportTileUrl('https://renderer.cleanapp.io/'), 'https://renderer.cleanapp.io/api/v4/reports/tiles/{z}/{x}/{y}');
  const map = fakeMap();
  tiles.applyReportTiles(map, 'https://renderer.cleanapp.io', true);
  const source = plain(map.sources.get(tiles.REPORT_TILE_SOURCE));
  assert.deepEqual(source, {
    type: 'vector', tiles: ['https://renderer.cleanapp.io/api/v4/reports/tiles/{z}/{x}/{y}'], minzoom: 0, maxzoom: 16,
  });
  const layer = map.layers.get(tiles.REPORT_TILE_LAYER);
  assert.equal(layer.type, 'circle');
  assert.equal(layer['source-layer'], 'reports');
});

test('applying twice adds nothing twice and only toggles visibility', () => {
  const map = fakeMap(['report-spire-labels']);
  tiles.applyReportTiles(map, 'https://r', true);
  tiles.applyReportTiles(map, 'https://r', false);
  assert.deepEqual(map.added, [[tiles.REPORT_TILE_LAYER, 'report-spire-labels']], 'dots go below hotspot labels');
  assert.deepEqual(map.layout.map(args => args[2]), ['visible', 'none']);
});

test('a broken map cannot throw into rendering, and reload tolerates a missing source', () => {
  tiles.applyReportTiles({ getSource() { throw new Error('style not ready'); } }, 'https://r', true);
  tiles.reloadReportTiles(null);
  tiles.reloadReportTiles({ getSource: () => undefined });
  let reloads = 0;
  tiles.reloadReportTiles({ getSource: () => ({ reload() { reloads += 1; } }) });
  assert.equal(reloads, 1);
});

test('clicking a single report opens it at its exact position, at any zoom', () => {
  const feature = { geometry: { type: 'Point', coordinates: [8.5, 47.4] }, properties: { count: 1, severity: 0.4, lat: 47.3769, lon: 8.5417 } };
  assert.deepEqual(plain(tiles.reportDotClick(feature, 1.5)), { action: 'open', latitude: 47.3769, longitude: 8.5417 });
  const bare = { geometry: { type: 'Point', coordinates: [8.5, 47.4] }, properties: {} };
  assert.deepEqual(plain(tiles.reportDotClick(bare, 3)), { action: 'open', latitude: 47.4, longitude: 8.5 });
});

test('clicking a grouped dot zooms in until the group is small enough to open', () => {
  const group = { geometry: { type: 'Point', coordinates: [8.5, 47.4] }, properties: { count: 12, severity: 0.9 } };
  assert.deepEqual(plain(tiles.reportDotClick(group, 4)), { action: 'zoom', center: [8.5, 47.4], zoom: 7 });
  assert.deepEqual(plain(tiles.reportDotClick(group, 14.5)), { action: 'zoom', center: [8.5, 47.4], zoom: 16 });
  assert.deepEqual(plain(tiles.reportDotClick(group, 15)), { action: 'open', latitude: 47.4, longitude: 8.5 });
  assert.equal(tiles.reportDotClick(undefined, 4), null);
  assert.equal(tiles.reportDotClick({ geometry: { coordinates: ['x', 1] } }, 4), null);
});
