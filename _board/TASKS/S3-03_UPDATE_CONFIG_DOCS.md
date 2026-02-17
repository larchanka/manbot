# S3-03: Update Config Documentation

**File**: `src/shared/config.ts`  
**Dependencies**: S1-03  
**Phase**: 3 - Update Planner and Documentation

## Description
Update config interface comments to reflect shell tool usage instead of read_file/write_file.

## Acceptance Criteria
- Update `ToolHostConfig` interface comment:
  - Change from: `/** Directory allowed for read_file/write_file. Paths outside are rejected. */`
  - Change to: `/** Directory allowed for shell tool file operations. Paths outside are rejected. */`
- TypeScript compilation succeeds with no errors

## Implementation Notes
- Find ToolHostConfig interface (around line 38-41)
- Update comment to reflect shell tool
- Keep sandbox directory description accurate
- Ensure comment is clear and helpful
- No functional changes needed, only documentation
