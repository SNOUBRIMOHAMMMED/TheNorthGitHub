const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const C=require('../core.js');

test('50 minute Pomodoro reports linked goal work, excludes breaks and preserves historical links',()=>{
 const g={id:'g',name:'Communication',progressMode:'time',targetHours:100};
 const d=C.migrate({profile:{},goals:[g],tasks:[{id:'t',goalId:'g',title:'Practice'}],sessions:[{id:'s',taskId:'t',goalId:'',status:'completed',startedAt:1000,totalDuration:3000000,segments:[{kind:'focus',start:1000,end:3001000},{kind:'break',start:3001000,end:3301000}]}]});
 const before=JSON.stringify(d.sessions);
 assert.equal(C.duration(C.reportSessions(d),0,Infinity,s=>s.goalId==='g'),3000000);
 assert.equal(C.goalProgress(g,d),0.8);
 assert.equal(JSON.stringify(d.sessions),before);
 d.sessions[0].goalId='old-goal';
 assert.equal(C.duration(C.reportSessions(d),0,Infinity,s=>s.goalId==='g'),0);
});

test('daily goal plan scales over calendar days and explicit total overrides it',()=>{
 const g={startDate:'2026-01-01',deadline:'2026-12-31',dailyMinutes:60};
 assert.equal(C.goalTargetHours(g),365);
 assert.equal(C.goalTargetHours({...g,targetHours:30}),30);
 assert.equal(C.goalTargetHours({...g,deadline:'2025-12-31'}),0);
 assert.equal(C.goalTargetHours({dailyMinutes:60}),0);
});

test('goal detail shows actual time and escaped session accomplishments',()=>{
 const ctx={window:{LifeCore:C,addEventListener(){}},document:{documentElement:{lang:'en'},addEventListener(){},querySelector:()=>null},localStorage:{getItem:()=>null},setInterval(){},setTimeout(){},clearTimeout(){},navigator:{},console};
 const src=fs.readFileSync(require('node:path').join(__dirname,'../workspace.js'),'utf8').replace('window.LifeWorkspace = {','window.goalView=v3GoalDetail; window.LifeWorkspace = {');
 vm.runInNewContext(src,ctx);
 const d=C.migrate({profile:{},goals:[{id:'g',name:'Practice',targetHours:100}],tasks:[{id:'t',title:'Interview',goalId:'g'}],sessions:[{id:'s',goalId:'g',taskId:'t',startedAt:Date.now(),status:'completed',notes:'Finished <script>',segments:[{kind:'focus',start:1000,end:3001000}]}]});
 const html=ctx.window.goalView(d.goals[0],d);
 assert.match(html,/50m/); assert.match(html,/Finished &lt;script&gt;/); assert.match(html,/Work log/);
});
