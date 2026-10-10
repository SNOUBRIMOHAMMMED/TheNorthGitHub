const {test}=require('node:test');const assert=require('node:assert/strict');
const {create}=require('../cloud-sync.js');
function harness({row=null,local=null,fail=false,mismatch=false,race=false,recoveryQuota=false,applyWait=()=>{}}={}){
 let data=local||{tasks:[],sessions:[],projects:[],goals:[]};let state;let writes=0;const mem=new Map();
 const user={id:'user-a',email:mismatch?'other@example.test':'qa@example.test'};
 const client={auth:{getSession:async()=>({data:{session:{user}}}),signOut:async()=>({error:null})},from(){
  let mode='read',payload,expected;
  const q={select(){return q},eq(k,v){if(k==='revision')expected=v;return q},insert(v){mode='insert';payload=v;return q},update(v){mode='update';payload=v;return q},async maybeSingle(){
   if(fail)return {error:{code:'network'}};
   if(mode==='read')return {data:row?structuredClone(row):null};
   if(race || expected!==row.revision)return {data:null};writes++;row={...row,...structuredClone(payload)};return {data:{revision:row.revision}};
  },async single(){if(fail)return {error:{}};writes++;row=structuredClone(payload);return {data:{revision:row.revision}};}};return q;
 }};
 const cloud=create({client,read:()=>data,apply:async p=>{await applyWait();data={...data,...structuredClone(p)}},storage:{getItem:k=>mem.get(k)||null,setItem:(k,v)=>{if(recoveryQuota&&k.startsWith('north_before_cloud_'))throw Object.assign(Error('quota'),{name:'QuotaExceededError'});mem.set(k,v);}},email:()=> 'qa@example.test',status:s=>state=s});
 return {cloud,mem,get state(){return state},get writes(){return writes},get data(){return data},get row(){return row},setFail:v=>fail=v,edit:()=>data.tasks.push({id:'new'}),remote:()=>{row.revision++;row.payload.tasks.push({id:'remote'})}};
}
const payload={tasks:[{id:'t'}],sessions:[],projects:[],goals:[]};
test('cloud first save initializes row and subsequent task changes update revision',async()=>{const h=harness();await h.cloud.resume();h.edit();await h.cloud.sync();assert.equal(h.row.revision,1);assert.equal(h.row.payload.tasks[0].id,'new');});
test('cloud restores remote on empty device',async()=>{const h=harness({row:{payload,revision:4}});await h.cloud.resume();assert.equal(h.data.tasks[0].id,'t');assert.equal(h.writes,0);});
test('recovery copy quota cannot block uploading or restoring the actual workspace',async()=>{
 const h=harness({row:{payload,revision:4},local:{...payload,tasks:[{id:'local'}]},recoveryQuota:true});
 assert.equal(await h.cloud.resume(),true);assert.equal(h.state,'saved');assert.deepEqual(h.row.payload.tasks.map(t=>t.id).sort(),['local','t']);
 const empty=harness({row:h.row,recoveryQuota:true});assert.equal(await empty.cloud.resume(),true);assert.equal(empty.data.tasks.length,2);
});
test('remote restoration reports saved only after durable apply completes',async()=>{
 let release;const gate=new Promise(r=>release=r),h=harness({row:{payload,revision:4},applyWait:()=>gate});
 const restoring=h.cloud.resume();await new Promise(r=>setImmediate(r));assert.equal(h.state,'syncing');assert.equal(h.data.tasks.length,0);
 release();await restoring;assert.equal(h.state,'saved');assert.equal(h.data.tasks[0].id,'t');
});
test('first device combines existing records without replacing either workspace',async()=>{const h=harness({row:{payload,revision:2},local:{...payload,tasks:[{id:'local'}]}});await h.cloud.resume();assert.equal(h.state,'saved');assert.deepEqual(h.row.payload.tasks.map(x=>x.id).sort(),['local','t']);});
test('phone goals upload automatically over an empty cloud copy and remain recoverable',async()=>{
 const local={tasks:[],sessions:[],projects:[{id:'project-phone'}],goals:[{id:'goal-phone'}]};
 const h=harness({row:{payload:{tasks:[],sessions:[],projects:[],goals:[]},revision:0},local});
 assert.equal(await h.cloud.resume(),true); assert.equal(h.state,'saved');
 assert.equal(h.row.revision,1); assert.deepEqual(h.row.payload.goals,local.goals);
 assert.deepEqual(h.row.payload.projects,local.projects);
 assert.equal(JSON.parse(h.mem.get('north_before_cloud_user-a_first')).goals[0].id,'goal-phone');
 assert.deepEqual(JSON.parse(h.mem.get('north_before_cloud_user-a_remote')).goals,[]);
});
test('cloud identity mismatch never reads or writes local workspace into another account',async()=>{const h=harness({mismatch:true});await h.cloud.resume();assert.equal(h.state,'identity');assert.equal(h.writes,0);});
test('offline edits survive and retry',async()=>{const h=harness();await h.cloud.resume();h.setFail(true);h.edit();await h.cloud.sync();assert.equal(h.state,'offline');assert.equal(h.data.tasks.length,1);h.setFail(false);await h.cloud.sync();assert.equal(h.row.payload.tasks.length,1);});
test('remote and local concurrent additions merge automatically',async()=>{const h=harness();await h.cloud.resume();h.edit();h.remote();await h.cloud.sync();assert.equal(h.state,'saved');assert.equal(h.writes,2);assert.deepEqual(h.row.payload.tasks.map(x=>x.id).sort(),['new','remote']);});
test('active timer blocks remote replacement',async()=>{const h=harness({row:{payload,revision:1},local:{tasks:[],sessions:[],goals:[],projects:[],activeSession:{id:'active'}}});await h.cloud.resume();assert.equal(h.state,'active');assert.equal(h.data.tasks.length,0);});
test('persistent CAS race stays pending for automatic retry instead of reporting success',async()=>{const h=harness({race:true});await h.cloud.resume();h.edit();await h.cloud.sync();assert.equal(h.state,'pending');assert.equal(h.row.revision,0);});
test('full account data is included while passwords and active timers are excluded',()=>{
 const {snapshot}=require('../cloud-sync.js');
 const d={...payload,notes:[{id:'note'}],finances:[{id:'income',amount:300}],habits:[{id:'h'}],events:[{id:'e'}],health:[{id:'health'}],learning:[{id:'book'}],planning:{daily:{priorities:'Next'}},settings:{focusMinutes:50},profile:{name:'Owner'},categories:['Work'],activeSession:{id:'timer'},passwordHash:'never-upload'};
 const p=snapshot(d);for(const k of ['notes','finances','habits','events','health','learning','planning','settings','profile','categories'])assert.deepEqual(p[k],d[k]);assert.equal('activeSession' in p,false);assert.equal('passwordHash' in p,false);
});
test('new device restores finance, habits and preferences as well as tasks',async()=>{
 const p={...payload,finances:[{id:'money',amount:12}],habits:[{id:'habit'}],settings:{focusMinutes:45},planning:{weekly:'Review'}};
 const h=harness({row:{payload:p,revision:3}});await h.cloud.resume();assert.equal(h.state,'saved');assert.deepEqual(h.data.finances,p.finances);assert.deepEqual(h.data.settings,p.settings);
});

