# M2-03: Integration Testing for Inference Flow

**File**: `src/services/__tests__/generator-model-manager.test.ts`  
**Dependencies**: M2-01  
**Phase**: M2 - Integration & Verification

## Description
Integration test to verify that inference requests correctly trigger model loading.

## Acceptance Criteria
- Mock Lemonade adapter.
- Verify `GeneratorService` + `ModelManagerService` interaction.
- All tests pass with `npm test`.

## Implementation Notes
- Send a `node.execute` envelope and check if `ensureModelLoaded` was called.
- Verify that inference waits for the load operation to complete.
