# AO-13 Test: Cron-Driven AI Task

## Context
End-to-end integration test for the autonomous cron-to-ai flow.

## Proposed Changes
- [ ] Create `src/tests/cron-ai.test.ts`.
- [ ] Mock a cron-fire event.
- [ ] Verify Orchestrator starts the pipeline.
- [ ] Mock tool-host/model-router responses.
- [ ] Verify final event emission.

## Verification
- Run `npm test src/tests/cron-ai.test.ts`.
