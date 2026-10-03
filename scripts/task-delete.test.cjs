const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('../core.js');
function harness(){
 const mem=new Map();
 const ctx={window:{LifeCore:C,LifeLegacy:{renderAll(){}},addEventListener(){}},document:{documentElement:{lang:'en'},addEventListener(){},querySelector:()=>null},localStorage:{getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v)},setInterval(){},setTimeout(){},clearTimeout(){},navigator:{},console};
 let source=fs.readFileSync(require('node:path').join(__dirname,'../workspace.js'),'utf8').replace('function render() {','function render() { return;').replace('window.LifeWorkspace = {','window.auditClick=onClick; window.auditTasks=(d,f)=>{taskFilter=f;return tasks(d);}; window.LifeWorkspace = {');
 vm.runInNewContext(source,ctx);
 const d=C.migrate({profile:{email:'qa'},goals:[{id:'g',name:'Launch',progress:42}],tasks:[{id:'t',title:'Proposal',goalId:'g',subtasks:[{title:'Keep',done:true}]}]});
 C.manual(d,{title:'Work',taskId:'t',goalId:'g',start:'2026-10-01T09:00',end:'2026-10-01T10:00'});
 mem.set(C.SESSION_KEY,'qa');mem.set(C.ACCOUNT_KEY,JSON.stringify({qa:{data:d}}));
 const read=()=>JSON.parse(mem.get(C.ACCOUNT_KEY)).qa.data;
 const action=async(a)=>ctx.window.auditClick({preventDefault(){},stopImmediatePropagation(){},target:{closest:()=>({dataset:{action:a,id:'t'},matches:()=>false,closest:()=>null})}});
 return {ctx,read,action,mem};
}
test('task deletion is reversible and preserves linked goal, subtasks and recorded time',async()=>{
 const h=harness(),before=h.read();
 await h.action('task-delete');let d=h.read();assert.equal(d.tasks[0].archived,true);assert.deepEqual(d.sessions,before.sessions);assert.deepEqual(d.goals,before.goals);assert.deepEqual(d.tasks[0].subtasks,before.tasks[0].subtasks);
 assert.doesNotMatch(h.ctx.window.auditTasks(d,'all'),/Proposal/);
 assert.match(h.ctx.window.auditTasks(d,'deleted'),/Proposal/);assert.match(h.ctx.window.auditTasks(d,'deleted'),/task-restore/);
 await h.action('task-restore');d=h.read();assert.equal(d.tasks[0].archived,false);assert.match(h.ctx.window.auditTasks(d,'all'),/Proposal/);assert.doesNotMatch(h.ctx.window.auditTasks(d,'deleted'),/Proposal/);
});
test('the task used by an active focus session cannot be deleted',async()=>{
 const h=harness();const d=h.read();C.createSession(d,{taskId:'t',type:'stopwatch'});h.mem.set(C.ACCOUNT_KEY,JSON.stringify({qa:{data:d}}));
 await h.action('task-delete');assert.equal(!!h.read().tasks[0].archived,false);assert.equal(h.read().activeSession.taskId,'t');
});


