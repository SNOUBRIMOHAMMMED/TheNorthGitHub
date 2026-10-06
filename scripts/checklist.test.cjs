const {test} = require('node:test');
const assert = require('node:assert/strict');
const C = require('../core.js');
const Cloud = require('../cloud-sync.js');
const copy = value => JSON.parse(JSON.stringify(value));
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);

function workspace() {
  return C.migrate({
    profile: {email: 'learner@example.invalid', name: 'Learner', lang: 'en'},
    settings: {dailyHours: 6, currency: 'MAD'},
    goals: [{id: 'english-goal', name: 'English', progressMode: 'outcome', progress: 0, momentum: 12,
      projectId: 'existing-project', deadline: '2026-12-01', startDate: '2026-09-01', dailyMinutes: 60,
      why: 'Speak confidently', identity: 'A consistent learner', notes: 'Keep these notes',
      plan: {week: 'Existing milestone'}, history: [{date: '2026-09-30', value: 12}]},
      {id: 'other-goal', name: 'Other goal', progress: 42}],
    tasks: [{id: 'old-task', title: 'Previous English task', goalId: 'english-goal', date: '2026-09-30',
      done: false, impact: 5, progressImpact: 10}],
    projects: [{id: 'existing-project', name: 'Existing project'}],
    sessions: [{id: 'old-session', taskId: 'old-task', goalId: 'english-goal', status: 'completed',
      startedAt: 1000, endedAt: 6001000, segments: [{kind: 'focus', start: 1000, end: 6001000}]}],
    notes: [{id: 'old-note', title: 'Keep this'}], events: [{id: 'old-event', title: 'Keep event'}],
    habits: [{id: 'old-habit', title: 'Keep habit', checks: ['2026-09-30']}],
    inbox: [{id: 'old-inbox', title: 'Keep inbox'}], finances: [{id: 'old-finance', amount: 10}],
    health: [{id: 'old-health', title: 'Keep health'}], learning: [{id: 'old-learning', title: 'Keep learning'}],
    notifications: [{id: 'old-notification', title: 'Keep notification'}],
    planning: {'daily:2026-09-30': {notes: 'Keep planning'}}, dismissed: {old: true},
    customWorkspaceField: {keep: true},
  });
}

function manifest(phaseDays = 28, baselineProgress = 0) {
  const plan = {id: 'english-checklist-plan', name: 'Four-week practice checklist',
    startDate: '2026-10-06', endDate: '2027-01-01', phaseEndDate: '', targetMinutes: 15840,
    baselineProgress, steps: []};
  const tasks = [];
  for (let offset = 0; offset < phaseDays; offset++) {
    const stamp = new Date('2026-10-06T12:00:00Z');
    stamp.setUTCDate(stamp.getUTCDate() + offset);
    const date = stamp.toISOString().slice(0, 10);
    const preparationDay = [0, 2, 5].includes(stamp.getUTCDay());
    const count = preparationDay ? 28 : 25;
    for (let order = 1; order <= count; order++) {
      const weightMinutes = preparationDay ? (order <= 25 ? 6 : 10) : 7.2;
      const id = `checklist-${date}-${order}`;
      plan.steps.push({id, date, weightMinutes});
      tasks.push({id, title: `Daily activity ${order}`, goalId: 'english-goal', planId: plan.id,
        date, weightMinutes, checklistOrder: order, checklistGroup: order <= 25 ? 'Practice' : 'Preparation',
        description: 'A concrete practice step', tags: ['English', 'Checklist'],
        done: false, status: 'todo', recurring: 'none', subtasks: [], completedDate: '',
        archived: false, impact: 0, progressImpact: 0});
    }
    plan.phaseEndDate = date;
  }
  return {type: 'north-checklist-plan', schemaVersion: 1, goalId: 'english-goal', plan, tasks};
}

function imported() {
  const data = workspace(), input = manifest();
  const result = C.applyChecklistPlan(data, input);
  return {data, input, result, goal: data.goals[0]};
}

