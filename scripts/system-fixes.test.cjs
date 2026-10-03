const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const C=require('../core.js');
function workspace(){
 const ctx={window:{LifeCore:C,addEventListener(){}},document:{documentElement:{lang:'en'},addEventListener(){},querySelector:()=>null},localStorage:{getItem:()=>null},setInterval(){},setTimeout(){},clearTimeout(){},navigator:{},console};
 const src=fs.readFileSync(require('node:path').join(__dirname,'../workspace.js'),'utf8').replace('window.LifeWorkspace = {','window.auditFocusPage=(d)=>{route="focus";return page(d);}; window.audit={focusPage:window.auditFocusPage,home,v3GoalDetail,getStartingBalance,getDebts,getFinancePlan,getCategoryInfo,expenseGroups}; window.LifeWorkspace = {');
 vm.runInNewContext(src,ctx); return ctx.window.audit;
}
test('completed tasks do not overwrite an outcome goal or invent planned progress',()=>{
 const d=C.migrate({profile:{},goals:[{id:'g',name:'Launch',progress:42}],tasks:[{id:'t',goalId:'g',title:'Proposal',done:true}]});
 assert.equal(C.goalProgress(d.goals[0],d),42);
 assert.equal(C.plannedGoalProgress(d.goals[0]),null);
 const w=workspace(); assert.match(w.home(d),/42%/); assert.match(w.v3GoalDetail(d.goals[0],d),/42%/);
});
test('time progress uses explicit target hours and preserves legacy progress',()=>{
 const goal={id:'g',name:'Launch',progress:42,targetHours:365};
 const d=C.migrate({profile:{},goals:[goal],tasks:[],sessions:[{id:'s',goalId:'g',status:'completed',startedAt:Date.now()-3600000,endedAt:Date.now(),segments:[{kind:'focus',start:1000,end:3601000}],totalDuration:3600000,type:'stopwatch'}]});
 assert.equal(C.goalProgress(goal,d),42);
 goal.progressMode='time'; assert.equal(C.goalProgress(goal,d),0.3);
 goal.targetHours=30; assert.equal(C.goalProgress(goal,d),3.3);
 goal.targetHours=0; assert.equal(C.goalProgress(goal,d),0);
});
test('empty accounts have no invented balance debts or income plan',()=>{
 const w=workspace(),d=C.migrate({profile:{},goals:[],tasks:[]});
 assert.equal(w.getStartingBalance(d,'2026-10'),0);
 assert.equal(w.getDebts(d).length,0);
 assert.equal(w.getFinancePlan(d,'2026-10').income.length,0);
 assert.equal(w.getFinancePlan(d,'2026-10').expenses.length,0);
});
test('expense categories do not match income tools and custom expenses remain visible',()=>{
 const w=workspace(); const tools=w.getCategoryInfo('Tools','expense');
 assert.equal(tools.type,'expense');
 const rows=[{type:'expense',category:'Tools',amount:120},{type:'expense',category:'Old supplier',amount:80},{type:'income',category:'Salary',amount:1000}];
 const groups=w.expenseGroups(rows); assert.equal(groups.reduce((n,x)=>n+x.amount,0),20000);
 assert.equal(groups.length,2);
});

test('focus remains a valid internal destination without reintroducing it into main navigation',()=>{
 const source=fs.readFileSync(require('node:path').join(__dirname,'../workspace.js'),'utf8');
 assert.match(source,/focus: \["Focus", "التركيز"\]/);
 assert.match(source,/const primaryRoutes = \["home", "goals", "tasks", "finances", "analytics"\]/);
});

test('internal focus route renders actual timer controls after task-linked start',()=>{
 const d=C.migrate({profile:{},goals:[{id:'g',name:'Launch'}],tasks:[{id:'t',title:'Proposal',goalId:'g'}]});
 C.createSession(d,{taskId:'t',type:'pomodoro'});
 const html=workspace().focusPage(d);
 assert.match(html,/id="lxTimer"/); assert.match(html,/Proposal/); assert.match(html,/data-action="session-pause"/);
});
test('finance plans accept both old source and category fields without mutating records',()=>{
 const d=C.migrate({profile:{},goals:[],tasks:[]});
 d.settings.financePlans={'2026-10':{income:[{category:'Consulting',amount:300},{source:'Salary',amount:500}],expenses:[]}};
 const original=JSON.stringify(d); const plan=workspace().getFinancePlan(d,'2026-10');
 assert.equal(plan.income[0].source,'Consulting'); assert.equal(plan.income[1].source,'Salary'); assert.equal(JSON.stringify(d),original);
});
