# AO-04 Standalone Router Service

## Context
Orchestrator is doing too much. Routing should be a dumb, high-speed pipe.

## Proposed Changes
- [ ] Create `src/core/router-service.ts`.
- [ ] Implement simple routing logic: read from any child, write to the target named in `to`.
- [ ] Standardize the "Hub and Spoke" IPC model.

## Verification
- Test routing between two mock processes via the Router.
