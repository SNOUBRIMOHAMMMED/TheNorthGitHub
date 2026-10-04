# Client flow audit corrections

The task-to-focus path had inaccessible timer modes/settings, recorded work was hidden without an estimate, and several existing internal destinations fell back to Home. Captured distractions could not be found in global search. These links are restored without expanding primary navigation.

- Add task-linked stopwatch, custom countdown and contextual Pomodoro settings. Keep the form open when saving fails.
- Session summary lets the user explicitly mark the task complete; energy/quality stay unrecorded until supplied.
- Search Inbox and note bodies; omit archived records. Converting a session distraction carries its goal/project.
- Show task work without estimates; avoid undefined legacy impact labels and exclude archived tasks from legacy daily lists.
- Preserve legacy shutdown ideas, and allow returning after daily shutdown.
- Correct zero habit impact and average session denominator; describe tracked effort rather than claiming quality or savings.
- Require explicit quick-finance category selection. Add localized accessible labels.
- Give mobile task titles a full reading row; put focus/delete actions beneath them.

Validation: 94 automated tests, syntax/assets checks and production build from a clean release folder; browser QA with synthetic data at desktop, 390px and 320px. Auth and cloud regression tests use mocked Supabase requests. No database migration, account reset, customer-data edits or test-auth fixture shipped.

Remaining product opportunities: simplify goal setup; one main progress metric; select existing tasks for daily planning; consolidate duplicate momentum/planner views; meaningful overdue alerts. Live cross-device cloud verification is not asserted. Active timers remain device-local and account-wide timer locking needs server support.
