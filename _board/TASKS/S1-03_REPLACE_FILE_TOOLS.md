# S1-03: Replace read_file and write_file Registration

**File**: `src/services/tool-host.ts`  
**Dependencies**: S1-02  
**Phase**: 1 - Core Shell Tool Implementation

## Description
Update tool registration to use shell tool instead of read_file/write_file tools.

## Acceptance Criteria
- Remove `readFileTool` and `writeFileTool` from `registerDefaultTools()`
- Add `shell` tool registration: `this.tools.set("shell", this.shellTool.bind(this))`
- Remove `readFileTool` and `writeFileTool` method implementations
- Remove `resolvePath` method if no longer needed (or adapt for shell tool validation)
- Update file header comment to reflect shell tool instead of read_file/write_file

## Implementation Notes
- Keep `resolvePath` if it's useful for shell tool validation
- Update all comments referencing read_file/write_file
- Ensure backward compatibility considerations (if needed)
- Update tool registration order if important
- Remove unused imports (readFile, writeFile from fs/promises)
