# M1-04: Unit Tests for ModelManagerService

**File**: `src/services/__tests__/model-manager.test.ts`  
**Dependencies**: M1-03  
**Phase**: M1 - Core Infrastructure

## Description
Create comprehensive unit tests for the `ModelManagerService`.

## Acceptance Criteria
- Tests sequential prewarming logic.
- Tests concurrency safety (concurrent `ensureModelLoaded` calls).
- Tests correct tier-to-model mapping and keep-alive parameters.
- All tests pass with `npm test`.

## Implementation Notes
- Mock `LemonadeAdapter` using `vi.fn()`.
- Use `vi.useFakeTimers()` if needed to test timeouts/delays.
- Verify the number of calls to `lemonade.warmup`.
