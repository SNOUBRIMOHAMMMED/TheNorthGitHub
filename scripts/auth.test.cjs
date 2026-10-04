const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../auth.js'),'utf8');
function setup(auth){const context={window:{supabase:{createClient:()=>({auth})}}};vm.runInNewContext(source,context);return context.window.NorthAuth;}
test('signup requiring confirmation does not produce a signed-in session',async()=>{const a=setup({signUp:async()=>({data:{session:null,user:{id:'pending'}}})});const result=await a.signup('a@example.test','password','A','ar');assert.equal(result.session,null);});
test('invalid cloud credentials never fall back to local authentication',async()=>{const error=new Error('Invalid login');const a=setup({signInWithPassword:async()=>({error})});await assert.rejects(a.login('a@example.test','incorrect'),/Invalid login/);});
test('authenticated session restores the same cloud identity',async()=>{const session={user:{id:'u',email:'a@example.test'}};const a=setup({getSession:async()=>({data:{session}})});assert.equal((await a.session()).user.id,'u');});
test('logout invalidates this device session without signing out other devices',async()=>{let scope;const a=setup({signOut:async options=>{scope=options.scope;return {data:{}};}});await a.logout();assert.equal(scope,'local');});
test('missing CDN fails closed rather than opening a local account',async()=>{const context={window:{}};vm.runInNewContext(source,context);await assert.rejects(context.window.NorthAuth.login('a@example.test','password'),/network/);});
test('numeric passwords do not trigger OTP requests when the network fails',async()=>{
 let calls=0;const a=setup({signInWithPassword:async()=>({error:{name:'AuthRetryableFetchError'}}),verifyOtp:async()=>{calls++;return {data:{}}}});
 await assert.rejects(a.login('a@example.test','123456'));assert.equal(calls,0);
});
test('OTP login and explicit verification use the same confirmed-session flow',async()=>{
 const types=[];const a=setup({signInWithPassword:async()=>({error:{code:'invalid_credentials'}}),verifyOtp:async({type})=>{types.push(type);return type==='signup'?{error:{code:'otp_expired'}}:{data:{session:{user:{id:'confirmed'}}}}}});
 assert.equal((await a.login('a@example.test','123456')).session.user.id,'confirmed');assert.deepEqual(types,['signup','email']);
 const invalid=setup({verifyOtp:async()=>({data:{session:null}})});await assert.rejects(invalid.verifyOtp('a@example.test','123456'),e=>e.code==='otp_expired');
});
test('signup errors distinguish mail configuration from invalid credentials',()=>{const a=setup({});assert.match(a.errorMessage({code:'email_address_not_authorized'},'en',true),/SMTP/);assert.match(a.errorMessage({code:'over_email_send_rate_limit'},'en',true),/limit/);assert.match(a.errorMessage({code:'invalid_credentials'},'en',false),/Incorrect/);});
test('unknown errors do not reveal raw server content',()=>{const a=setup({});const message=a.errorMessage({message:'secret sensitive response',status:500},'en',true);assert.match(message,/create account/);assert.match(message,/500/);assert.doesNotMatch(message,/secret/);});

test('recovery and confirmation use Supabase Auth and propagate failures',async()=>{
 const calls=[];const a=setup({resetPasswordForEmail:async(email,options)=>{calls.push({email,options});return {data:{}}},resend:async(options)=>{calls.push(options);return {data:{}}},updateUser:async(options)=>{calls.push(options);return {data:{user:{id:'u'}}}}});
 await a.resetPassword('a@example.test');await a.resendConfirmation('a@example.test');await a.updatePassword('test-only-password');
 assert.equal(calls[0].email,'a@example.test');assert.equal(calls[1].type,'signup');assert.equal(calls[2].password,'test-only-password');
 const broken=setup({resetPasswordForEmail:async()=>({error:new Error('delivery')})});await assert.rejects(broken.resetPassword('a@example.test'),/delivery/);
});