test('a complete daily checklist reaches daily 100% and advances only its share of the full goal', () => {
  const {data, input, goal} = imported();
  assert.equal(input.tasks.length, 736);
  const daily = input.tasks.filter(task => task.date === '2026-10-06');
  daily.forEach(task => C.completeTask(data, task.id, true));
  const report = C.checklistReport(goal, data, '2026-10-06');
  assert.equal(report.dailyPercent, 100);
  assert.equal(report.phasePercent, 3.57);
  assert.equal(report.goalPercent, 1.14);
  near(report.completedMinutes, 180);
  near(report.totalMinutes, 5040);
  near(report.dailyCompletedMinutes, 180);
  near(report.dailyTargetMinutes, 180);
  assert.equal(C.goalProgress(goal, data), 1.14);
  assert.equal(goal.targetHours, 264);
});

test('finishing the imported four weeks gives phase 100%, not completion of the longer goal', () => {
  const {data, input, goal} = imported();
  input.tasks.forEach(task => C.completeTask(data, task.id, true));
  const report = C.checklistReport(goal, data, input.plan.phaseEndDate);
  assert.equal(report.phasePercent, 100);
  assert.equal(report.dailyPercent, 100);
  assert.equal(report.goalPercent, 31.82);
  assert.equal(goal.progress, 0);
  assert.equal(data.sessions.length, 1);
  assert.equal(C.duration(data.sessions), 6000000);
});

test('checking again cannot accumulate progress and undo restores the exact checklist state', () => {
  const {data, input, goal} = imported();
  const task = input.tasks[0];
  C.completeTask(data, task.id, true);
  const once = C.checklistReport(goal, data, task.date);
  assert.equal(once.goalPercent, 0.04);
  C.completeTask(data, task.id, true);
  assert.deepEqual(C.checklistReport(goal, data, task.date), once);
  C.completeTask(data, task.id, false);
  assert.equal(C.goalProgress(goal, data), 0);
  assert.equal(C.checklistReport(goal, data, task.date).dailyPercent, 0);
  C.completeTask(data, task.id, true);
  assert.deepEqual(C.checklistReport(goal, data, task.date), once);
  C.completeTask(data, 'old-task', true);
  assert.equal(C.goalProgress(goal, data), once.goalPercent);
  assert.equal(goal.progress, 0);
});

test('archived completed work counts while archiving or removing unfinished work keeps the denominator', () => {
  const {data, input, goal} = imported();
  C.completeTask(data, input.tasks[0].id, true);
  const before = C.checklistReport(goal, data, '2026-10-06');
  data.tasks.find(task => task.id === input.tasks[0].id).archived = true;
  data.tasks.find(task => task.id === input.tasks[1].id).archived = true;
  data.tasks = data.tasks.filter(task => task.id !== input.tasks[2].id);
  assert.deepEqual(C.checklistReport(goal, data, '2026-10-06'), before);
  // Removing a completed record loses its evidence, but never the fixed planned denominator.
  data.tasks = data.tasks.filter(task => task.id !== input.tasks[0].id);
  const missing = C.checklistReport(goal, data, '2026-10-06');
  assert.equal(missing.completedMinutes, 0);
  assert.equal(missing.totalMinutes, before.totalMinutes);
  assert.equal(missing.dailyTargetMinutes, before.dailyTargetMinutes);
});

test('manifest membership and weights stay stable if mutable task scheduling fields change', () => {
  const {data, input, goal} = imported();
  C.completeTask(data, input.tasks[0].id, true);
  const expected = C.checklistReport(goal, data, input.tasks[0].date);
  Object.assign(data.tasks.find(task => task.id === input.tasks[0].id), {date: '2027-02-01', weightMinutes: 999});
  assert.deepEqual(C.checklistReport(goal, data, input.tasks[0].date), expected);
});

test('repeat imports are additive and preserve completed, archived, and edited task records', () => {
  const {data, input, goal} = imported();
  C.completeTask(data, input.tasks[0].id, true);
  const edited = data.tasks.find(task => task.id === input.tasks[0].id);
  Object.assign(edited, {archived: true, title: 'My edited title', priority: 'high', tags: ['My tag'], personalNote: 'Keep'});
  const beforeTasks = copy(data.tasks), beforeProgress = C.goalProgress(goal, data);
  const result = C.applyChecklistPlan(data, input);
  assert.deepEqual(result.addedTaskIds, []);
  assert.equal(result.skippedTaskIds.length, 736);
  assert.deepEqual(data.tasks, beforeTasks);
  assert.equal(C.goalProgress(goal, data), beforeProgress);
});

