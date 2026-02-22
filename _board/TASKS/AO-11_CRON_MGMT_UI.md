# AO-11 Cron Job Management UI

## Context
Provide a user-friendly way to schedule AI queries.

## Proposed Changes
- [ ] Add "Schedules" tab to dashboard.
- [ ] List current cron jobs with their type (`reminder` vs `ai_query`).
- [ ] Add "New AI Query" form: Input prompt + Cron expression.
- [ ] Implement deletion of cron jobs from the UI.

## Verification
- Add a job via the UI and verify it appears in the `cron.sqlite` database.
