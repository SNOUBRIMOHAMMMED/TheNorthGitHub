const {test}=require('node:test');
const assert=require('node:assert/strict');
const {create,errorState}=require('../cloud-sync.js');

test('schema, authorization, expired login and incompatible payload are not network errors',()=>{
  for(const code of ['42P01','42703','PGRST204','PGRST205']) assert.equal(errorState({code}),'schema');
  assert.equal(errorState({code:'42501'}),'permission');
  assert.equal(errorState({status:401}),'expired');
  assert.equal(errorState(Error('shape')),'invalidData');
  assert.equal(errorState({name:'QuotaExceededError'}),'storage');
});

test('incompatible remote data never causes an overwrite',async()=>{
  let writes=0,state;
  const local={goals:[{id:'precious-goal'}],tasks:[],projects:[],sessions:[]};
  const q={select(){return this},eq(){return this},maybeSingle:async()=>({data:{payload:{goals:'legacy'},revision:0}}),update(){writes++;return this},insert(){writes++;return this}};
  const cloud=create({client:{auth:{getSession:async()=>({data:{session:{user:{id:'u',email:'a@test'}}}})},from:()=>q},read:()=>local,apply:()=>assert.fail('must not replace local data'),storage:{getItem:()=>null,setItem(){}},email:()=> 'a@test',status:s=>state=s});
  assert.equal(await cloud.resume(),false);assert.equal(state,'invalidData');assert.equal(writes,0);assert.equal(local.goals[0].id,'precious-goal');
});

test('explicit cloud replacement retains original and remote recovery copies',async()=>{
  const local={goals:[{id:'local'}],tasks:[],projects:[],sessions:[]};
  const remote={goals:[{id:'remote'}],tasks:[],projects:[],sessions:[]};
  const mem=new Map();let data=local;
  let remoteRow={payload:local,revision:0};
  const q={select(){return this},eq(){return this},maybeSingle:async()=>({data:remoteRow})};
  const cloud=create({client:{auth:{getSession:async()=>({data:{session:{user:{id:'u',email:'a@test'}}}})},from:()=>q},read:()=>data,apply:p=>data=p,storage:{getItem:k=>mem.get(k),setItem:(k,v)=>mem.set(k,v)},email:()=> 'a@test',status(){}});
  await cloud.resume();remoteRow={payload:remote,revision:1};assert.equal(await cloud.resolve('remote'),true);
  assert.equal(JSON.parse(mem.get('north_before_cloud_u_first')).goals[0].id,'local');
  assert.equal(JSON.parse(mem.get('north_before_cloud_u_remote')).goals[0].id,'remote');
});
