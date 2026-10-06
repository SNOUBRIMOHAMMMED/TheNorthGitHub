const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const C = require('../core.js');

const TODAY = '2026-10-06';
const copy = value => JSON.parse(JSON.stringify(value));

function manifest() {
  const plan = {id: 'study-plan', name: 'Four-week practice checklist', startDate: TODAY,
    endDate: '2027-01-01', phaseEndDate: '', targetMinutes: 15840, baselineProgress: 0, steps: []};
  const tasks = [];
  for (let offset = 0; offset < 28; offset++) {
    const stamp = new Date(TODAY + 'T12:00:00Z');
    stamp.setUTCDate(stamp.getUTCDate() + offset);
    const date = stamp.toISOString().slice(0, 10);
    const preparationDay = [0, 2, 5].includes(stamp.getUTCDay());
    for (let order = 1; order <= (preparationDay ? 28 : 25); order++) {
      const id = `study-${date}-${order}`;
      const weightMinutes = preparationDay ? (order <= 25 ? 6 : 10) : 7.2;
      plan.steps.push({id, date, weightMinutes});
      tasks.push({id, title: `Practice ${date} step ${order}`, goalId: 'study-goal', planId: plan.id,
        date, weightMinutes, checklistOrder: order, checklistGroup: order <= 25 ? 'Practice' : 'Preparation'});
    }
    plan.phaseEndDate = date;
  }
  return {type: 'north-checklist-plan', schemaVersion: 1, goalId: 'study-goal', plan, tasks};
}

function workspace(withPlan = true) {
  const data = C.migrate({profile: {email: 'synthetic-qa'},
    goals: [{id: 'study-goal', name: 'Study', progress: 0},
      {id: 'ordinary-goal', name: 'Launch', progress: 42, notes: 'Keep my notes'}],
    tasks: [{id: 'ordinary-task', title: 'Prepare proposal', goalId: 'ordinary-goal',
      date: '2026-09-30', priority: 'high', subtasks: [{title: 'Keep this', done: true}]}]});
  if (withPlan) C.applyChecklistPlan(data, manifest());
  return data;
}

function harness(data = workspace(), lang = 'en') {
  // Each VM uses synthetic, in-memory storage; no browser or account data is touched.
  const mem = new Map();
  const notice = {textContent: '', className: '', classList: {remove() {}}};
  const dialog = {open: false, innerHTML: '', querySelector() {return null;},
    showModal() {this.open = true;}, close() {this.open = false;}};
  const ctx = {window: {LifeCore: {...C, day: value => value === undefined ? TODAY : C.day(value)},
      LifeLegacy: {renderAll() {}}, addEventListener() {}},
    document: {documentElement: {lang}, addEventListener() {},
      querySelector: selector => selector === '#lxDialog' ? dialog : selector === '#lxNotice' ? notice : null},
    localStorage: {getItem: key => mem.get(key) || null, setItem: (key, value) => mem.set(key, value)},
    setInterval() {}, setTimeout() {}, clearTimeout() {}, navigator: {}, console,
    FormData: function(form) {return Object.entries(form.values);}};
  const source = fs.readFileSync(path.join(__dirname, '../workspace.js'), 'utf8')
    .replace('function render() {', 'function render() { return;')
    .replace('window.LifeWorkspace = {', `window.auditChecklist = {
      checklistPanel, checklistTaskList, v3GoalDetail, onChecklistToggle, onChange, editor,
      tasks: (d, filter = "all") => {taskFilter = filter; return tasks(d);}, onClick, submit
    }; window.LifeWorkspace = {`);
  vm.runInNewContext(source, ctx);
  mem.set(C.SESSION_KEY, 'synthetic-qa');
  mem.set(C.ACCOUNT_KEY, JSON.stringify({'synthetic-qa': {data}}));
  const read = () => JSON.parse(mem.get(C.ACCOUNT_KEY))['synthetic-qa'].data;
  const save = (id, values) => ctx.window.auditChecklist.submit({preventDefault() {}, target: {
    id: 'lxEntityForm', dataset: {kind: 'tasks', id}, values, elements: {}, querySelector() {return null;}}});
  const action = (action, id) => ctx.window.auditChecklist.onClick({preventDefault() {},
    stopImmediatePropagation() {}, target: {closest: () => ({dataset: {action, id},
      matches: () => false, closest: () => null})}});
  return {audit: ctx.window.auditChecklist, app: ctx.window.LifeWorkspace, read, save, action, mem, notice, dialog};
}

