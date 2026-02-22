# AO-04 CronManager AI Query Support

## Context
Reusing existing logic to trigger autonomous AI workflows.

## Proposed Changes
- [ ] Support `task_type === "ai_query"`.
- [ ] When triggered, use the `reminderMessage` as the input query.
- [ ] Emit `event.cron.ai_query` with target `chatId`.

## Verification
- Log inspection: ensure correct event is emitted with the query as payload.
