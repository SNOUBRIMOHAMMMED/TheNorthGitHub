# QA — Life OS 4

## Automated

20 tests in Node's built-in test runner:

- Additive, idempotent migration; source data remains untouched.
- Stopwatch timestamps, pause/resume, serialization/refresh, trailing pause accounting.
- Countdown boundary reconciliation after late wakeup, extensions, open-ended continuation.
- Pomodoro automatic and manual transitions, long breaks, unstarted-round target accounting.
- Duplicate active-session rejection, idempotent finish protection, cancellation isolation.
- Overnight report splitting; running-session reports without data mutation.
- Manual time validation: ordering, future entries and overlap.
- Fresh storage reads, quota failure preserving the previous committed value.
- Backup validation and paused active-session import at the export timestamp.
- Goal impact reversal at 100%, standalone tasks and recurring month-end behavior.
- Legacy rendering and language switching after navigation replacement.

`npm run lint` checks JavaScript syntax, unique static HTML IDs, referenced assets and manifest JSON. `npm run build` validates then copies the static production assets. There is no TypeScript compiler in this JavaScript project.

## Browser verification

Performed against fictional QA data on a separate localhost origin; production user data was not accessed or modified.

- Original local app and published landing page reviewed before changes.
- New dashboard in light/dark appearance and Arabic RTL / English LTR.
- Linked task → focus setup correctly selects project and goal.
- Start, pause, refresh paused, resume, refresh running: timer preserved.
- Distraction capture → Inbox count; completion notes → saved session summary.
- Actual Pomodoro work boundary → automatic break; break boundary → paused next focus when auto-focus is off.
- Session totals exclude break time; second-level duration visible in summaries/history.
- Task creation with project, goal, estimate and subtasks; completion updates goal progress.
- Manual 75-minute session saved and linked to task/project/goal.
- Planning/review and notes survive immediate navigation and refresh.
- Project creation in Arabic on a 390-pixel mobile viewport; details open correctly.
- Mobile Explore menu reaches secondary sections; no page-level horizontal overflow in sampled home/project screens.
- Project, calendar, planning, habit, learning, legacy momentum, goal cascade and signal pages render without undefined/NaN or desktop horizontal overflow in sampled checks.
- No console errors in the fresh verification tab during these checks.

## Test limits

Cross-device sync, real push notifications while a device sleeps, billing and server authentication do not exist in the inherited infrastructure. Real hardware sleep, Safari/iOS installation and every possible browser/device combination were not exercised. Offline behavior is implemented through the service worker but was not tested with a physical network disconnect. Auto-focus timing and multi-cycle catch-up were verified with deterministic domain tests; manual browser testing covered auto-break and waiting at the next focus boundary.

No fictional QA data is included in the published application files. It resides only in the test origin used during development.
