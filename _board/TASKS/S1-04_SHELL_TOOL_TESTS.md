# S1-04: Add Shell Tool Tests

**File**: `src/services/__tests__/tool-host.test.ts`  
**Dependencies**: S1-03  
**Phase**: 1 - Core Shell Tool Implementation

## Description
Create comprehensive tests for shell tool functionality including file operations, validation, and error handling.

## Acceptance Criteria
- Test reading file: `cat file.txt` command
- Test writing file: `echo "content" > file.txt` then verify file exists
- Test listing files: `ls -la` command
- Test custom cwd parameter
- Test sandbox path validation (reject paths outside sandbox)
- Test invalid command handling
- Test command with non-zero exit code
- Test stdout and stderr capture
- All tests pass with `npm test`

## Implementation Notes
- Create test files in sandbox directory
- Clean up test files after tests
- Test both successful and failing commands
- Verify stdout/stderr are captured correctly
- Test exit codes (0 for success, non-zero for failure)
- Test path validation with various edge cases
- Mock or use real file system for tests
