/* Cloud persistence: authenticated, optimistic concurrency, local fallback. */
(function (root) {
  'use strict';
  const fields = ['tasks','sessions','projects','goals','notes','events','habits','inbox','finances','health','learning','notifications'];
  const objectFields = ['profile','settings','planning','dismissed','lastActivityByGoal'];
  const snapshot = d => ({...Object.fromEntries(fields.map(k => [k, d[k] || []])),...Object.fromEntries(objectFields.filter(k=>d[k]!==undefined).map(k=>[k,d[k]])),...(d.categories?{categories:d.categories}:{}),...(d.range!==undefined?{range:d.range}:{}),...(d.lastOpened?{lastOpened:d.lastOpened}:{})});
  const fingerprint = d => JSON.stringify(snapshot(d));
  function errorState(e) {
    if (['42P01','42703','PGRST204','PGRST205'].includes(e?.code)) return 'schema';
    if (e?.code === '42501' || e?.status === 403) return 'permission';
    if (e?.code === 'PGRST301' || e?.status === 401) return 'expired';
    if (e?.code === '23505') return 'conflict';
    if (e?.message === 'shape') return 'invalidData';
    if (e?.name === 'QuotaExceededError') return 'storage';
    return 'offline';
  }
  function create({client, read, apply, storage, email, status}) {
    let busy = false, user = null, conflict = false, inFlight = null;
    const key = () => 'north_cloud_v1_' + user.id;
    const valid = () => user && user.email?.toLowerCase() === email()?.toLowerCase();
    const meta = () => {
      const raw = storage.getItem(key());
      try { return JSON.parse(raw || 'null'); }
      catch { storage.setItem(key() + '_recovery', raw); return null; }
    };
    const remember = (revision, payload) => storage.setItem(key(), JSON.stringify({revision, base:fingerprint(payload)}));
    const check = result => { if (result.error) throw result.error; return result.data; };
    const backup = remote => {
      const name = 'north_before_cloud_' + user.id;
      // Keep the first recovery point as well as the latest. Never rotate it away silently.
      if (!storage.getItem(name + '_first')) storage.setItem(name + '_first', JSON.stringify(read()));
      storage.setItem(name, JSON.stringify(read()));
      if (remote) storage.setItem(name + '_remote', JSON.stringify(remote));
    };
    const verify = payload => {
      if (!payload || ['tasks','sessions','projects','goals'].some(k => !Array.isArray(payload[k]))) throw Error('shape');
      for (const k of fields) if (payload[k] && (!Array.isArray(payload[k]) || payload[k].some(x => !x || typeof x.id !== 'string'))) throw Error('shape');
      return payload;
    };
    async function syncOnce(choice) {
      if (!valid()) return false;
      busy = true;
      const owner = user.id, localEmail = email();
      const stillCurrent = () => valid() && user.id === owner && email() === localEmail;
      try {
        status('syncing');
        const row = check(await client.from('user_sessions').select('payload,revision').eq('user_id',owner).maybeSingle());
        if (!stillCurrent()) return;
        const local = JSON.parse(fingerprint(read())), localPrint = fingerprint(local), m = meta();
        if (!row) {
          const inserted = check(await client.from('user_sessions').insert({user_id:owner,payload:local,revision:0}).select('revision').single());
          if (!stillCurrent()) return;
          remember(inserted.revision,local);
        } else {
          verify(row.payload);
          if (!Number.isSafeInteger(row.revision) || row.revision < 0) throw Object.assign(Error('revision'),{code:'42703'});
          const remotePrint = fingerprint(row.payload);
          const localChanged = m ? m.base !== localPrint : fields.some(k=>local[k].length);
          const remoteChanged = !m || row.revision !== m.revision;
          if (!choice && localChanged && remoteChanged && localPrint !== remotePrint) {
            conflict = true; status('conflict'); return;
          }
          if (choice === 'remote' || (!choice && remoteChanged && localPrint !== remotePrint)) {
            if (read().activeSession) {status('active');return;}
            backup(row.payload);
            apply(row.payload);
            remember(row.revision,row.payload);
          } else if (choice === 'local' || localPrint !== remotePrint) {
            backup(row.payload);
            // Compare-and-swap prevents silent overwrite of another device's revision.
            const updated = check(await client.from('user_sessions').update({payload:local,revision:row.revision+1}).eq('user_id',owner).eq('revision',row.revision).select('revision').maybeSingle());
            if (!stillCurrent()) return;
            if (!updated) { conflict=true;status('conflict');return; }
            remember(updated.revision,local);
          } else remember(row.revision,local);
        }
        conflict=false;
        return true;
      } catch(e) { const state=errorState(e); if(state==='conflict')conflict=true; status(state); return false; }
      finally {busy=false;}
    }
    function sync(choice) {
      if (inFlight) {
        if (choice) return inFlight.then(() => sync(choice));
        return inFlight;
      }
      if (!valid()) return Promise.resolve(false);
      if (conflict && !choice) { status('conflict'); return Promise.resolve(false); }
      const owner = user.id;
      inFlight = (async () => {
        let nextChoice = choice;
        do {
          if (!await syncOnce(nextChoice)) return false;
          nextChoice = undefined;
          if (!valid() || user.id !== owner) return false;
        } while (fingerprint(read()) !== meta()?.base);
        status('saved');
        return true;
      })().finally(() => { inFlight = null; });
      return inFlight;
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
      } catch(e) {status(e?.code === 'invalid_credentials' ? 'auth' : errorState(e));}
    }
    async function resume() {
      try {
        const {session}=check(await client.auth.getSession());
        user=session?.user || null;
        if (user && !valid()) {status('identity');return;}
        if (user) return await sync(); else status('disconnected');
      } catch {status('offline');}
    }
    async function disconnect() {
      const result=await client.auth.signOut();
      if(result.error){status('offline');return;}
      user=null;conflict=false;status('disconnected');
    }
    return {connect,resume,disconnect,sync:()=>sync(),resolve:choice=>sync(choice)};
  }
  const api={create,snapshot,fingerprint,errorState};
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.NorthCloud=api;
})(typeof window==='object' ? window : globalThis);
