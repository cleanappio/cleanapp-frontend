const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const file = path.resolve(__dirname, '../src/lib/public-live-subscription.ts');
const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function harness({ constructorFailures = 0 } = {}) {
  const sockets = [];
  const timers = new Map();
  let nextTimer = 0;
  let attempts = 0;
  class FakeWebSocket {
    constructor(url) {
      attempts += 1;
      if (constructorFailures-- > 0) throw new Error('Connection unavailable');
      this.url = url;
      this.closeCalls = 0;
      sockets.push(this);
    }
    close() { this.closeCalls += 1; this.onclose?.({}); }
    open() { this.onopen?.({}); }
    message(data) { this.onmessage?.({ data }); }
    disconnect() { this.onclose?.({}); }
  }
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, module: { exports }, WebSocket: FakeWebSocket,
    setTimeout(callback, delay) {
      const id = ++nextTimer;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
  }, { filename: file });
  return {
    subscribe: exports.subscribePublicLive, sockets, timers,
    get attempts() { return attempts; },
    reconnectAfter(expectedDelay) {
      assert.equal(timers.size, 1, 'only one reconnect may be pending');
      const [id, timer] = timers.entries().next().value;
      assert.equal(timer.delay, expectedDelay);
      timers.delete(id);
      timer.callback();
      return sockets.at(-1);
    },
  };
}

test('one subscription opens the original public URL and forwards raw messages', () => {
  const h = harness();
  let opened = 0;
  const messages = [];
  const dispose = h.subscribe({ url: 'wss://live.cleanapp.io/api/v3/public/listen', onOpen: () => { opened += 1; }, onMessage: value => messages.push(value) });
  assert.equal(h.sockets.length, 1);
  const socket = h.sockets[0];
  assert.equal(socket.url, 'wss://live.cleanapp.io/api/v3/public/listen');
  socket.open();
  const raw = { unchanged: true };
  socket.message(raw);
  socket.message('{"type":"public_reports"}\n');
  assert.equal(opened, 1);
  assert.equal(messages[0], raw);
  assert.equal(messages[1], '{"type":"public_reports"}\n');
  assert.equal(h.timers.size, 0);
  dispose();
  dispose();
  assert.equal(socket.closeCalls, 1);
  assert.equal(h.timers.size, 0);
});

test('failed connections back off to 30s and only a successful open resets delay', () => {
  const h = harness();
  let opened = 0;
  const dispose = h.subscribe({ url: 'wss://public', onOpen: () => { opened += 1; }, onMessage: () => {} });
  let socket = h.sockets[0];
  for (const delay of [1000, 2000, 4000, 8000, 16000, 30000, 30000]) {
    socket.disconnect();
    socket.disconnect();
    socket.open(); // Late open on the closed connection must not reset backoff.
    socket = h.reconnectAfter(delay);
  }
  assert.equal(opened, 0);
  socket.open();
  assert.equal(opened, 1);
  socket.disconnect();
  h.reconnectAfter(1000);
  dispose();
});

test('replaced and disposed sockets cannot update the feed or create extra retries', () => {
  const h = harness();
  let opened = 0;
  const messages = [];
  const dispose = h.subscribe({ url: 'wss://public', onOpen: () => { opened += 1; }, onMessage: value => messages.push(value) });
  const old = h.sockets[0];
  const queuedOpen = old.onopen;
  const queuedMessage = old.onmessage;
  const queuedClose = old.onclose;
  old.disconnect();
  const current = h.reconnectAfter(1000);
  queuedOpen({});
  queuedMessage({ data: 'stale' });
  queuedClose({});
  assert.equal(opened, 0);
  assert.equal(messages.length, 0);
  assert.equal(h.timers.size, 0);
  current.open();
  current.message('current');
  const afterDisposeOpen = current.onopen;
  const afterDisposeMessage = current.onmessage;
  const afterDisposeClose = current.onclose;
  dispose();
  afterDisposeOpen({});
  afterDisposeMessage({ data: 'disposed' });
  afterDisposeClose({});
  assert.equal(opened, 1);
  assert.deepEqual(messages, ['current']);
  assert.equal(current.closeCalls, 1);
  assert.equal(h.timers.size, 0);
});

test('cleanup cancels pending reconnect and ignores an already queued timer callback', () => {
  const h = harness();
  const dispose = h.subscribe({ url: 'wss://public', onOpen: () => {}, onMessage: () => {} });
  h.sockets[0].disconnect();
  const queuedTimer = h.timers.values().next().value.callback;
  dispose();
  assert.equal(h.timers.size, 0);
  queuedTimer();
  assert.equal(h.sockets.length, 1);
});

test('constructor failures use bounded reconnect and can be disposed safely', () => {
  const h = harness({ constructorFailures: 2 });
  const dispose = h.subscribe({ url: 'wss://public', onOpen: () => {}, onMessage: () => {} });
  assert.equal(h.attempts, 1);
  h.reconnectAfter(1000);
  assert.equal(h.attempts, 2);
  const socket = h.reconnectAfter(2000);
  assert.equal(h.attempts, 3);
  dispose();
  assert.equal(socket.closeCalls, 1);
  assert.equal(h.timers.size, 0);
});
