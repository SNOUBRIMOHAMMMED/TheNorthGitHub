# Storage and cloud reliability — 2026-10-10

- Removed the dependence of cloud reconciliation on successful duplicate local recovery writes. Recovery data remains available when it can be stored; a full recovery cache cannot block the actual server save.
- Added IndexedDB archival for recovery snapshots and merge baselines, plus an account-workspace fallback when native localStorage is full. Existing snapshots are copied before removing their local duplicates.
- Await account persistence before acknowledging entity saves, imports, automatic saves and cloud restoration. Preserve failed pending work and permit retries.
- Refresh durable account data inside the existing per-account browser write lock. Notify other tabs after committed fallback writes.
- Recheck the authenticated account after asynchronous restoration to prevent another account receiving the old account's sync metadata.
- Preserve the previous import recovery point before replacing or adding account data. Supabase keys/passwords/tokens never enter this storage adapter.
- Updated offline asset caching and the production build so `storage.js` is included everywhere.

The public export excludes local QA pages and scripts, private account backups and English-plan manifests. No database reset, SQL migration or authentication-account recreation was performed.

## Focused security source review

- Escape imported task linkage values before placing them in HTML attributes.
- Restrict priority styling to known classes and escape the displayed priority text.
- Escape notification type values in the legacy renderer. Preserve imported data; rendering never treats these values as markup.

These final rendering changes received syntax checks and source tracing. No attack fixture was run against production accounts. The earlier 126-test functional run covers the storage update before this rendering patch. Live RLS policy deployment remains an administrative verification requirement; this review is not a complete penetration test.
