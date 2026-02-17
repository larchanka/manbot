# S5-03: Manual Testing - Process Management

**Dependencies**: S1-04  
**Phase**: 5 - Testing and Verification

## Description
Test shell tool with process management commands to verify system command execution.

## Acceptance Criteria
- Execute `ps aux | head -5` and verify output shows process list
- Execute `pgrep node` and verify output shows Node.js process IDs
- Execute `echo $PATH` and verify environment variables are accessible
- Test command chaining: `ls -la | grep ".txt"`
- Verify stdout/stderr are captured correctly

## Implementation Notes
- Test various process management commands
- Verify pipe operations work correctly
- Test environment variable access
- Test command chaining and pipelines
- Verify output formatting
- Document any limitations or restrictions
