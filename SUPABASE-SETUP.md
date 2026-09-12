# Supabase setup and validation

## Existing project
You reported that supabase-setup.sql succeeded. This release uses that same user_sessions table; no new migration is required. Do not rerun CREATE TABLE or delete existing data.

## New project only
Run supabase-setup.sql once in the SQL Editor. Enable Email authentication, configure the deployed application's Site URL and allowed redirects, and retain email confirmation. Configure the public URL and publishable key in auth.js. Never expose service-role credentials.

## Unified authentication
Create account and Sign in call Supabase directly through auth.js. There is no second local/cloud login. Confirm email before signing in if required. A previous browser-only user registers with the same email once; an existing Supabase user signs in. A new device signs in to that same account.

## Storage
user_sessions contains one versioned JSON workspace document per authenticated user. Existing IDs and relationships are preserved. The document includes tasks, completed sessions, projects, goals, notes, events, habits, inbox, finances, health, learning, notifications, profile, settings and planning. Credentials and the active timer are excluded.

Local edits schedule synchronization after 700 ms. A 15-second poll retrieves remote changes. Network failures leave local edits pending. Check the saved status before closing. An active timer stays on its originating device until completion; cross-device timer transfer and distributed timer locking are not implemented.

Revision checks detect concurrent edits. Conflicting copies require an explicit choice in Settings > Sync and recovery, rather than an automatic merge. A local recovery snapshot is retained before replacement; remote replacement is blocked during an active timer.

## Files
- auth.js: shared Supabase client and authentication adapter.
- app.js: unified login/signup, verified identity before entering workspace.
- cloud-sync.js: snapshots, revision checks and recovery.
- workspace.js: automatic sync and status/recovery UI.
- index.html, sw.js, scripts: load and distribute the new modules.
- supabase-setup.sql: original schema and own-user RLS.

## Validation limits
Build and 39 tests passed using mocked authentication/database operations. The local unauthenticated screens loaded with no captured console errors. Real remote authentication, email confirmation and RLS have not been exercised by this implementation session.

After deployment, test with two accounts: create a task and finish a session in account A, sign in as A in a second browser and verify restoration. Verify account B cannot see A's workspace. Test offline edits and reconnection, and conflicting edits across browsers. Never disable RLS to solve a setup error.
