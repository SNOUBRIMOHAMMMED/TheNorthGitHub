# Supabase setup

This release preserves the existing cloud adapters. No remote database changes were performed.

## Existing working project

Keep the current database. Do not run a table reset or rerun the bootstrap script. The adapter expects `public.user_sessions` with `user_id` (UUID primary key), `payload` (JSONB), `revision` (bigint) and `updated_at` (timestamptz), and policies limiting each authenticated user to their own row. If the deployed schema differs, inspect it and prepare a data-preserving migration separately.

## New empty project

1. In the Supabase SQL Editor, run the complete `supabase-setup.sql` once.
2. Enable email authentication. Set your deployed site URL and allowed redirect URLs. Retain email confirmation.
3. Put the project URL and publishable client key in `auth.js`. Never use a service-role key in the application.
4. Verify with two test accounts that each account can read/write only its own workspace, and test email confirmation and sign-in.

The bootstrap SQL includes the `revision` column used by the existing adapter and trigger. A stray character before `updated_at` was corrected in this local export. The script has not been executed against the live database.

## Behavior

One versioned JSON document stores each authenticated user's workspace, including tasks and completed focus sessions. Local edits schedule synchronization; periodic polling retrieves remote changes. Independent changes from devices are merged with revision-based compare-and-swap. An active timer remains local to its browser. Network failures retain local edits; check the synchronization status before leaving.

## Device storage reliability — 2026-10-10

`storage.js` archives workspace recovery copies and cloud merge metadata into IndexedDB. Legacy local copies are removed only after their IndexedDB transaction commits; account records and Supabase authentication tokens are not deleted by this migration. If the main workspace hits the native localStorage quota, it falls back to IndexedDB and is loaded from there after restart. Saving and cloud restoration wait for the durable account transaction before reporting completion. If both browser storage systems fail, the UI reports the failure and preserves pending work for export/retry.

This update does not alter live database rows, RLS policies, authentication users, or table schema. The Supabase dashboard was not available for a new administrative schema inspection during this update. Existing authenticated cloud loading/saving was verified through the application; automated isolation/concurrency checks use test doubles.

Live authentication, email delivery, RLS and synchronization must be checked against the actual Supabase project; the automated test suite uses mocked responses.


## Reliability update — 2026-09-21
- Run `supabase-feedback.sql` once to enable the feedback inbox. Until then the UI reports that delivery failed and keeps the draft open; it does not claim success.
- In Authentication → URL Configuration, add your production URL and the same URL with `?recovery=1` to allowed Redirect URLs. Configure Site URL and SMTP for confirmation and recovery email delivery.
- Password reset follows Supabase Auth `resetPasswordForEmail`, `PASSWORD_RECOVERY`, and `updateUser`; confirmation resend uses `resend({type: 'signup'})`.
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/auth/redirect-urls
- Paid checkout and AI coaching are not launched. Current finance tools remain available. A localStorage tier is never treated as a paid entitlement; future entitlements must be set by a trusted backend in app_metadata and enforced by the backend for paid services.
