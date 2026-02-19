# M1-03: Implement ModelManagerService Core

**File**: `src/services/model-manager.ts`  
**Dependencies**: M1-01, M1-02  
**Phase**: M1 - Core Infrastructure

## Description
Create the `ModelManagerService` to manage tiered model lifecycles and ensure model availability.

## Acceptance Criteria
- `ModelManagerService` class created.
- `ensureModelLoaded(tier: ModelTier)` implemented with concurrency safety (locking).
- `prewarmModels()` implemented for sequential loading of small and medium models.
- Correct `keep_alive` values passed during warmup based on tier.

## Implementation Notes
- Use a `Map<string, Promise<void>>` or similar to handle concurrent load operations.
- Map `small`, `medium`, `large` to model names from `ModelRouter`.
- Small/Medium should have infinite keep-alive (`-1`).
- Large should have temporary keep-alive (e.g., `5m`).