test('a fresh browser restores the complete previously saved account without local metadata',async()=>{
 const original={tasks:[{id:'task'}],projects:[{id:'project'}],goals:[{id:'goal'}],sessions:[{id:'session',totalDuration:120000}],learning:[{id:'course'}],notes:[{id:'note'}],habits:[{id:'habit'}],finances:[{id:'income',amount:300}]};
 const first=harness({local:original}); await first.cloud.resume();
 const fresh=harness({row:first.row}); assert.equal(await fresh.cloud.resume(),true);
 for(const key of Object.keys(original)) assert.deepEqual(fresh.data[key],original[key]);
 assert.equal(fresh.writes,0); assert.equal(fresh.state,'saved');
});

test('three-way merge retains independent field edits and deliberate deletions',()=>{
 const {merge}=require('../cloud-sync.js');
 const base={...payload,tasks:[{id:'t',title:'Before',done:false},{id:'deleted',title:'Remove'}],settings:{focusMinutes:25,sound:false}};
 const local={...base,tasks:[{id:'t',title:'After',done:false}],settings:{focusMinutes:50,sound:false}};
 const remote={...base,tasks:[{id:'t',title:'Before',done:true},{id:'deleted',title:'Remove'},{id:'remote-new'}],settings:{focusMinutes:25,sound:true}};
 const combined=merge(base,local,remote);
 assert.deepEqual(combined.tasks,[{id:'t',title:'After',done:true},{id:'remote-new'}]);
 assert.deepEqual(combined.settings,{focusMinutes:50,sound:true});
});

test('concurrent edit versus deletion retains the edited record and habit checks merge',()=>{
 const {merge}=require('../cloud-sync.js');
 const base={...payload,habits:[{id:'h',checks:['2026-10-01']}],goals:[{id:'g',name:'Before'}]};
 const local={...base,habits:[{id:'h',checks:['2026-10-01','2026-10-02']}],goals:[]};
 const remote={...base,habits:[{id:'h',checks:['2026-10-01','2026-10-03']}],goals:[{id:'g',name:'Edited remotely'}]};
 const result=merge(base,local,remote);
 assert.equal(result.goals[0].name,'Edited remotely');
 assert.deepEqual(result.habits[0].checks,['2026-10-01','2026-10-02','2026-10-03']);
});

test('simultaneous edits to one field use the current save while keeping unrelated remote fields',()=>{
 const {merge}=require('../cloud-sync.js');
 const base={...payload,tasks:[{id:'t',title:'Before',done:false}]};
 const result=merge(base,{...base,tasks:[{id:'t',title:'Local',done:false}]},{...base,tasks:[{id:'t',title:'Remote',done:true}]});
 assert.deepEqual(result.tasks,[{id:'t',title:'Local',done:true}]);
});
