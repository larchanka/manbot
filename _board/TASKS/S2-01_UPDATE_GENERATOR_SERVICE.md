# S2-01: Update Generator Service Content Extraction

**File**: `src/services/generator-service.ts`  
**Dependencies**: S1-03  
**Phase**: 2 - Update Dependent Services

## Description
Update generator service to extract content from shell tool responses instead of read_file responses.

## Acceptance Criteria
- Remove `read_file` response handling (content extraction logic)
- Add `shell` tool response handling:
  - Extract `stdout` from shell tool responses
  - Include `stderr` in context if non-empty (for debugging)
  - Handle read operations (e.g., `cat file.txt` outputs to stdout)
- Update comments to reflect shell tool usage
- Test that shell tool stdout is correctly extracted and used in prompts

## Implementation Notes
- Find where read_file content extraction happens (around line 75-77)
- Replace with shell tool stdout extraction
- Check response structure: `{ stdout, stderr, exitCode, command, cwd }`
- Include stderr in context if present (may help with debugging)
- Ensure empty stdout is handled gracefully
- Update related comments and documentation
