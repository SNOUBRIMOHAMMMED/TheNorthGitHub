const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const C=require('../core.js');

test('conflict opens recovery options and retry gives feedback without selecting a copy',async()=>{
 let report, resolves=0, exports=0, focused=false;
 const outer={open:false}, choices={open:false}, status={textContent:''};
 const toast={textContent:'',className:''};
 const mem=new Map([[C.ACCOUNT_KEY,JSON.stringify({'audit@example.test':{data:C.migrate({profile:{email:'audit@example.test',lang:'en'},tasks:[],goals:[]})}})]]);
 const context={window:{LifeCore:C,NorthAuth:{client:{}},NorthCloud:{create:options=>{
  report=options.status;
  return {resume:async()=>{report('conflict');return false;},resolve:async()=>{resolves++;report('saved');return true;},sync:async()=>false};
 }},addEventListener(){}},document:{documentElement:{lang:'en'},addEventListener(){},
 querySelectorAll:selector=>selector==='[data-cloud-status]'?[status]:selector==='[data-cloud-conflict]'?[choices]:selector==='[data-cloud-panel]'?[outer]:[],
 querySelector:selector=>selector==='#lxNotice'?toast:selector==='[data-cloud-conflict] summary'?{focus(){focused=true;}}:selector==='#exportBtn'?{click(){exports++;}}:null},
 localStorage:{getItem:key=>mem.get(key)||null,setItem:(key,value)=>mem.set(key,value)},setInterval(){},setTimeout(){},clearTimeout(){},navigator:{},console};
 const source=fs.readFileSync(path.join(__dirname,'../workspace.js'),'utf8').replace('window.LifeWorkspace = {','window.auditClick=onClick; window.auditCloudPanel=cloudPanel;\n  window.LifeWorkspace = {');
 vm.runInNewContext(source,context);
 mem.set(C.SESSION_KEY,'audit@example.test');
 report('conflict'); assert.equal(outer.open,true); assert.equal(choices.open,true);
 assert.match(context.window.auditCloudPanel(),/data-cloud-conflict open/);
 const click=async action=>{const button={dataset:{action},textContent:'Retry',matches:()=>false,closest:()=>null};await context.window.auditClick({target:{closest:()=>button},preventDefault(){},stopImmediatePropagation(){}});assert.equal(button.disabled,false);assert.equal(button.textContent,'Retry');};
 await click('cloud-sync'); assert.equal(resolves,0); assert.equal(focused,true); assert.match(toast.textContent,/Choose the copy/);
 await context.window.auditClick({target:{closest:()=>({dataset:{action:'cloud-backup'},matches:()=>false,closest:()=>null})},preventDefault(){},stopImmediatePropagation(){}});
 assert.equal(exports,1);
 await click('cloud-local'); assert.equal(resolves,1); assert.equal(choices.open,false); assert.match(status.textContent,/saved/i);
});
