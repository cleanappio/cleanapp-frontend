const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function harness(fetch, key = 'server-only-test-key') {
  function load(file, imports = {}) {
    const exports = {};
    const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/', file), 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText;
    vm.runInNewContext(source, {exports, module: {exports}, require: name => imports[name], fetch, AbortSignal, Date, process: {env: {AMAZON_LOCATION_API_KEY: key}}});
    return exports;
  }
  const helper = load('lib/amazon-location.ts');
  const routes = Object.fromEntries(['geocode','places-search'].map(route => [route, load(`pages/api/${route}.ts`, {'../../lib/amazon-location': helper}).default]));
  return async (route, query, method = 'GET') => {
    const result = {headers: {}};
    const res = {setHeader: (k,v) => result.headers[k] = v, status(s) {result.status=s;return this;}, json(b) {result.body=JSON.parse(JSON.stringify(b));return this;}};
    await routes[route]({query, method}, res);return result;
  };
}
const response = (items, status = 200) => ({ok: status===200, status, json: async () => ({ResultItems: items})});
test('reverse geocoding preserves the client contract and sends longitude first without caching', async () => {
  const calls=[]; const run=harness(async (url, options) => {calls.push({url, options});return response([{Address:{Label:'Zurich HB'}}]);});
  for (const [lat,lng] of [['47.3769','8.5417'],['0','0'],['-33.86','151.2']]) {
    const r=await run('geocode',{lat,lng,language:'de-CH'});assert.equal(r.status,200);assert.equal(r.body.address,'Zurich HB');assert.equal(r.body.provider,'amazon-location');assert.equal(r.headers['Cache-Control'],'no-store');
    const call=calls.at(-1);assert.deepEqual(JSON.parse(call.options.body),{QueryPosition:[Number(lng),Number(lat)],Language:'de-CH',MaxResults:1,IntendedUse:'SingleUse'});assert.equal(call.options.cache,'no-store');assert.ok(call.options.signal);assert.ok(!JSON.stringify(r).includes('server-only-test-key'));
  }
});
test('invalid coordinates, array inputs, oversized searches and methods never call a paid API', async () => {
  let calls=0;const run=harness(async()=>{calls++;return response([]);});
  for(const q of [{lat:'1junk',lng:'2'},{lat:'Infinity',lng:'2'},{lat:'',lng:'2'},{lat:'91',lng:'0'},{lat:'0',lng:'181'},{lat:['1'],lng:'2'},{lat:'1',lng:'2',language:['en']},{lat:'1',lng:'2',language:'x'.repeat(36)}]) assert.equal((await run('geocode',q)).status,400);
  for(const q of [{query:['a']},{query:' '},{query:'x'.repeat(201)},{query:'Zurich',lat:'1'}]) assert.equal((await run('places-search',q)).status,400);
  assert.equal((await run('geocode',{},'POST')).status,405);assert.equal(calls,0);
});
test('search maps AWS coordinates and addresses into the existing map contract', async()=>{
  let sent;const run=harness(async(_,o)=>{sent=JSON.parse(o.body);return response([{PlaceId:'id',Title:'Station',Address:{Label:'Zurich'},Position:[8.54,47.37]}]);});
  const r=await run('places-search',{query:'Zurich HB',lat:'47',lng:'8'});assert.equal(r.status,200);assert.equal(r.body.status,'OK');assert.deepEqual(r.body.results[0],{place_id:'id',name:'Station',formatted_address:'Zurich',geometry:{location:{lat:47.37,lng:8.54}}});assert.deepEqual(sent.BiasPosition,[8,47]);
  await run('places-search',{query:'Zurich HB'});assert.deepEqual(sent.Filter.BoundingBox,[-180,-90,180,90]);
});
test('empty results, throttling, missing credentials and network failures are safe',async()=>{
  assert.equal((await harness(async()=>response([]))('geocode',{lat:'0',lng:'0'})).status,404);
  assert.equal((await harness(async()=>response([]))('places-search',{query:'ocean'})).body.status,'ZERO_RESULTS');
  for(const status of [403,429,500]) {const r=await harness(async()=>response([],status))('geocode',{lat:'1',lng:'2'});assert.equal(r.status,status===429?429:502);}
  let calls=0;assert.equal((await harness(async()=>{calls++;},'')('geocode',{lat:'1',lng:'2'})).status,503);assert.equal(calls,0);
  const r=await harness(async()=>{throw Error('secret-url?key=server-only-test-key');})('geocode',{lat:'1',lng:'2'});assert.equal(r.status,502);assert.ok(!JSON.stringify(r).includes('server-only-test-key'));
});
test('a bounded request budget stops further paid calls',async()=>{
  let calls=0;const run=harness(async()=>{calls++;return response([]);});
  for(let i=0;i<120;i++) await run('geocode',{lat:'0',lng:'0'});
  assert.equal((await run('geocode',{lat:'0',lng:'0'})).status,429);assert.equal(calls,120);
});
