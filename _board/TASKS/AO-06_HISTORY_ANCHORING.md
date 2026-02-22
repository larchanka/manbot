# AO-06 History Anchoring for Synthetic Tasks

## Context
Autonomous tasks should have access to relevant conversation history.

## Proposed Changes
- [ ] Ensure `runTaskPipeline` correctly picks up history for `chatId` when triggered by cron.
- [ ] Index the results of autonomous tasks into the shared session memory.

## Verification
- Ask a follow-up question in Telegram about an autonomous task's result to confirm context visibility.