const rows = html => (html.match(/class="lx-task-row(?: [^"]*)?"/g) || []).length;
const detailTags = html => html.match(/<details\b[^>]*data-checklist-key="[^"]+"[^>]*>/g) || [];
const keyOf = tag => tag.match(/data-checklist-key="([^"]+)"/)[1];
const isOpen = tag => /\sopen(?:\s|>)/.test(tag);

test('adding a study plan leaves ordinary goal rendering and recorded progress unchanged', () => {
  const data = workspace(false), before = copy(data.goals[1]), h = harness(data);
  const beforeHtml = h.audit.v3GoalDetail(data.goals[1], data);
  C.applyChecklistPlan(data, manifest());
  const afterHtml = h.audit.v3GoalDetail(data.goals[1], data);
  assert.equal(afterHtml, beforeHtml);
  assert.deepEqual(data.goals[1], before);
  assert.equal(C.goalProgress(data.goals[1], data), 42);
  assert.doesNotMatch(afterHtml, /north-checklist-panel|undefined|NaN/);
});

test('the selected study day includes deleted steps with restore and excludes every other day', () => {
  const data = workspace(), selected = data.tasks.find(task => task.planId && task.date === TODAY);
  C.completeTask(data, selected.id, true);
  selected.archived = true;
  const h = harness(data), goal = data.goals[0];
  let html = h.audit.checklistPanel(goal, data);
  assert.ok(html.includes(selected.title));
  assert.match(html, new RegExp(`data-action="task-restore" data-id="${selected.id}"`));
  assert.equal(rows(html), data.tasks.filter(task => task.planId && task.date === TODAY).length);
  assert.ok(!html.includes('Practice 2026-10-07 step 1'));
  assert.doesNotMatch(html, /No steps scheduled|undefined|NaN/);
  h.audit.onChange({target: {name: 'checklistDate', value: '2026-10-07', dataset: {checklistGoal: goal.id}}});
  html = h.audit.checklistPanel(goal, data);
  assert.ok(html.includes('Practice 2026-10-07 step 1'));
  assert.ok(!html.includes(selected.title));
  assert.equal(rows(html), data.tasks.filter(task => task.planId && task.date === '2026-10-07').length);
});

test('deleting all of a day’s steps retains their restore controls and fixed daily target', () => {
  const data = workspace();
  const daily = data.tasks.filter(task => task.planId && task.date === TODAY);
  daily.forEach(task => {task.archived = true;});
  const html = harness(data).audit.checklistPanel(data.goals[0], data);
  assert.equal(rows(html), daily.length);
  assert.equal((html.match(/data-action="task-restore"/g) || []).length, daily.length);
  assert.doesNotMatch(html, /No steps scheduled/);
  assert.ok(Math.abs(C.checklistReport(data.goals[0], data, TODAY).dailyTargetMinutes - 180) < 1e-6);
});

test('the 736-step Tasks list initially renders today and ordinary tasks, then loads only the opened day', () => {
  const data = workspace(), h = harness(data);
  assert.equal(data.tasks.filter(task => task.planId).length, 736);
  let html = h.audit.tasks(data);
  assert.equal(rows(html), 1 + data.tasks.filter(task => task.planId && task.date === TODAY).length);
  assert.equal(detailTags(html).length, 28);
  assert.ok(html.includes('Prepare proposal'));
  assert.ok(!html.includes('Practice 2026-10-07 step 1'));
  const futureTag = detailTags(html).find(tag => tag.includes('data-checklist-day="2026-10-07"'));
  assert.ok(futureTag);
  assert.equal(isOpen(futureTag), false);
  const loadedRows = {dataset: {}, innerHTML: ''};
  h.audit.onChecklistToggle({target: {open: true,
    dataset: {checklistKey: keyOf(futureTag), checklistDay: '2026-10-07'},
    querySelector: () => loadedRows}});
  assert.equal(rows(loadedRows.innerHTML), data.tasks.filter(task => task.planId && task.date === '2026-10-07').length);
  assert.ok(loadedRows.innerHTML.includes('Practice 2026-10-07 step 1'));
  assert.ok(!loadedRows.innerHTML.includes('Practice 2026-10-08 step 1'));
  html = h.audit.tasks(h.read());
  assert.equal(isOpen(detailTags(html).find(tag => keyOf(tag) === keyOf(futureTag))), true);
});

