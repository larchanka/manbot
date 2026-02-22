# AO-08 SQLite Schema Update for Cron

## Context
Prepare the cron database for AI-driven tasks.

## Proposed Changes
- [ ] Update `SCHEMA` in `cron-manager.ts`.
- [ ] Add migration/check for `task_type` field and ensures `ai_query` is a valid option.
- [ ] Update types and interfaces.

## Verification
- Check `cron.sqlite` schema after restart.
