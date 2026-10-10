/* Workspace storage only. Authentication credentials remain managed by Supabase. */
(function (root) {
  'use strict';
  const ACCOUNT = 'lifeos_v11_accounts';
  const auxiliary = key => /^(north_cloud_v1_|north_before_cloud_|lifeos_recovery_|north_identity_recovery_)/.test(key);
  const owned = key => key === ACCOUNT || key === 'lifeos_v11_session' || auxiliary(key);
  function indexedDBStore(indexedDB) {
    return new Promise((resolve, reject) => {
      if (!indexedDB) return reject(Error('IndexedDB unavailable'));
      const request = indexedDB.open('north-workspace-storage', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('records', {keyPath:'key'});
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(Error('Storage upgrade blocked'));
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        function transaction(mode, operation) {
          return new Promise((done, fail) => {
            const tx = db.transaction('records', mode), req = operation(tx.objectStore('records'));
            let value;
            req.onsuccess = () => { value = req.result; };
            tx.oncomplete = () => done(value);
            tx.onerror = tx.onabort = () => fail(tx.error || req.error || Error('Storage transaction failed'));
          });
        }
        resolve({all:()=>transaction('readonly', s=>s.getAll()), get:key=>transaction('readonly',s=>s.get(key)), put:record=>transaction('readwrite',s=>s.put(record))});
      };
    });
  }
  function create({local, durable, onError=()=>{}, onChange=()=>{}, publish=()=>{}}) {
    const cache = new Map(), failures = new Map();
    let backend = null, tail = Promise.resolve();
    function nativeGet(key) { return local.getItem(key); }
    function cacheRecord(record) {
      if (record && owned(record.key) && (typeof record.value === 'string' || record.value === null)) cache.set(record.key, record.value);
    }
    const ready = (async () => {
      try {
        backend = await durable;
        for (const record of await backend.all()) cacheRecord(record);
        // Archive the bulky legacy recovery/cache copies before removing their local copies.
        // Never remove workspace data, other apps' storage, or authentication tokens.
        const keys = [];
        try { for (let i=0; i<local.length; i++) { const key=local.key(i); if (key && auxiliary(key)) keys.push(key); } } catch {}
        for (const key of keys) {
          try {
            if (!cache.has(key)) {
              const value = nativeGet(key);
              await backend.put({key,value});
              cache.set(key,value);
            }
            local.removeItem(key);
          } catch { /* Keep the original recovery copy if archival could not complete. */ }
        }
      } catch { backend = null; } // Native storage remains available when IndexedDB is disabled.
    })();
    function persist(key, value, removeLegacy) {
      cache.set(key, value);
      tail = tail.then(async () => {
        try {
          await backend.put({key,value});
          failures.delete(key);
          if (removeLegacy) { try { local.removeItem(key); } catch {} }
          publish(key);
        } catch (error) {
          failures.set(key,error);
          if (!auxiliary(key)) onError(error);
        }
      });
    }
    function getItem(key) { return cache.has(key) ? cache.get(key) : nativeGet(key); }
    function setItem(key, value) {
      value = String(value);
      if (!owned(key)) return local.setItem(key,value);
      if (backend && (cache.has(key) || auxiliary(key))) return persist(key,value,true);
      try { local.setItem(key,value); }
      catch (error) {
        if (!backend) throw error;
        persist(key,value,true);
      }
    }
    function removeItem(key) {
      if (backend && cache.has(key)) return persist(key,null,true);
      try { local.removeItem(key); }
      catch (error) { if (!backend || !owned(key)) throw error; persist(key,null,true); }
    }
    async function flush(key) {
      await ready;
      let pending;
      do { pending=tail; await pending; } while (pending!==tail);
      // A transient IndexedDB failure must be retryable without discarding pending work.
      const retry = [...failures.keys()].filter(k=>key ? k===key : !auxiliary(k));
      for (const k of retry) persist(k,cache.get(k),true);
      if (retry.length) await tail;
      const error = key ? failures.get(key) : [...failures].find(([k])=>!auxiliary(k))?.[1];
      if (error) throw error;
    }
    async function refresh(key, announce=false) {
      await flush(key);
      if (backend && owned(key)) {
        const before=getItem(key), record=await backend.get(key);
        cacheRecord(record);
        if (announce && getItem(key)!==before) onChange(key);
      }
    }
    return {getItem,setItem,removeItem,ready,flush,refresh};
  }
  const api = {create,indexedDBStore};
  if (typeof module === 'object' && module.exports) module.exports=api;
  else {
    const channel = typeof root.BroadcastChannel === 'function' ? new root.BroadcastChannel('north-workspace-storage') : null;
    const storage = create({local:root.localStorage, durable:indexedDBStore(root.indexedDB),
      onError:error=>root.dispatchEvent(new CustomEvent('north:storage-error',{detail:{error}})),
      onChange:key=>root.dispatchEvent(new CustomEvent('north:storage-change',{detail:{key}})),
      publish:key=>channel?.postMessage({key})});
    if (channel) channel.onmessage = event => {
      const key=event.data?.key;
      if (typeof key==='string' && owned(key)) storage.refresh(key,true).catch(()=>{});
    };
    root.NorthStorage=storage;
  }
})(typeof window === 'object' ? window : globalThis);
