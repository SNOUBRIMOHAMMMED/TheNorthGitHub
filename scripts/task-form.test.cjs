const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../core.js');

test('task form saves priority and due date without removed impact inputs', async () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
  const elements = new Map([...html.matchAll(/id="([^"]+)"/g)].map(([, id]) => [
    '#' + id,
    {
      classList: { add() {}, remove() {}, toggle() {} }, style: {}, dataset: {},
      options: [], handlers: {}, value: '', textContent: '', close() {}, reset() {},
      addEventListener(event, handler) { this.handlers[event] = handler; },
    },
  ]));
  const data = C.migrate({ profile: { name: 'QA', email: 'qa', lang: 'en', threshold: 60 }, goals: [], tasks: [], lastOpened: C.day() });
  const storage = new Map([[C.ACCOUNT_KEY, JSON.stringify({ qa: { data } })]]);
  let load;
  const context = {
    window: {
      dispatchEvent() {}, LifeCore: C, scrollTo() {},
      addEventListener(event, handler) { if (event === 'load') load = handler; },
      NorthAuth: { session: async () => ({ user: { id: 'uid-qa', email: 'qa' } }) },
    },
    document: { documentElement: { lang: 'en' }, querySelector: s => elements.get(s) || null, querySelectorAll: () => [], dispatchEvent() {} },
    localStorage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) },
    navigator: {}, Intl, Date, Event: function () {}, CustomEvent: function () {}, setTimeout() {},
  };
  vm.runInNewContext(source, context);
  await load();
  assert.equal(storage.get(C.SESSION_KEY), 'qa');
  assert.equal(elements.has('#taskImpact'), false);
  assert.equal(elements.has('#taskProgress'), false);
  elements.get('#taskTitle').value = '  Review the proposal  ';
  elements.get('#taskGoal').value = '';
  elements.get('#taskPriority').value = 'high';
  elements.get('#taskDate').value = '2026-10-01';
  const form = elements.get('#taskForm');
  form.handlers.submit({ preventDefault() {}, target: form });
  const [task] = JSON.parse(storage.get(C.ACCOUNT_KEY)).qa.data.tasks;
  assert.equal(task.title, 'Review the proposal');
  assert.equal(task.priority, 'high');
  assert.equal(task.impact, 20);
  assert.equal(task.date, '2026-10-01');
  assert.equal(task.done, false);
});
