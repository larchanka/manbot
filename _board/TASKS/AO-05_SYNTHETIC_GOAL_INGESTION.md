# AO-05 Synthetic Goal Ingestion (Stateful)

## Context
Unify human and autonomous inputs while ensuring each autonomous run is uniquely identifiable.

## Proposed Changes
- [ ] Handle `event.cron.ai_query` in `Orchestrator.handleLine`.
- [ ] **Generate a unique `taskId` (UUID)** for each autonomous run.
- [ ] Route the query into the existing `runTaskPipeline` using the new `taskId`.
- [ ] Ensure results are stored in `task_memory` indexed by this `taskId`.

## Verification
- Verify that multiple runs of the same cron job result in separate entries in the `task_memory` database with unique IDs.
