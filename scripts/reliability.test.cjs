const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const {test} = require('node:test');
const C = require(path.join(root, 'core.js'));
const { create, snapshot } = require(path.join(root, 'cloud-sync.js'));

test('cloud buttons, capped habit undo and in-flight flush regressions', async () => {
  const findings = {};
  // Execute the unchanged click handler in an isolated DOM stub.
  const storage = new Map();
  const localStorage = { getItem: k => storage.get(k) || null, setItem: (k,v) => storage.set(k,v) };
  const listeners = [];
  let cloudCalls = 0;
  const context = {
    window: { LifeCore: C, NorthAuth: { client: {} }, NorthCloud: { create: () => ({ resume: async () => cloudCalls++, sync: async () => cloudCalls++, resolve: async () => cloudCalls++ }) }, addEventListener() {} },
    document: { documentElement: { lang: 'en' }, addEventListener: (name, fn, capture) => listeners.push({ name, fn, capture }), querySelector: () => null },
    localStorage, setInterval() {}, setTimeout() {}, clearTimeout() {}, navigator: {}, console,
  };
  const source = fs.readFileSync(path.join(root, 'workspace.js'), 'utf8').replace('window.LifeWorkspace = {', 'window.auditClick = onClick;\n  window.LifeWorkspace = {');
  vm.runInNewContext(source, context);
  storage.set(C.ACCOUNT_KEY, JSON.stringify({ audit: { data: C.migrate({ profile: { email: 'audit', lang: 'en' }, tasks: [], goals: [] }) } }));
  storage.set(C.SESSION_KEY, 'audit');
  findings.cloudButtons = [];
  for (const action of ['cloud-sync', 'cloud-local', 'cloud-remote']) {
    let stopped = false;
    const button = { id: '', dataset: { action }, matches: () => false, closest: () => null };
    const event = { target: { closest: () => button }, preventDefault() {}, stopImmediatePropagation() { stopped = true; } };
    const before = cloudCalls;
    await context.window.auditClick(event);
    if (!stopped) for (const l of listeners.filter(l => l.name === 'click' && !l.capture)) await l.fn(event);
    findings.cloudButtons.push({ action, propagationStopped: stopped, cloudCalls: cloudCalls - before });
    assert.equal(stopped, true);
    assert.equal(cloudCalls - before, 1);
    assert.equal(button.disabled, false);
  }

  const habits = C.migrate({ profile: {}, goals: [{ id: 'g', name: 'Goal', momentum: 100 }], tasks: [], habits: [{ id: 'h', title: 'Habit', goalId: 'g', impact: 10, checks: [] }] });
  const initial = habits.goals[0].momentum;
  C.toggleHabit(habits, 'h', '2026-09-20');
  const checked = habits.goals[0].momentum;
  C.toggleHabit(habits, 'h', '2026-09-20');
  findings.habitUndo = { initial, checked, afterUndo: habits.goals[0].momentum, expected: initial };
  assert.equal(habits.goals[0].momentum, 100);

  let data = { tasks: [], sessions: [], projects: [], goals: [] };
  let row = { payload: structuredClone(snapshot(data)), revision: 0 };
  let gate = null, writeStarted, signalWrite;
  const writes = new Promise(resolve => { signalWrite = resolve; });
  const mem = new Map();
  let state;
  const client = { auth: { getSession: async () => ({ data: { session: { user: { id: 'u', email: 'audit' } } } }) }, from() {
    let payload;
    const q = { select() { return q; }, eq() { return q; }, update(value) { payload = structuredClone(value); return q; }, async maybeSingle() {
      if (!payload) return { data: structuredClone(row) };
      signalWrite();
      if (gate) await gate;
      row = structuredClone(payload);
      return { data: { revision: row.revision } };
    }};
    return q;
  }};
  const cloud = create({ client, read: () => data, apply: p => { data = structuredClone(p); }, storage: { getItem: k => mem.get(k) || null, setItem: (k,v) => mem.set(k,v) }, email: () => 'audit', status: s => { state = s; } });
  await cloud.resume();
  data.tasks.push({ id: 'first' });
  let release;
  gate = new Promise(resolve => { release = resolve; });
  const inFlight = cloud.sync();
  await writes;
  data.tasks.push({ id: 'second' });
  let flushReturned = false;
  const flush = cloud.sync().then(() => { flushReturned = true; });
  await Promise.resolve();
  assert.equal(flushReturned, false, "flush must wait for the pending write");
  findings.flushWhileBusy = { flushReturned, cloudTasksBeforeWriteCompletes: row.payload.tasks.length };
  release();
  await inFlight;
  await flush;
  findings.flushWhileBusy = { ...findings.flushWhileBusy, statusAfterWrite: state, cloudTasks: row.payload.tasks.length, localTasks: data.tasks.length };
  assert.equal(flushReturned, true);
  assert.equal(state, 'saved');
  assert.equal(row.payload.tasks.length, 2);
  assert.equal(data.tasks.length, 2);

});
