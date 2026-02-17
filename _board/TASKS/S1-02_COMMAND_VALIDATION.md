# S1-02: Add Command Validation

**File**: `src/services/tool-host.ts`  
**Dependencies**: S1-01  
**Phase**: 1 - Core Shell Tool Implementation

## Description
Add validation to ensure commands operate within sandbox directory restrictions.

## Acceptance Criteria
- Add `validateCommand(command: string, cwd: string): { allowed: boolean, reason?: string }` method
- Validate that `cwd` is within sandbox directory (resolve and check)
- Validate that resolved `cwd` path starts with `sandboxDir` and doesn't contain `..`
- Return clear error messages when validation fails
- Handle edge cases (empty cwd, relative paths, etc.)

## Implementation Notes
- Resolve `cwd` path using `path.resolve()`
- Check that resolved path starts with `sandboxDir` using `startsWith()`
- Check for path traversal attempts (contains `..`)
- Normalize paths before comparison
- Return descriptive error messages for debugging
- Consider validating file paths in command string (optional, may be complex)
