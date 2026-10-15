const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

exports.harness = function harness(fetch) {
  let now = 1_800_000_000_000;
  let timerId = 0;
  const timers = new Map();
  const cache = new Map();
  const state = { fetch };
  const globals = {
    process: { env: { NEXT_PUBLIC_LIVE_API_URL: 'https://live.example' } },
    URL, URLSearchParams, AbortController,
    Date: class extends Date { static now() { return now; } },
    fetch: (...args) => state.fetch(...args),
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, at: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  function load(relative) {
    const filename = path.resolve(__dirname, '..', relative);
    if (cache.has(filename)) return cache.get(filename);
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const exports = {};
    cache.set(filename, exports);
    vm.runInNewContext(compiled, { ...globals, exports, module: { exports }, require(name) {
      if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`);
      return require(name);
    } }, { filename });
    return exports;
  }
  return {
    load, setFetch(next) { state.fetch = next; },
    get pendingTimers() { return timers.size; },
    advance(ms) { now += ms; for (const [id, timer] of timers) if (timer.at <= now) { timers.delete(id); timer.callback(); } },
  };
};

exports.invoke = async function invoke(handler, params = {}) {
  const result = { headers: {}, status: 200, body: '' };
  const res = {
    setHeader(name, value) { result.headers[name] = value; },
    set statusCode(value) { result.status = value; },
    get statusCode() { return result.status; },
    write(value) { result.body += value; }, end(value = '') { result.body += value; },
  };
  result.page = await handler({ params, res, locale: 'en' });
  return result;
};
exports.response = (status, data) => ({ status, ok: status >= 200 && status < 300, json: async () => data });
exports.flush = () => new Promise(resolve => setImmediate(resolve));
