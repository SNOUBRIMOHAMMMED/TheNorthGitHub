# Storage and cloud reliability — 2026-10-10

- Removed the dependence of cloud reconciliation on successful duplicate local recovery writes. Recovery data remains available when it can be stored; a full recovery cache cannot block the actual server save.
- Added IndexedDB archival for recovery snapshots and merge baselines, plus an account-workspace fallback when native localStorage is full. Existing snapshots are copied before removing their local duplicates.
- Await account persistence before acknowledging entity saves, imports, automatic saves and cloud restoration. Preserve failed pending work and permit retries.
- Refresh durable account data inside the existing per-account browser write lock. Notify other tabs after committed fallback writes.
- Recheck the authenticated account after asynchronous restoration to prevent another account receiving the old account's sync metadata.
- Preserve the previous import recovery point before replacing or adding account data. Supabase keys/passwords/tokens never enter this storage adapter.
- Updated offline asset caching and the production build so `storage.js` is included everywhere.

The public export excludes local QA pages and scripts, private account backups and English-plan manifests. No database reset, SQL migration or authentication-account recreation was performed.
