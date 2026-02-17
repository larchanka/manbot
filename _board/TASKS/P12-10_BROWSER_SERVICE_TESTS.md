# P12-10: Add Browser Service Tests

**File**: `src/services/__tests__/browser-service.test.ts`  
**Dependencies**: P12-09  
**Phase**: 3 - Browser Service

## Description
Create integration tests for browser service to ensure reliability.

## Acceptance Criteria
- Tests fetching a simple static HTML page
- Tests fetching a page with JavaScript (mocked SPA)
- Tests timeout handling with slow-loading page
- Tests browser instance reuse
- Tests cleanup on shutdown
- Tests error handling for invalid URLs
- Tests stealth plugin is applied
- All tests pass with `npm test`

## Implementation Notes
- Use local test server or mock responses for predictable tests
- Test with real websites sparingly (can be flaky)
- Verify browser is properly closed after tests
- Test both headless and headful modes if needed
- Mock slow responses using test server delays
