const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const C=require('../core.js');
function harness(mode='pomodoro',fail=false){
 const results={innerHTML:''};
 const mem=new Map(),notices={textContent:''},location={hash:'#tasks'};
 const dialog={open:true,closed:0,innerHTML:'',scrollTop:0,close(){this.open=false;this.closed++},querySelector(s){
  if(s==='[data-qf-mode].active')return {dataset:{qfMode:mode}};
  if(s==='.v3-dur-pill.active')return {dataset:{dur:'25'}};
  if(s==='[name="customMinutes"]')return {value:mode==='countdown'?'90':''};
  if(s==='.lx-dialog-error')return notices;
  return null;
 }};
 const ctx={window:{LifeCore:C,LifeLegacy:{renderAll(){}},addEventListener(){},scrollTo(){},history:{pushState(a,b,url){location.hash=url}}},location,
  document:{documentElement:{lang:'en'},addEventListener(){},querySelector:s=>s==='#lxDialog'?dialog:s==='#lxNotice'?notices:s==='#lxSearchResults'?results:null},
  localStorage:{getItem:k=>mem.get(k)||null,setItem(k,v){if(fail)throw Object.assign(Error('quota'),{name:'QuotaExceededError'});mem.set(k,v)}},
  setInterval(){},setTimeout(){},clearTimeout(){},navigator:{},console,FormData:function(f){return Object.entries(f.values)}};
 const src=fs.readFileSync(path.join(__dirname,'../workspace.js'),'utf8').replace('function render() {','function render() { return;').replace('window.LifeWorkspace = {','window.audit={onClick,submit,taskRow,commandResults,renderPage:(r,d)=>{route=r;return page(d);},labels}; window.LifeWorkspace = {');
 vm.runInNewContext(src,ctx);
 const seed=d=>{mem.set(C.SESSION_KEY,'qa');mem.set(C.ACCOUNT_KEY,JSON.stringify({qa:{data:d}}));};
 seed(C.migrate({profile:{},goals:[{id:'g',name:'Launch',progress:42}],tasks:[{id:'t',title:'Proposal',goalId:'g'}],inbox:[{id:'i',title:'Invoice idea'}]}));
 const read=()=>JSON.parse(mem.get(C.ACCOUNT_KEY)).qa.data;
 const click=a=>ctx.window.audit.onClick({preventDefault(){},stopImmediatePropagation(){},target:{closest:()=>({dataset:{action:a,id:'t',taskId:'t',goalId:'g'},matches:()=>false,closest:()=>null})}});
 return {ctx,dialog,notices,results,read,seed,click,location};
}
test('stopwatch and custom countdown remain task-linked and start from quick focus',async()=>{
 for(const mode of ['stopwatch','countdown']){
  const h=harness(mode);await h.click('qf-launch');
  assert.equal(h.read().activeSession.type,mode);assert.equal(h.read().activeSession.goalId,'g');
  assert.equal(h.read().activeSession.targetDuration,mode==='stopwatch'?0:90*60000);
  assert.equal(h.location.hash,'#focus');
 }
});
test('a failed launch or pause keeps the current dialog and never navigates or shows summary',async()=>{
 const h=harness('pomodoro',true);await h.click('qf-launch');
 assert.equal(h.dialog.closed,0);assert.equal(h.location.hash,'#tasks');assert.equal(h.read().activeSession,null);
 const d=h.read();C.createSession(d,{taskId:'t',type:'stopwatch'});h.seed(d);
 await h.click('session-finish');assert.equal(h.dialog.innerHTML,'');assert.equal(h.read().activeSession.status,'running');
});
test('session save completes a task only when explicitly requested and returns to its goal',async()=>{
 for(const complete of [false,true]){
  const h=harness();const d=h.read();C.createSession(d,{taskId:'t',type:'stopwatch'},Date.now()-60000);h.seed(d);
  const active=h.read().activeSession;
  await h.ctx.window.audit.submit({preventDefault(){},target:{id:'lxSummaryForm',dataset:{id:active.id},values:{notes:'Finished proposal',focusScore:'',energyScore:'',...(complete?{completeTask:'on'}:{})},elements:{},querySelector:()=>null}});
  assert.equal(!!h.read().tasks[0].done,complete);assert.equal(h.read().sessions.length,1);
  assert.equal(h.read().sessions[0].focusScore,null);assert.equal(h.read().sessions[0].completeTask,undefined);
  assert.equal(h.location.hash,'#goals/g');
 }
});
test('inbox, notes and project routes render their existing screens and task rows show work without estimates',()=>{
 const h=harness(),d=h.read();
 assert.match(h.ctx.window.audit.renderPage('inbox',d),/Invoice idea/);
 assert.match(h.ctx.window.audit.renderPage('notes',d),/New note/);
 assert.match(h.ctx.window.audit.renderPage('projects',d),/New project/);
 d.sessions=[{id:'s',taskId:'t',status:'completed',segments:[{kind:'focus',start:0,end:3000000}]}];
 assert.match(h.ctx.window.audit.taskRow(d.tasks[0],d),/50m worked/);
});
test('legacy shutdown inbox ideas migrate without discarding their original fields',()=>{
 const input={profile:{},goals:[],tasks:[],inbox:[{id:'i',text:'Keep this idea',ts:12345}]};
 const d=C.migrate(input);assert.equal(d.inbox[0].title,'Keep this idea');assert.equal(d.inbox[0].createdAt,12345);
 assert.equal(d.inbox[0].text,'Keep this idea');assert.equal(input.inbox[0].title,undefined);
});

 test('search includes inbox and note bodies while excluding archived records',()=>{
 const h=harness(),d=h.read();d.notes=[{id:'n',title:'Meeting',body:'Invoice details'}]; d.inbox.push({id:'hidden',title:'Invoice archived',archived:true});h.seed(d);h.ctx.window.audit.commandResults('invoice');assert.match(h.results.innerHTML,/Invoice idea/);assert.match(h.results.innerHTML,/Meeting/);assert.doesNotMatch(h.results.innerHTML,/Invoice archived/);
 });
 test('a habit with zero goal impact displays zero and not the default five percent',()=>{
 const h=harness(),d=h.read();d.habits=[{id:'h',title:'Read',goalId:'g',impact:0,checks:[],frequency:'daily'}];assert.match(h.ctx.window.audit.renderPage('habits',d),/\+0%/);
 });
 test('average session excludes cancelled and empty sessions',()=>{
 const h=harness(),d=h.read(); d.sessions=[{id:'a',status:'completed',segments:[{kind:'focus',start:0,end:3000000}]},{id:'b',status:'cancelled',segments:[{kind:'focus',start:0,end:1500000}]},{id:'c',status:'completed',segments:[]}];d.sessions.forEach(s=>{s.startedAt=1;s.endedAt=3000000});var html=h.ctx.window.audit.renderPage('analytics',d);assert.match(html,/Average session<\/[^>]+>\s*<strong[^>]*>0h 50m/);
 });

 test('quick finance requires an explicit category instead of recording accidental rent',async()=>{
 const h=harness();await h.ctx.window.audit.submit({preventDefault(){},target:{id:'lxQuickTxForm',values:{type:'expense',amount:'15',category:'',title:'Lunch'},elements:{},querySelector:()=>null}});assert.equal(h.read().finances.length,0);assert.match(h.notices.textContent,/Choose a category/);
 });
