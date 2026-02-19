# M2-01: Integrate ModelManager into GeneratorService

**File**: `src/services/generator-service.ts`  
**Dependencies**: M1-03  
**Phase**: M2 - Integration & Verification

## Description
Update `GeneratorService` to call the `ModelManagerService` before performing any inference.

## Acceptance Criteria
- `ModelManagerService` injected into `GeneratorService`.
- `ensureModelLoaded` called before `ollama.chat` and `ollama.generate`.
- Works correctly with all model tiers.

## Implementation Notes
- Pass the complexity level (`small` | `medium` | `large`) to `ensureModelLoaded`.
- Handle potential errors from the manager gracefully.
