const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../src/lib/auth-redirect.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exportsObject = {};
vm.runInNewContext(compiled, { exports: exportsObject, module: { exports: exportsObject }, URL }, { filename });
const { safeAuthRedirect, redirectAfterLoginOnce } = exportsObject;

function storage(initial = null) {
  let value = initial;
  return { getItem() { return value; }, removeItem() { value = null; } };
}

test('auth effect and submit completion navigate once back to the report', () => {
  const guard = { current: false };
  const saved = storage('/digital/report/rpt_original');
  const calls = [];
  const navigate = (target) => calls.push(target);
  assert.equal(redirectAfterLoginOnce(guard, '/digital/report/rpt_original', saved, navigate), '/digital/report/rpt_original');
  assert.equal(redirectAfterLoginOnce(guard, undefined, saved, navigate), null);
  assert.deepEqual(calls, ['/digital/report/rpt_original']);
  assert.equal(saved.getItem(), null);
});

test('current valid report link takes precedence over an older stored return path', () => {
  const calls = [];
  redirectAfterLoginOnce({ current: false }, '/physical/report/rpt_current?tab=sources#notifications', storage('/dashboard'), (target) => calls.push(target));
  assert.deepEqual(calls, ['/physical/report/rpt_current?tab=sources#notifications']);
  const fallback = [];
  redirectAfterLoginOnce({ current: false }, '//outside.example', storage('/digital/report/rpt_original'), (target) => fallback.push(target));
  assert.deepEqual(fallback, ['/digital/report/rpt_original']);
});

test('external, protocol-relative, backslash and control-character redirects are rejected', () => {
  for (const value of ['https://outside.example', '//outside.example', '/\\outside.example', '/ /outside.example', '/\noutside.example', 'javascript:alert(1)', ['//outside.example'], null]) {
    assert.equal(safeAuthRedirect(value), null);
  }
  const calls = [];
  redirectAfterLoginOnce({ current: false }, 'https://outside.example', storage('//outside.example'), (target) => calls.push(target));
  assert.deepEqual(calls, ['/dashboard']);
});