test('import preserves all existing collections, goal details, and the live clock without creating sessions', () => {
  const data = workspace();
  C.createSession(data, {taskId: 'old-task', type: 'stopwatch'}, 1000);
  const before = copy(data), clock = data.activeSession;
  C.applyChecklistPlan(data, manifest());
  for (const key of Object.keys(before)) {
    if (!['goals', 'tasks'].includes(key)) assert.deepEqual(data[key], before[key], key);
  }
  assert.equal(data.activeSession, clock);
  assert.deepEqual(data.tasks[0], before.tasks[0]);
  assert.deepEqual(data.goals[1], before.goals[1]);
  const config = new Set(['deadline', 'startDate', 'dailyMinutes', 'targetHours', 'progressMode', 'taskPlan']);
  for (const [key, value] of Object.entries(before.goals[0])) {
    if (!config.has(key)) assert.deepEqual(data.goals[0][key], value, `goal.${key}`);
  }
  assert.equal(data.sessions.length, 1);
  assert.equal(data.profile.email, before.profile.email);
});

test('imported metadata is isolated from later edits to the manifest and survives backup validation', () => {
  const {data, input, goal} = imported();
  const originalPlan = copy(goal.taskPlan);
  input.plan.steps[0].weightMinutes = 999;
  input.tasks[0].tags.push('Changed outside');
  assert.deepEqual(goal.taskPlan, originalPlan);
  assert.deepEqual(data.tasks.find(task => task.id === input.tasks[0].id).tags, ['English', 'Checklist']);
  const backup = C.validateImport(data);
  assert.deepEqual(backup.goals[0].taskPlan, goal.taskPlan);
  assert.equal(C.goalProgress(backup.goals[0], backup), 0);
});

test('a later phase may extend the same plan without replacing its completed prefix', () => {
  const {data, input, goal} = imported();
  C.completeTask(data, input.tasks[0].id, true);
  const first = copy(data.tasks.find(task => task.id === input.tasks[0].id));
  const later = manifest(56);
  const result = C.applyChecklistPlan(data, later);
  assert.equal(result.skippedTaskIds.length, 736);
  assert.equal(result.addedTaskIds.length, 736);
  assert.deepEqual(data.tasks.find(task => task.id === first.id), first);
  near(goal.taskPlan.steps.reduce((sum, step) => sum + step.weightMinutes, 0), 10080);
  assert.equal(C.goalProgress(goal, data), 0.04);
});

test('baseline progress is preserved separately from new checklist contributions and goalName is normalized', () => {
  const data = workspace();
  data.goals[0].progress = 20;
  const input = manifest(28, 20);
  input.goalName = '  English communication  ';
  C.applyChecklistPlan(data, input);
  assert.equal(data.goals[0].name, 'English communication');
  input.tasks.filter(task => task.date === '2026-10-06').forEach(task => C.completeTask(data, task.id, true));
  assert.equal(C.goalProgress(data.goals[0], data), 21.14);
  assert.equal(data.goals[0].progress, 20);
});

test('planned percentages and hours advance only through imported scheduled steps', () => {
  const {data, goal} = imported();
  assert.equal(C.plannedGoalProgress(goal, +new Date('2026-10-05T12:00:00')), 0);
  assert.equal(C.goalPlannedHours(goal, +new Date('2026-10-05T12:00:00')), 0);
  assert.equal(C.plannedGoalProgress(goal, +new Date('2026-10-06T12:00:00')), 1.14);
  near(C.goalPlannedHours(goal, +new Date('2026-10-06T12:00:00')), 3);
  assert.equal(C.plannedGoalProgress(goal, +new Date('2027-01-01T12:00:00')), 31.82);
  near(C.goalPlannedHours(goal, +new Date('2027-01-01T12:00:00')), 84);
  assert.equal(C.checklistReport(goal, data, '2026-11-03').dailyPercent, 0);
  assert.equal(C.checklistReport(goal, data, '2026-11-03').dailyTargetMinutes, 0);
});

test('independent device completions combine into derived progress without losing an increment', () => {
  const {data, input} = imported();
  const base = copy(data), local = copy(base), remote = copy(base);
  C.completeTask(local, input.tasks[0].id, true);
  C.completeTask(remote, input.tasks[1].id, true);
  const merged = Cloud.merge(base, local, remote);
  assert.equal(C.goalProgress(merged.goals[0], merged), 0.08);
  near(C.checklistReport(merged.goals[0], merged, '2026-10-06').completedMinutes, 12);
});

