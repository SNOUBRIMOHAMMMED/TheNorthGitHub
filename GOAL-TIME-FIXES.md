# Goal work and planning corrections

- Goal details now show actual focus/manual work, today/week totals, total planned hours, remaining hours, expected work to date and recent session accomplishments.
- Task rows show recorded work instead of an invented 25 minute estimate.
- Progress measurement and time budget are visible in the goal editor. New goals default to time progress; existing outcome percentages remain unchanged.
- A daily minutes budget plus start/end dates calculates an inclusive calendar-day total. Explicit target hours override the daily calculation.
- Planned hours use the unrounded date fraction, avoiding hours of rounding error on annual plans.
- Legacy sessions missing a goal link inherit the current linked task goal for reporting only. Explicit historical links and stored records are preserved.
- Completed tasks remain completed when edited through the simplified form.
- Weekly habit streaks use weekly rules and labels.
- Saving a linked focus session returns to its goal.

Existing goals need their intended start/end dates and time budget configured once. A manual outcome goal retains manual progress until the user selects time measurement. Working on a task records effort; it does not silently mark the entire task complete.

Validation: 85 automated tests, syntax/assets checks and production build passed. Browser QA used synthetic local data, including a 50 minute work segment plus a 5 minute break, annual daily planning, pause/reload/resume/finish/save and goal navigation. No database migration or customer-data edits.
