# AO-10 Orchestrator Synthetic Task Pipeline

## Context
Bridge cron events to the AI Agent reasoning pipeline.

## Proposed Changes
- [ ] Implement `handleCronAiQuery()` in Orchestrator.
- [ ] This should wrap the `ai_query` prompt and inject it into `runTaskPipeline`.
- [ ] Map the cron task result back to the specific Telegram `chatId`.

## Verification
- Create an `ai_query` cron job.
- Verify the agent plans and executes the task, then sends the result to Telegram.
