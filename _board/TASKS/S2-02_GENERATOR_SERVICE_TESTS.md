# S2-02: Add Generator Service Tests

**File**: `src/services/__tests__/generator-service.test.ts`  
**Dependencies**: S2-01  
**Phase**: 2 - Update Dependent Services

## Description
Test that generator service correctly handles shell tool responses and extracts content.

## Acceptance Criteria
- Test that shell tool stdout is extracted correctly
- Test that stderr is handled appropriately (included if non-empty)
- Test that read operations (cat) produce expected content in prompts
- All tests pass with `npm test`

## Implementation Notes
- Mock shell tool responses
- Test stdout extraction in prompt building
- Test stderr inclusion logic
- Test empty stdout handling
- Test multiple shell tool responses in context
- Verify content appears correctly in generated prompts
