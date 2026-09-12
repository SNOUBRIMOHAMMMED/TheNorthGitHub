/* Cloud persistence: authenticated, optimistic concurrency, local fallback. */
(function (root) {
  'use strict';
  const fields = ['tasks','sessions','projects','goals','notes','events','habits','inbox','finances','health','learning','notifications'];
  const objectFields = ['profile','settings','planning','dismissed','lastActivityByGoal'];
  const snapshot = d => ({...Object.fromEntries(fields.map(k => [k, d[k] || []])),...Object.fromEntries(objectFields.filter(k=>d[k]!==undefined).map(k=>[k,d[k]])),...(d.categories?{categories:d.categories}:{}),...(d.range!==undefined?{range:d.range}:{}),...(d.lastOpened?{lastOpened:d.lastOpened}:{})});
  const fingerprint = d => JSON.stringify(snapshot(d));
  function create({client, read, apply, storage, email, status}) {
    let busy = false, user = null, conflict = false;
    const key = () => 'north_cloud_v1_' + user.id;
    const valid = () => user && user.email?.toLowerCase() === email()?.toLowerCase();
    const meta = () => JSON.parse(storage.getItem(key()) || 'null');
    const remember = (revision, payload) => storage.setItem(key(), JSON.stringify({revision, base:fingerprint(payload)}));
    const check = result => { if (result.error) throw result.error; return result.data; };
    const backup = () => storage.setItem('north_before_cloud_' + user.id, JSON.stringify(read()));
    const verify = payload => {
      if (!payload || ['tasks','sessions','projects','goals'].some(k => !Array.isArray(payload[k]))) throw Error('shape');
      for (const k of fields) if (payload[k] && (!Array.isArray(payload[k]) || payload[k].some(x => !x || typeof x.id !== 'string'))) throw Error('shape');
      return payload;
    };
    async function sync(choice) {
      if (busy || !valid()) return;
      busy = true;
      const owner = user.id, localEmail = email();
      const stillCurrent = () => valid() && user.id === owner && email() === localEmail;
      try {
        status('syncing');
        const row = check(await client.from('user_sessions').select('payload,revision').eq('user_id',owner).maybeSingle());
        if (!stillCurrent()) return;
        const local = snapshot(read()), localPrint = fingerprint(local), m = meta();
        if (!row) {
          const inserted = check(await client.from('user_sessions').insert({user_id:owner,payload:local,revision:0}).select('revision').single());
          if (!stillCurrent()) return;
          remember(inserted.revision,local);
        } else {
          verify(row.payload);
          const remotePrint = fingerprint(row.payload);
          const localChanged = m ? m.base !== localPrint : fields.some(k=>local[k].length);
          const remoteChanged = !m || row.revision !== m.revision;
          if (!choice && localChanged && remoteChanged && localPrint !== remotePrint) {
            conflict = true; status('conflict'); return;
          }
          if (choice === 'remote' || (!choice && remoteChanged && localPrint !== remotePrint)) {
            if (read().activeSession) {status('active');return;}
            backup();
            apply(row.payload);
            remember(row.revision,row.payload);
          } else if (choice === 'local' || localPrint !== remotePrint) {
            backup();
            // Compare-and-swap prevents silent overwrite of another device's revision.
            const updated = check(await client.from('user_sessions').update({payload:local,revision:row.revision+1}).eq('user_id',owner).eq('revision',row.revision).select('revision').maybeSingle());
            if (!stillCurrent()) return;
            if (!updated) { conflict=true;status('conflict');return; }
            remember(updated.revision,local);
          } else remember(row.revision,local);
        }
        conflict=false;
        status('saved');
      } catch(e) { status(e.code === '42P01' || e.code === 'PGRST205' ? 'schema' : 'offline'); }
      finally {busy=false;}
    }
    async function connect(password, signup=false) {
      if (busy) return;
      const address=email();
      if (!address) return;
      status('connecting');
      try {
        const result = signup ? await client.auth.signUp({email:address,password}) : await client.auth.signInWithPassword({email:address,password});
        const data=check(result);
        if (!data.session) {status('confirm');return;}
        user=data.user;
        if (!valid()) {status('identity');return;}
        await sync();
      } catch {status('auth');}
    }
    async function resume() {
      try {
        const {session}=check(await client.auth.getSession());
        user=session?.user || null;
        if (user && !valid()) {status('identity');return;}
        if (user) await sync(); else status('disconnected');
      } catch {status('offline');}
    }
    async function disconnect() {
      const result=await client.auth.signOut();
      if(result.error){status('offline');return;}
      user=null;conflict=false;status('disconnected');
    }
    return {connect,resume,disconnect,sync:()=>conflict ? Promise.resolve() : sync(),resolve:choice=>sync(choice)};
  }
  const api={create,snapshot,fingerprint};
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.NorthCloud=api;
})(typeof window==='object' ? window : globalThis);
