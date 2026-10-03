const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const C=require('../core.js');
test('home renders existing goals, linked next action and weekly report after navigation',()=>{
 const context={window:{LifeCore:C,addEventListener(){}},document:{documentElement:{lang:'en'},addEventListener(){},querySelector:()=>null},
 localStorage:{getItem:()=>null},setInterval(){},setTimeout(){},clearTimeout(){},navigator:{},console};
 const source=fs.readFileSync(path.join(__dirname,'../workspace.js'),'utf8').replace('window.LifeWorkspace = {','window.auditHome=home; window.auditGoalTone=goalTone;\n  window.LifeWorkspace = {');
 vm.runInNewContext(source,context);
 const d=C.migrate({profile:{name:'Test'},goals:[{id:'g',name:'Launch',progress:42,startDate:'2026-09-01',deadline:'2026-12-31'}],tasks:[{id:'t',title:'Write proposal',goalId:'g',priority:'high'}]});
 const result=context.window.auditHome(d);
 assert.match(result,/Launch/); assert.match(result,/Write proposal/); assert.match(result,/Focus time this week/);
 assert.doesNotMatch(result,/undefined|NaN/);
 assert.equal(context.window.auditGoalTone(d,d.goals[0]),d.goals[0].color);
 assert.equal(context.window.auditGoalTone(d,{color:'red;position:fixed'}),'#c9b4e9');
 assert.equal(context.window.auditGoalTone(d,{color:'#123abc'}),'#123abc');
});
