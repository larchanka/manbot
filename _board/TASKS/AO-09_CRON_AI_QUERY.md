# AO-09 CronManager AI Query Support

## Context
Enable CronManager to handle AI query tasks.

## Proposed Changes
- [ ] Implement trigger logic for `task_type === 'ai_query'`.
- [ ] Emit `event.cron.ai_query` with the prompt and context.

## Verification
- Verify `event.cron.ai_query` is emitted when a scheduled job fires.
