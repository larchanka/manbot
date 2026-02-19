# M2-02: Implement Startup Prewarming in Orchestrator

**File**: `src/core/orchestrator.ts`  
**Dependencies**: M1-03  
**Phase**: M2 - Integration & Verification

## Description
Trigger the prewarming of small and medium models during application startup.

## Acceptance Criteria
- `ModelManagerService` initialized in `Orchestrator`.
- `prewarmModels()` called during the bootstrap phase.
- Prewarming does not block the main application flow.

## Implementation Notes
- Call `prewarmModels()` but do not `await` it in a way that blocks other services from starting.
- Log prewarming start and completion.
