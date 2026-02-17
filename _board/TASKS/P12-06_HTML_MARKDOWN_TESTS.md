# P12-06: Add HTML to Markdown Tests

**File**: `src/utils/__tests__/html-to-markdown.test.ts`  
**Dependencies**: P12-05  
**Phase**: 2 - Core Utilities

## Description
Create unit tests for HTML to Markdown converter to ensure quality conversions.

## Acceptance Criteria
- Tests conversion of headings (h1-h6)
- Tests conversion of lists (ul, ol)
- Tests conversion of links and images
- Tests conversion of code blocks and inline code
- Tests conversion of tables
- Tests stripping of scripts and styles
- Tests handling of malformed HTML
- Tests handling of empty input
- All tests pass with `npm test`

## Implementation Notes
- Use Vitest for testing (already in project)
- Create fixtures with sample HTML for each test case
- Verify Markdown output matches expected format
- Test edge cases (nested elements, special characters, etc.)
