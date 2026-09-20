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

One versioned JSON document stores each authenticated user's workspace, including tasks and completed focus sessions. Local edits schedule synchronization; periodic polling retrieves remote changes. Concurrent changes produce a recovery choice rather than a silent overwrite. An active timer remains local to its browser. Network failures retain local edits; check the synchronization status before leaving.

Live authentication, email delivery, RLS and synchronization must be checked against the actual Supabase project; the automated test suite uses mocked responses.
