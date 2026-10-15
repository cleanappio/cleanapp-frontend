const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2021,esModuleInterop:true}}).outputText;
  const exports = {};
  vm.runInNewContext(code, {exports, require, process, URL, Buffer, Date, ...globals});
  return exports;
}
const lib = load('src/lib/acquisition.ts');
const sample = {event:'report_submit_accepted',page:'report',landing:'website_problem',source:'google',surface:'page'};
test('collector accepts only fixed categories, rejecting identifiers or unexpected fields', () => {
  assert.equal(JSON.stringify(lib.readAcquisitionEvent(sample)), JSON.stringify(sample));
  for (const bad of [{...sample, report_id:'private'}, {...sample, page:'/digital/report/secret'}, {...sample, source:'https://google.com?q=private'}, {...sample,event:'arbitrary'}, {...sample,surface:{toString:()=> 'page'}}, null, []]) assert.equal(lib.readAcquisitionEvent(bad),null);
});
test('attribution removes paths, identifiers, queries and private routes', () => {
  assert.equal(lib.acquisitionPage('/digital/report/rpt_sensitive?password=secret'), 'public_report');
  assert.equal(lib.acquisitionPage('/digital/customer-name'), 'public_brand');
  for (const route of ['/checkout?token=secret','/billing','/dashboard','/cases/private','/reset-password','/api/reports']) assert.equal(lib.acquisitionPage(route),null);
  assert.equal(lib.acquisitionPage('/me/report-a-problem'), 'report');
  assert.equal(lib.acquisitionPage('/litter-reporting'), 'reporting_category');
  assert.equal(lib.acquisitionSource('https://www.google.ch/search?q=sensitive','https://www.cleanapp.io'),'google');
  assert.equal(lib.acquisitionSource('https://google.com.attacker.example/?q=x','https://www.cleanapp.io'),'other_external');
});
test('browser collector sends fixed values only and respects privacy signals', async () => {
  const requests=[];
  const window={location:{pathname:'/report-a-problem',origin:'https://www.cleanapp.io'}};
  const navigator={doNotTrack:'1'};
  const browser=load('src/lib/acquisition.ts',{window,navigator,document:{referrer:'https://www.google.com/search?q=private'},fetch:async(...args)=>requests.push(args)});
  browser.countAcquisition('page_view'); assert.equal(requests.length,0);
  navigator.doNotTrack='0'; navigator.globalPrivacyControl=true;
  browser.countAcquisition('page_view'); assert.equal(requests.length,0);
  navigator.globalPrivacyControl=false;
  browser.countAcquisition('page_view'); assert.equal(requests.length,1);
  assert.equal(requests[0][1].credentials,'omit');
  assert.equal(requests[0][1].referrerPolicy,'no-referrer');
  assert.equal(requests[0][1].body.includes('private'),false);
  assert.equal(JSON.parse(requests[0][1].body).source,'google');
});
test('storage persists allowlisted events, limits disk and prunes only expired event files', async () => {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'cleanapp-acquisition-'));
  const day=new Date().toISOString().slice(0,10);
  const store=load('src/lib/acquisition-store.ts',{process:{env:{ACQUISITION_EVENTS_DIR:directory}}});
  try {
    fs.writeFileSync(path.join(directory,'2000-01-01.ndjson'),'old');
    fs.writeFileSync(path.join(directory,'keep.txt'),'untouched');
    assert.equal(await store.storeAcquisition(sample),true);
    const file=path.join(directory,day+'.ndjson');
    const row=JSON.parse(fs.readFileSync(file,'utf8'));
    assert.equal(Object.keys(row).sort().join(','),'event,hour,landing,page,source,surface');
    assert.equal(fs.existsSync(path.join(directory,'2000-01-01.ndjson')),false);
    assert.equal(fs.readFileSync(path.join(directory,'keep.txt'),'utf8'),'untouched');
    fs.truncateSync(file,5*1024*1024);
    assert.equal(await store.storeAcquisition(sample),false);
    assert.equal(fs.statSync(file).size,5*1024*1024);
  } finally {fs.rmSync(directory,{recursive:true,force:true});}
});
test('API rejects cross-site, arbitrary fields and non-JSON without writing; honors privacy signals', async () => {
  const stored=[];
  const handler=load('src/pages/api/acquisition.ts',{require(name){
    if(name==='@/lib/acquisition')return lib;
    if(name==='@/lib/acquisition-store')return {storeAcquisition:async value=>{stored.push(value);return true;}};
    return require(name);
  }}).default;
  async function invoke(overrides={}) {
    let status=200;
    const res={setHeader(){},status(code){status=code;return this;},end(){return status;}};
    return handler({method:'POST',headers:{origin:'https://www.cleanapp.io','content-type':'application/json'},body:sample,...overrides},res);
  }
  assert.equal(await invoke({headers:{origin:'https://attacker.example','content-type':'application/json'}}),403);
  assert.equal(await invoke({body:{...sample,annotation:'private'}}),400);
  assert.equal(await invoke({headers:{origin:'https://www.cleanapp.io','content-type':'text/plain'}}),415);
  assert.equal(await invoke({headers:{'sec-gpc':'1'}}),204);
  assert.equal(await invoke({method:'GET'}),405);
  assert.equal(stored.length,0);
  assert.equal(await invoke(),204);
  assert.equal(stored.length,1);
  assert.equal(JSON.stringify(stored[0]),JSON.stringify(sample));
});
test('automatic homepage query redirect does not inflate page views', () => {
  const events=[];
  let routeChange;
  let cleanup;
  const window={location:{pathname:'/'},addEventListener(){},removeEventListener(){}};
  const Component=load('src/components/AcquisitionCounts.tsx',{
    window,document:{addEventListener(){},removeEventListener(){}},
    require(name){
      if(name==='react')return {useEffect:fn=>{cleanup=fn();}};
      if(name==='next/router')return {useRouter:()=>({events:{on:(name,fn)=>{routeChange=fn;},off(){}}})};
      if(name==='@/lib/acquisition')return {...lib,countAcquisition:event=>events.push(event)};
      return require(name);
    }
  }).default;
  Component();
  routeChange('/?tab=physical');
  assert.equal(events.length,1);
  window.location.pathname='/report-a-problem'; routeChange('/report-a-problem');
  assert.equal(events.length,2);
  cleanup();
});
