# Backend and persistence review — 2026-10-04

This release preserves the existing vanilla JavaScript application, Supabase Auth identity, versioned `user_sessions` document, navigation and user records. It is a targeted correction of verified failures, not a replacement of the application or a claim that all possible defects are eliminated.

## Corrections

- Cloud synchronization checks the account UUID as well as its email. Delayed authentication and database responses cannot restore or report success for a different current account.
- Validate local, remote and reconciled data before sending it to the server. Reject duplicate record IDs and malformed collections instead of silently replacing them with empty lists.
- Ordinary uploads no longer create four redundant recovery snapshots. Reconciliation still requires a recovery copy; existing backups are preserved. A full metadata cache no longer turns a successful server save into a failed save or an endless retry.
- Retry loops are bounded. Pending changes are retried by the existing automatic synchronization interval.
- OTP verification shares one implementation. A network failure with a numeric password no longer starts unrelated OTP requests. Queued sign-in events are invalidated on sign-out.
- Finance forms retain their input and show an error when persistence fails. They no longer close and claim success after a failed write.
- Fixed a browser-specific form error: a hidden input named `id` shadowed the form's `id` property, broke debt saving and allowed the browser to reload the page.
- Debt payments use integer cents, reject missing debts and payments exceeding the remaining balance, and record exactly the same amount as an optional expense.
- Editing one month's starting balance no longer changes the fallback balance for other months. Invalid budget/debt amounts are rejected.
- Zero-impact habits remain zero-impact. Invalid task impacts cannot decrease or corrupt a goal's progress. Archived tasks cannot be completed accidentally.
- Goal rollover retains historical records and processes only completed days. Archiving a goal retains its links to tasks and habits.
- Removed an unused alternative home renderer, an unused password hash helper, duplicate task-completion logic and unused alternate cloud sign-in/sign-out methods.

## Live database work

Read-only inspection confirmed RLS, own-user SELECT/INSERT/UPDATE policies, authenticated grants and the revision trigger on `user_sessions`. No workspace rows or authentication records were modified as part of the review.

The existing feedback form referenced a missing `north_feedbacks` table. Created it using `supabase-feedback.sql` in a transaction (the unnecessary DROP POLICY line was omitted on this first installation). The table permits authenticated users to insert their own feedback; clients receive no SELECT, UPDATE or DELETE grant. RLS is enabled. The new table and policy were verified in Supabase.

## Validation

- `npm test`: 82 passing automated tests, including account changes during in-flight synchronization, storage quota, concurrency, backup recovery, invalid data, authentication, timers, payments and failed form saves.
- `npm run lint`: JavaScript syntax, unique HTML IDs, linked assets and manifest checks pass.
- `npm run build`: production assets generated in `dist/`.
- Browser checks on synthetic local data: create a debt of 100 with 90 already paid; pay the remaining 10; verify debt zero and balance changes from 800 to 790. Start task-linked Pomodoro, pause, refresh, resume, finish, save, and verify the same recorded duration in home and analytics. No new console errors occurred after the debt-form correction.
- No TypeScript compiler is applicable: this project uses JavaScript.

## Limits

Real customer data was not changed for testing, and synchronization between the customer's physical phone and PC was not replayed. Tests cover those cases with isolated fixtures. Storage remains browser-local plus one Supabase JSON document per account; recovery snapshots may still require free local storage during reconciliation. Offline changes upload when connectivity and authentication are restored. Active running timers remain device-local by design; completed sessions are synchronized.

## Run

Use Node.js 24.x. Run `npm ci`, then `npm start`, and open http://127.0.0.1:4173/. Production: `npm run build`; Vercel serves `dist/`. Existing working workspaces do not require rerunning `supabase-setup.sql`.
