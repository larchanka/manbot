# S5-02: Manual Testing - Sandbox Enforcement

**Dependencies**: S1-04  
**Phase**: 5 - Testing and Verification

## Description
Test that sandbox restrictions are properly enforced and commands outside sandbox are rejected.

## Acceptance Criteria
- Try to access file outside sandbox: `cat /etc/passwd` (if sandbox is not root)
- Verify command is rejected or fails appropriately
- Try to change directory outside sandbox: `cd / && pwd`
- Verify sandbox restrictions are enforced
- Try relative path traversal: `cat ../../etc/passwd`
- Verify path traversal is blocked
- Test that operations within sandbox work correctly

## Implementation Notes
- Test various path traversal attempts
- Verify error messages are clear
- Test edge cases (empty paths, relative paths, etc.)
- Document security boundaries
- Test with different sandbox directory configurations
- Ensure no false positives (legitimate operations blocked)