test('planned task edits preserve the scheduled day and goal while allowing title and priority changes', async () => {
  const data = workspace(), task = data.tasks.find(item => item.planId);
  C.completeTask(data, task.id, true);
  const h = harness(data), before = C.checklistReport(data.goals[0], data, task.date);
  h.audit.editor('tasks', task.id);
  assert.match(h.dialog.innerHTML, /<select[^>]*name="goalId"[^>]*disabled/);
  assert.match(h.dialog.innerHTML, /<input[^>]*name="date"[^>]*readonly/);
  await h.save(task.id, {title: 'My clearer practice instruction', priority: 'high',
    goalId: 'ordinary-goal', projectId: 'foreign-project', date: '2026-10-07'});
  const saved = h.read(), edited = saved.tasks.find(item => item.id === task.id);
  assert.equal(edited.goalId, task.goalId);
  assert.equal(edited.projectId, task.projectId);
  assert.equal(edited.date, task.date);
  assert.equal(edited.done, true);
  assert.equal(edited.title, 'My clearer practice instruction');
  assert.equal(edited.priority, 'high');
  assert.deepEqual(C.checklistReport(saved.goals[0], saved, task.date), before);
});

test('ordinary tasks retain editable dates and goal links', async () => {
  const h = harness();
  h.audit.editor('tasks', 'ordinary-task');
  assert.doesNotMatch(h.dialog.innerHTML, /<select[^>]*name="goalId"[^>]*disabled/);
  assert.doesNotMatch(h.dialog.innerHTML, /<input[^>]*name="date"[^>]*readonly/);
  await h.save('ordinary-task', {title: 'Updated proposal', goalId: 'study-goal', date: '2026-10-08'});
  const saved = h.read().tasks.find(task => task.id === 'ordinary-task');
  assert.equal(saved.goalId, 'study-goal');
  assert.equal(saved.date, '2026-10-08');
  assert.deepEqual(saved.subtasks, [{title: 'Keep this', done: true}]);
});

test('checking a step preserves its expanded group and an expanded future day across renders', async () => {
  const h = harness(), data = h.read(), goal = data.goals[0];
  const groupTag = detailTags(h.audit.checklistPanel(goal, data))[0];
  const groupKey = keyOf(groupTag);
  h.audit.onChecklistToggle({target: {open: true, dataset: {checklistKey: groupKey}, querySelector: () => null}});
  const futureTag = detailTags(h.audit.tasks(data)).find(tag => tag.includes('data-checklist-day="2026-10-07"'));
  const dayKey = keyOf(futureTag);
  h.audit.onChecklistToggle({target: {open: true, dataset: {checklistKey: dayKey}, querySelector: () => null}});
  const task = data.tasks.find(item => item.planId && item.date === TODAY);
  await h.action('task-toggle', task.id);
  const saved = h.read();
  assert.equal(saved.tasks.find(item => item.id === task.id).done, true);
  assert.equal(isOpen(detailTags(h.audit.checklistPanel(saved.goals[0], saved)).find(tag => keyOf(tag) === groupKey)), true);
  assert.equal(isOpen(detailTags(h.audit.tasks(saved)).find(tag => keyOf(tag) === dayKey)), true);
  h.audit.onChecklistToggle({target: {open: false, dataset: {checklistKey: groupKey}, querySelector: () => null}});
  assert.equal(isOpen(detailTags(h.audit.checklistPanel(saved.goals[0], saved)).find(tag => keyOf(tag) === groupKey)), false);
});

test('invalid study-plan imports show localized, specific feedback and preserve the workspace', async () => {
  for (const [lang, expected] of [['en', /This study plan is invalid or conflicts with existing steps/],
    ['ar', /خطة الدراسة غير صالحة أو تتعارض مع خطوات موجودة/]]) {
    const h = harness(workspace(), lang), before = h.mem.get(C.ACCOUNT_KEY);
    await h.app.importData({type: 'north-checklist-plan', schemaVersion: 1, goalId: 'missing-goal'});
    assert.match(h.notice.textContent, expected);
    assert.equal(h.mem.get(C.ACCOUNT_KEY), before);
    assert.equal(h.dialog.open, false);
  }
});
