# S1-01: Implement Shell Tool Core

**File**: `src/services/tool-host.ts`  
**Dependencies**: None  
**Phase**: 1 - Core Shell Tool Implementation

## Description
Implement the core shell tool that executes shell commands in a sandboxed environment.

## Acceptance Criteria
- Add `shellTool` method that accepts `command` (required, string) and `cwd` (optional, string)
- Use Node.js `child_process.exec` or `spawn` to execute commands
- Default `cwd` to `sandboxDir` from config
- Return structured response: `{ stdout, stderr, exitCode, command, cwd }`
- Handle command execution errors gracefully
- Include JSDoc documentation

## Implementation Notes
- Use `child_process.exec` for simplicity (or `spawn` if streaming is needed)
- Set `cwd` option in exec/spawn options
- Capture both stdout and stderr separately
- Return exit code from process
- Handle timeout if needed (use config timeout)
- Ensure proper error handling for command failures
- Log command execution for debugging