test('invalid manifests and reserved collisions are rejected atomically even after valid tasks were read', () => {
  const cases = [
    ['wrong type', (_, input) => {input.type = 'backup';}],
    ['wrong schema', (_, input) => {input.schemaVersion = 2;}],
    ['unknown root field', (_, input) => {input.ownerId = 'unexpected';}],
    ['missing goal', (_, input) => {input.goalId = 'missing';}],
    ['archived goal', data => {data.goals[0].archived = true;}],
    ['invalid date', (_, input) => {input.plan.phaseEndDate = '2026-10-32';}],
    ['invalid calendar date', (_, input) => {input.plan.startDate = '2026-02-30';}],
    ['wrong target', (_, input) => {input.plan.targetMinutes -= 180;}],
    ['wrong baseline', (_, input) => {input.plan.baselineProgress = 10;}],
    ['nonpositive weight', (_, input) => {input.plan.steps.at(-1).weightMinutes = 0;}],
    ['nonfinite weight', (_, input) => {input.plan.steps.at(-1).weightMinutes = Infinity;}],
    ['weight string', (_, input) => {input.plan.steps.at(-1).weightMinutes = '10';}],
    ['daily total mismatch', (_, input) => {input.plan.steps.at(-1).weightMinutes = 9; input.tasks.at(-1).weightMinutes = 9;}],
    ['outside phase', (_, input) => {input.plan.steps.at(-1).date = '2026-11-03'; input.tasks.at(-1).date = '2026-11-03';}],
    ['duplicate step', (_, input) => {input.plan.steps[1].id = input.plan.steps[0].id;}],
    ['duplicate task', (_, input) => {input.tasks[1].id = input.tasks[0].id;}],
    ['step task mismatch', (_, input) => {input.tasks.at(-1).date = '2026-10-06';}],
    ['foreign task collision', (_, input) => {input.plan.steps[0].id = 'old-task'; input.tasks[0].id = 'old-task';}],
    ['other collection collision', (_, input) => {input.plan.steps[0].id = 'old-note'; input.tasks[0].id = 'old-note';}],
    ['goal collision', (_, input) => {input.plan.steps[0].id = 'english-goal'; input.tasks[0].id = 'english-goal';}],
    ['plan collision', (_, input) => {input.plan.id = 'old-session';}],
    ['other plan collision', data => {data.goals[1].taskPlan = {id: 'english-checklist-plan', steps: []};}],
    ['missing foreign task reservation', (data, input) => {
      data.goals[1].taskPlan = {id: 'other-plan', steps: [{id: input.plan.steps[0].id}]};
    }],
    ['reserved identifier', (_, input) => {input.plan.steps[0].id = '__proto__'; input.tasks[0].id = '__proto__';}],
    ['fabricated completion', (_, input) => {input.tasks.at(-1).done = true;}],
    ['nonzero impact', (_, input) => {input.tasks.at(-1).progressImpact = 10;}],
    ['bad tags', (_, input) => {input.tasks.at(-1).tags = ['English', {}];}],
    ['bad description', (_, input) => {input.tasks.at(-1).description = {};}],
    ['blank rename', (_, input) => {input.goalName = '   ';}],
  ];
  for (const [label, change] of cases) {
    const data = workspace(), input = manifest();
    change(data, input);
    const before = copy(data);
    assert.throws(() => C.applyChecklistPlan(data, input), /invalidChecklistPlan/, label);
    assert.deepEqual(data, before, `${label} mutated existing data`);
  }
});

test('repeat import cannot change existing weights, remove the prefix, or take over another plan', () => {
  const mutations = [
    input => {input.plan.steps[0].weightMinutes = 5; input.tasks[0].weightMinutes = 5;
      input.plan.steps[1].weightMinutes = 7; input.tasks[1].weightMinutes = 7;},
    input => {input.plan.steps[0].id = 'replacement-step'; input.tasks[0].id = 'replacement-step';},
    input => {input.plan.id = 'different-plan'; input.tasks.forEach(task => {task.planId = input.plan.id;});},
  ];
  for (const change of mutations) {
    const {data, input} = imported();
    change(input);
    const before = copy(data);
    assert.throws(() => C.applyChecklistPlan(data, input), /invalidChecklistPlan/);
    assert.deepEqual(data, before);
  }
});
