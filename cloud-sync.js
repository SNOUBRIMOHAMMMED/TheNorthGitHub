/* Cloud persistence: authenticated, optimistic concurrency, local fallback. */
(function (root) {
  'use strict';
  const fields = ['tasks','sessions','projects','goals','notes','events','habits','inbox','finances','health','learning','notifications'];
  const objectFields = ['profile','settings','planning','dismissed','lastActivityByGoal'];
  const snapshot = d => ({...Object.fromEntries(fields.map(k => [k, d[k] || []])),...Object.fromEntries(objectFields.filter(k=>d[k]!==undefined).map(k=>[k,d[k]])),...(d.categories?{categories:d.categories}:{}),...(d.range!==undefined?{range:d.range}:{}),...(d.lastOpened?{lastOpened:d.lastOpened}:{})});
  const fingerprint = d => JSON.stringify(snapshot(d));
  const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  // Three-way reconciliation: retain independent edits and additions from both devices.
  // Concurrent edits to the same scalar use the current saving device's value.
  function mergeValue(base, local, remote) {
    if (equal(local,remote) || equal(remote,base)) return local;
    if (equal(local,base)) return remote;
    if (Array.isArray(local) && Array.isArray(remote)) {
      const previous = Array.isArray(base) ? base : [];
      if ([...local,...remote,...previous].every(x=>x && typeof x.id==='string')) {
        const maps = [previous,local,remote].map(xs=>new Map(xs.map(x=>[x.id,x])));
        return [...new Set([...maps[1].keys(),...maps[2].keys()])].flatMap(id=>{
          const [b,l,r] = maps.map(m=>m.get(id));
          if (!l) return b && equal(r,b) ? [] : [r];
          if (!r) return b && equal(l,b) ? [] : [l];
          return [mergeValue(b,l,r)];
        });
      }
      if ([...local,...remote,...previous].every(x=>typeof x!=='object')) {
        return [...new Set([...local,...remote])].filter(x=>!previous.includes(x) || (local.includes(x)&&remote.includes(x)));
      }
      return local;
    }
    if (local && remote && typeof local==='object' && typeof remote==='object' && !Array.isArray(local) && !Array.isArray(remote)) {
      return Object.fromEntries([...new Set([...Object.keys(local),...Object.keys(remote)])].map(k=>[k,mergeValue(base?.[k],local[k],remote[k])]).filter(([,v])=>v!==undefined));
    }
    // Deleting on one device must not discard an independently edited record/field.
    return local === undefined ? remote : local;
  }
  const merge = (base,local,remote) => snapshot(mergeValue(base, snapshot(local), snapshot(remote)));
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
    let busy = false, user = null, inFlight = null;
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
      if (remote) {
        if (!storage.getItem(name + '_remote_first')) storage.setItem(name + '_remote_first', JSON.stringify(remote));
        storage.setItem(name + '_remote', JSON.stringify(remote));
      }
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
          let outgoing = local;
          if (!choice && localChanged && remoteChanged && localPrint !== remotePrint) {
            let base;
            try { base = m?.base ? JSON.parse(m.base) : undefined; } catch {}
            outgoing = merge(base,local,row.payload);
          }
          if (choice === 'remote' || (!choice && !localChanged && remoteChanged && localPrint !== remotePrint)) {
            if (read().activeSession) {status('active');return;}
            backup(row.payload);
            // Changes made while the read was in flight must remain pending for upload.
            apply(merge(local,JSON.parse(fingerprint(read())),row.payload));
            remember(row.revision,row.payload);
          } else if (choice === 'local' || localPrint !== remotePrint) {
            backup(row.payload);
            // Compare-and-swap prevents silent overwrite of another device's revision.
            const updated = check(await client.from('user_sessions').update({payload:outgoing,revision:row.revision+1}).eq('user_id',owner).eq('revision',row.revision).select('revision').maybeSingle());
            if (!stillCurrent()) return;
            if (!updated) return 'retry';
            if (!equal(outgoing,local)) apply(merge(local,JSON.parse(fingerprint(read())),outgoing));
            remember(updated.revision,outgoing);
          } else remember(row.revision,local);
        }
        return true;
      } catch(e) { const state=errorState(e); if(state==='conflict')return 'retry'; status(state); return false; }
      finally {busy=false;}
    }
    function sync(choice) {
      if (inFlight) {
        if (choice) return inFlight.then(() => sync(choice));
        return inFlight;
      }
      if (!valid()) return Promise.resolve(false);
      const owner = user.id;
      inFlight = (async () => {
        let nextChoice = choice;
        let races = 0;
        while (true) {
          const result = await syncOnce(nextChoice);
          if (result === 'retry') {
            if (++races >= 3) {status('pending');return false;}
            continue;
          }
          if (!result) return false;
          nextChoice = undefined;
          if (!valid() || user.id !== owner) return false;
          if (fingerprint(read()) === meta()?.base) break;
        }
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
      user=null;status('disconnected');
    }
    return {connect,resume,disconnect,sync:()=>sync(),resolve:choice=>sync(choice)};
  }
  const api={create,snapshot,fingerprint,errorState,merge};
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.NorthCloud=api;
})(typeof window==='object' ? window : globalThis);
