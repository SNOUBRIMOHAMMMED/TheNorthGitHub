const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const C=require('../core.js'),Cloud=require('../cloud-sync.js');
const empty=()=>({goals:[],tasks:[],sessions:[],projects:[]});
function cloudHarness({ownerId,validate,readDelay,sessionDelay}={}) {
 let address='a@test', authUser={id:'a',email:address}, data=empty(), row=null, writes=0, state, quota=false, backups=0;
 const storage=new Map();
 const client={auth:{async getSession(){const user=authUser;if(sessionDelay)await sessionDelay();return {data:{session:{user}}};}},from(){
   let value,expected,mode='read';const q={select(){return q},eq(k,v){if(k==='revision')expected=v;return q},insert(v){value=v;mode='insert';return q},update(v){value=v;mode='update';return q},
   async maybeSingle(){if(mode==='read'){const result=structuredClone(row);if(readDelay)await readDelay();return {data:result}}if(expected!==row.revision)return {data:null};writes++;row=structuredClone(value);return {data:{revision:row.revision}}},
   async single(){writes++;row=structuredClone(value);return {data:{revision:row.revision}}}};return q;
 }};
 const cloud=Cloud.create({client,read:()=>data,apply:p=>data=structuredClone(p),email:()=>address,ownerId,validate,status:s=>state=s,storage:{getItem:k=>storage.get(k)||null,setItem(k,v){if(k.startsWith('north_before_cloud_'))backups++;if(quota)throw Object.assign(Error('full'),{name:'QuotaExceededError'});storage.set(k,v)}}});
 return {cloud,storage,get data(){return data},get row(){return row},get writes(){return writes},get state(){return state},get backups(){return backups},quota:()=>quota=true,switchAccount(){address='b@test';authUser={id:'b',email:address};data=empty()},remote:v=>row=v};
}
test('ordinary cloud updates succeed when metadata storage is full without duplicating backups',async()=>{
 const h=cloudHarness();await h.cloud.resume();h.quota();h.data.tasks.push({id:'t'});
 assert.equal(await h.cloud.sync(),true);assert.equal(h.state,'saved');assert.equal(h.row.payload.tasks.length,1);assert.equal(h.backups,0);
 assert.equal(await h.cloud.sync(),true);assert.equal(h.writes,2,'successful cloud save is not repeatedly uploaded');
});
test('cloud never sends data from a previous UUID even when the email is reused',async()=>{
 const h=cloudHarness({ownerId:()=> 'old-uuid'});await h.cloud.resume();assert.equal(h.state,'identity');assert.equal(h.writes,0);
});
test('invalid local and remote records are rejected before any server write',async()=>{
 const h=cloudHarness({validate:p=>{if(p.tasks.some(t=>!t.title))throw Error('invalidData')}});
 h.data.tasks.push({id:'broken'});assert.equal(await h.cloud.resume(),false);assert.equal(h.state,'invalidData');assert.equal(h.writes,0);
 const r=cloudHarness();r.remote({revision:0,payload:{...empty(),tasks:[{id:'same'},{id:'same'}]}});await r.cloud.resume();assert.equal(r.state,'invalidData');assert.equal(r.writes,0);
});
test('delayed auth lookup cannot restore a different current account',async()=>{
 let release;const h=cloudHarness({sessionDelay:()=>new Promise(r=>release=r)});const saving=h.cloud.resume();h.switchAccount();release();assert.equal(await saving,false);assert.equal(h.writes,0);
});
test('a switched account receives its own sync after the old in-flight read completes',async()=>{
 let release,reads=0;const h=cloudHarness({readDelay:()=>++reads===1?new Promise(r=>release=r):Promise.resolve()});
 const first=h.cloud.resume();await new Promise(r=>setImmediate(r));h.switchAccount();const second=h.cloud.resume();await new Promise(r=>setImmediate(r));release();await first;assert.equal(await second,true);assert.equal(h.row.user_id,'b');assert.equal(h.writes,1);
});
test('malformed optional collections cannot silently become empty during import',()=>{
 const source={profile:{name:'QA'},goals:[],tasks:[],notes:{id:'valuable'}};
 assert.throws(()=>C.validateImport(source),/invalidData/);assert.deepEqual(source.notes,{id:'valuable'});
});
test('debt payment records exact cents and cannot subtract more than the outstanding debt',()=>{
 const d=C.migrate({profile:{name:'QA'},goals:[],tasks:[],settings:{debts:[{id:'debt',name:'Equipment',totalAmount:10.30,paidAmount:10.10}]}});
 const before=JSON.stringify(d);assert.throws(()=>C.recordDebtPayment(d,'debt',1,{deductBalance:true}),/invalidPayment/);assert.equal(JSON.stringify(d),before);
 assert.throws(()=>C.recordDebtPayment(d,'missing',1,{deductBalance:true}),/debtNotFound/);
 for(const amount of [NaN,Infinity,-1,0])assert.throws(()=>C.recordDebtPayment(d,'debt',amount),/invalidPayment/);
 C.recordDebtPayment(d,'debt',.2,{deductBalance:true});assert.equal(d.settings.debts[0].paidAmount,10.3);assert.equal(d.finances[0].amount,.2);assert.equal(d.finances[0].debtId,'debt');
});
test('zero habit impact and invalid task impact cannot inflate or corrupt goal progress',()=>{
 const d=C.migrate({profile:{name:'QA'},goals:[{id:'g',name:'Goal',momentum:30,progress:10}],tasks:[{id:'t',title:'Task',goalId:'g',impact:-10,progressImpact:'bad'}],habits:[{id:'h',goalId:'g',impact:0}]});
 C.toggleHabit(d,'h');assert.equal(d.goals[0].momentum,30);C.completeTask(d,'t');assert.equal(d.goals[0].momentum,30);assert.equal(d.goals[0].progress,10);
});
test('legacy rollover keeps complete history and never penalizes the current day',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');const start=source.indexOf('function rollover()'),end=source.indexOf('function ensureToday()',start);
 const today=C.day(),yesterday=C.day(C.midnight(Date.now())-86400000);const d=C.migrate({profile:{name:'QA'},tasks:[],goals:[{id:'g',name:'Goal',momentum:80,history:Array.from({length:150},(_,i)=>({date:C.day(C.midnight(Date.now())-(i+2)*86400000),value:80}))}],lastOpened:yesterday});
 const ctx={data:()=>d,iso:()=>today,window:{LifeCore:C},Date,clamp:n=>Math.max(0,Math.min(100,n)),saveData(){},ensureToday(){}};
 vm.runInNewContext(source.slice(start,end)+';rollover();',ctx);assert.equal(d.goals[0].momentum,75);assert.equal(d.goals[0].history.length,151);assert.equal(d.goals[0].history.some(h=>h.date===today),false);
});
test('a failed finance save keeps the form open and never reports success',async()=>{
 const mem=new Map([[C.SESSION_KEY,'qa'],[C.ACCOUNT_KEY,JSON.stringify({qa:{data:C.migrate({profile:{name:'QA'},goals:[],tasks:[]})}})]]);let closed=0,resets=0;const message={className:'',textContent:'',classList:{remove(){}}};
 const context={window:{LifeCore:C,LifeLegacy:{renderAll(){}},addEventListener(){}},document:{documentElement:{lang:'en'},addEventListener(){},querySelector:s=>s==='#lxDialog'?{close(){closed++}}:s==='#lxNotice'?message:null},localStorage:{getItem:k=>mem.get(k)||null,setItem(){throw Object.assign(Error('quota'),{name:'QuotaExceededError'})}},setInterval(){},setTimeout(){},clearTimeout(){},navigator:{},console,FormData:function(f){return Object.entries(f.values)}};
 const source=fs.readFileSync(path.join(__dirname,'../workspace.js'),'utf8').replace('function render() {','function render() { return;').replace('function restoreWorkspaceRoute() {','function restoreWorkspaceRoute() { return;').replace('window.LifeWorkspace = {','window.auditSubmit=submit; window.LifeWorkspace = {');vm.runInNewContext(source,context);
 for(const [id,values] of [['lxQuickTxForm',{amount:'20'}],['lxDebtForm',{name:'QA',totalAmount:'50',paidAmount:'0'}],['lxStartBalanceForm',{month:'2026-10',amount:'50'}],['lxFinancePlanForm',{month:'2026-10'}]]){
   await context.window.auditSubmit({preventDefault(){},target:{id,values,dataset:{},querySelector:()=>null,reset(){resets++}}});assert.match(message.className,/error/);
 }assert.equal(closed,0);assert.equal(resets,0);
 let prevented=false;
 await context.window.auditSubmit({preventDefault(){prevented=true},target:{id:{value:'debt'},getAttribute:()=> 'lxDebtForm',values:{id:'debt',name:'QA',totalAmount:'50'},dataset:{},querySelector:()=>null}});
 assert.equal(prevented,true,'a named id input must not shadow the form identifier or submit the page');assert.match(message.className,/error/);
});
