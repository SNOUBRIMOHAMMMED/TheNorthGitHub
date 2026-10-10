const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
test('account restoration runs after the Supabase auth callback releases its lock',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
 const start=source.indexOf('let authEventVersion=0;');
 const end=source.indexOf('if ("serviceWorker"',start);
 assert.ok(start>=0&&end>start);
 let callback,restores=0; const timers=[];
 const context={window:{NorthAuth:{client:{auth:{onAuthStateChange(fn){callback=fn;}}},errorMessage:()=>''}},
 setTimeout:fn=>timers.push(fn),authBusy:false,enterCloud:async()=>{restores++;},toast(){},currentLang:()=> 'en',
 storage:{removeItem(){}},SESSION_KEY:'session',showLanding(){}};
 vm.runInNewContext(source.slice(start,end),context);
 assert.equal(callback('SIGNED_IN',{user:{id:'u'}}),undefined);
 assert.equal(restores,0); assert.equal(timers.length,1);
 await timers.shift()(); assert.equal(restores,1);
 context.authBusy=true; callback('SIGNED_IN',{user:{id:'u'}}); await timers.shift()();
 assert.equal(restores,1);
 context.authBusy=false; callback('SIGNED_IN',{user:{id:'u'}}); callback('SIGNED_OUT',null);
 await timers.shift()(); assert.equal(restores,1,'a queued sign-in must not restore a signed-out account');
});
