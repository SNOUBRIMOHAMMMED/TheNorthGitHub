const {test}=require('node:test');const assert=require('node:assert/strict');
const {create}=require('../cloud-sync.js');
function harness({row=null,local=null,fail=false,mismatch=false,race=false}={}){
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
 const cloud=create({client,read:()=>data,apply:p=>{data={...data,...structuredClone(p)}},storage:{getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v)},email:()=> 'qa@example.test',status:s=>state=s});
 return {cloud,mem,get state(){return state},get writes(){return writes},get data(){return data},get row(){return row},setFail:v=>fail=v,edit:()=>data.tasks.push({id:'new'}),remote:()=>{row.revision++;row.payload.tasks.push({id:'remote'})}};
}
const payload={tasks:[{id:'t'}],sessions:[],projects:[],goals:[]};
test('cloud first save initializes row and subsequent task changes update revision',async()=>{const h=harness();await h.cloud.resume();h.edit();await h.cloud.sync();assert.equal(h.row.revision,1);assert.equal(h.row.payload.tasks[0].id,'new');});
test('cloud restores remote on empty device',async()=>{const h=harness({row:{payload,revision:4}});await h.cloud.resume();assert.equal(h.data.tasks[0].id,'t');assert.equal(h.writes,0);});
test('cloud refuses unconfirmed first-device overwrite',async()=>{const h=harness({row:{payload,revision:2},local:{...payload,tasks:[{id:'local'}]}});await h.cloud.resume();assert.equal(h.state,'conflict');assert.equal(h.writes,0);});
test('cloud identity mismatch never reads or writes local workspace into another account',async()=>{const h=harness({mismatch:true});await h.cloud.resume();assert.equal(h.state,'identity');assert.equal(h.writes,0);});
test('offline edits survive and retry',async()=>{const h=harness();await h.cloud.resume();h.setFail(true);h.edit();await h.cloud.sync();assert.equal(h.state,'offline');assert.equal(h.data.tasks.length,1);h.setFail(false);await h.cloud.sync();assert.equal(h.row.payload.tasks.length,1);});
test('remote and local concurrent edits cause conflict',async()=>{const h=harness();await h.cloud.resume();h.edit();h.remote();await h.cloud.sync();assert.equal(h.state,'conflict');assert.equal(h.writes,1);});
test('active timer blocks remote replacement',async()=>{const h=harness({row:{payload,revision:1},local:{tasks:[],sessions:[],goals:[],projects:[],activeSession:{id:'active'}}});await h.cloud.resume();assert.equal(h.state,'active');assert.equal(h.data.tasks.length,0);});
test('CAS race does not report success',async()=>{const h=harness({race:true});await h.cloud.resume();h.edit();await h.cloud.sync();assert.equal(h.state,'conflict');assert.equal(h.row.revision,0);});
test('full account data is included while passwords and active timers are excluded',()=>{
 const {snapshot}=require('../cloud-sync.js');
 const d={...payload,notes:[{id:'note'}],finances:[{id:'income',amount:300}],habits:[{id:'h'}],events:[{id:'e'}],health:[{id:'health'}],learning:[{id:'book'}],planning:{daily:{priorities:'Next'}},settings:{focusMinutes:50},profile:{name:'Owner'},categories:['Work'],activeSession:{id:'timer'},passwordHash:'never-upload'};
 const p=snapshot(d);for(const k of ['notes','finances','habits','events','health','learning','planning','settings','profile','categories'])assert.deepEqual(p[k],d[k]);assert.equal('activeSession' in p,false);assert.equal('passwordHash' in p,false);
});
test('new device restores finance, habits and preferences as well as tasks',async()=>{
 const p={...payload,finances:[{id:'money',amount:12}],habits:[{id:'habit'}],settings:{focusMinutes:45},planning:{weekly:'Review'}};
 const h=harness({row:{payload:p,revision:3}});await h.cloud.resume();assert.equal(h.state,'saved');assert.deepEqual(h.data.finances,p.finances);assert.deepEqual(h.data.settings,p.settings);
});
