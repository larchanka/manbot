# AO-07 Configurable Concurrency Management

## Context
Ensure the system doesn't overwhelm local resources during peak autonomous activity.

## Proposed Changes
- [ ] Add `maxConcurrentTasks` to `config.json` (Default: 1).
- [ ] Implement a `TaskQueue` in Orchestrator.
- [ ] Implement logic where `0` means infinite concurrency.
- [ ] Ensure human goals are prioritized or balanced with synthetic goals.

## Verification
- Set concurrency to 1. Trigger multiple cron jobs simultaneously. Verify they execute sequentially.
- Set concurrency to 0. Verify they start simultaneously.
