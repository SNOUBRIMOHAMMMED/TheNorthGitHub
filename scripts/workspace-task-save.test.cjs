const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const C=require('../core.js');
test('simplified workspace task form saves and omitted subtasks do not erase existing ones',async()=>{
 const mem=new Map();
 const context={window:{LifeCore:C,LifeLegacy:{renderAll(){}},addEventListener(){}},
 document:{documentElement:{lang:'en'},addEventListener(){},querySelector:s=>s==='#lxDialog'?{close(){}}:null},
 localStorage:{getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v)},setInterval(){},setTimeout(){},clearTimeout(){},navigator:{},console,
 FormData:function(form){return Object.entries(form.values);}};
 const source=fs.readFileSync(path.join(__dirname,'../workspace.js'),'utf8').replace('function render() {','function render() { return;').replace('window.LifeWorkspace = {','window.auditSubmit=submit;\n  window.LifeWorkspace = {');
 vm.runInNewContext(source,context);
 mem.set(C.SESSION_KEY,'qa');mem.set(C.ACCOUNT_KEY,JSON.stringify({qa:{data:C.migrate({profile:{email:'qa'},tasks:[{id:'existing',title:'Old',subtasks:[{title:'Keep me',done:true}]}],goals:[]})}}));
 const save=async(id,values)=>context.window.auditSubmit({preventDefault(){},target:{id:'lxEntityForm',dataset:{kind:'tasks',id},values,elements:{},querySelector:()=>null}});
 await save('',{title:'New task',status:'todo'});
 let tasks=JSON.parse(mem.get(C.ACCOUNT_KEY)).qa.data.tasks;
 assert.equal(tasks.length,2);assert.equal(tasks[0].title,'New task');assert.deepEqual(tasks[0].subtasks,[]);
 await save('existing',{title:'Edited task',status:'todo'});
 tasks=JSON.parse(mem.get(C.ACCOUNT_KEY)).qa.data.tasks;
 assert.deepEqual(tasks.find(t=>t.id==='existing').subtasks,[{title:'Keep me',done:true}]);
 await save('existing',{title:'Edited task',status:'todo',subtaskText:'[x] Done\nNext'});
 tasks=JSON.parse(mem.get(C.ACCOUNT_KEY)).qa.data.tasks;
 assert.deepEqual(tasks.find(t=>t.id==='existing').subtasks,[{title:'Done',done:true},{title:'Next',done:false}]);
});
