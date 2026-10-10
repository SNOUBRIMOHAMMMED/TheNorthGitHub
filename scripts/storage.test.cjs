const {test}=require('node:test');
const assert=require('node:assert/strict');
const {create}=require('../storage.js');
const ACCOUNT='lifeos_v11_accounts';
function native(entries={},quota=false) {
  const values=new Map(Object.entries(entries));
  return {values,get length(){return values.size;},key:i=>[...values.keys()][i],getItem:k=>values.get(k)??null,
    setItem(k,v){if(quota)throw Object.assign(Error('full'),{name:'QuotaExceededError'});values.set(k,String(v));},removeItem:k=>values.delete(k),quota:v=>quota=v};
}
function durable() {
  const records=new Map(); let fail=false, gate=null;
  return {records,all:async()=>[...records.values()].map(r=>structuredClone(r)),get:async key=>records.get(key),
    async put(record){if(gate)await gate;if(fail)throw Error('disk unavailable');records.set(record.key,structuredClone(record));},fail:v=>fail=v,gate:v=>gate=v};
}
test('large legacy recovery copies move only after durable commit; account and auth keys stay untouched',async()=>{
  const local=native({[ACCOUNT]:'valuable goals','north_cloud_v1_u':'base','north_before_cloud_u_first':'first','lifeos_recovery_qa':'before import','sb-test-auth-token':'private','other-app':'keep'}), disk=durable();
  const s=create({local,durable:disk});await s.ready;
  for(const key of ['north_cloud_v1_u','north_before_cloud_u_first','lifeos_recovery_qa']) {assert.equal(local.getItem(key),null);assert.ok(disk.records.has(key));}
  assert.equal(s.getItem('north_before_cloud_u_first'),'first');assert.equal(local.getItem(ACCOUNT),'valuable goals');
  assert.equal(local.getItem('sb-test-auth-token'),'private');assert.equal(local.getItem('other-app'),'keep');
});
test('failed archival never removes the original local recovery data',async()=>{
  const local=native({'north_before_cloud_u_first':'only copy'}),disk=durable();disk.fail(true);
  const s=create({local,durable:disk});await s.ready;assert.equal(local.getItem('north_before_cloud_u_first'),'only copy');
});
test('quota fallback persists the full account and restores it on a fresh instance',async()=>{
  const local=native({[ACCOUNT]:'before'},true),disk=durable();
  const s=create({local,durable:disk});await s.ready;s.setItem(ACCOUNT,'complete goals, tasks and timer');await s.flush(ACCOUNT);
  assert.equal(local.getItem(ACCOUNT),null);
  const fresh=create({local,durable:disk});await fresh.ready;assert.equal(fresh.getItem(ACCOUNT),'complete goals, tasks and timer');
});
test('pending account data remains in memory and a failed durable save cannot claim success; retry recovers',async()=>{
  const local=native({[ACCOUNT]:'before'},true),disk=durable();let errors=0;
  const s=create({local,durable:disk,onError:()=>errors++});await s.ready;disk.fail(true);s.setItem(ACCOUNT,'new goals');
  await assert.rejects(s.flush(ACCOUNT),/disk unavailable/);assert.equal(s.getItem(ACCOUNT),'new goals');assert.equal(local.getItem(ACCOUNT),'before');assert.ok(errors>0);
  disk.fail(false);await s.flush(ACCOUNT);assert.equal(disk.records.get(ACCOUNT).value,'new goals');
});
test('a legacy account copy is retained until its fallback transaction commits',async()=>{
  const local=native({[ACCOUNT]:'last durable copy'},true),disk=durable();let release;
  const s=create({local,durable:disk});await s.ready;disk.gate(new Promise(r=>release=r));s.setItem(ACCOUNT,'pending');
  assert.equal(local.getItem(ACCOUNT),'last durable copy');release();await s.flush(ACCOUNT);assert.equal(local.getItem(ACCOUNT),null);
});
test('fallback saves are ordered and other-device refresh reads the latest committed account',async()=>{
  const local=native({},true),disk=durable();const a=create({local,durable:disk}),b=create({local,durable:disk});await Promise.all([a.ready,b.ready]);
  a.setItem(ACCOUNT,'first');a.setItem(ACCOUNT,'second');await a.flush(ACCOUNT);await b.refresh(ACCOUNT);assert.equal(b.getItem(ACCOUNT),'second');
  b.setItem(ACCOUNT,'third');await b.flush(ACCOUNT);await a.refresh(ACCOUNT);assert.equal(a.getItem(ACCOUNT),'third');
});
test('without durable storage ordinary native saving works and quota still fails explicitly',async()=>{
  const local=native({[ACCOUNT]:'original'}),s=create({local,durable:Promise.reject(Error('disabled'))});await s.ready;
  s.setItem(ACCOUNT,'saved');assert.equal(s.getItem(ACCOUNT),'saved');local.quota(true);assert.throws(()=>s.setItem(ACCOUNT,'lost'),{name:'QuotaExceededError'});assert.equal(s.getItem(ACCOUNT),'saved');
});
test('recoveries persist outside the small native quota and sign-out tombstones survive reload',async()=>{
  const local=native({},true),disk=durable(),s=create({local,durable:disk});await s.ready;
  s.setItem('lifeos_recovery_qa','recoverable workspace');await s.flush('lifeos_recovery_qa');assert.equal(local.length,0);
  s.setItem('lifeos_v11_session','qa');await s.flush();s.removeItem('lifeos_v11_session');await s.flush();
  const fresh=create({local,durable:disk});await fresh.ready;assert.equal(fresh.getItem('lifeos_v11_session'),null);assert.equal(fresh.getItem('lifeos_recovery_qa'),'recoverable workspace');
});
