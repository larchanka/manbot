# S3-02: Update Planner Prompt - Document Shell Tool

**File**: `src/agents/prompts/planner.ts`  
**Dependencies**: S3-01  
**Phase**: 3 - Update Planner and Documentation

## Description
Add comprehensive documentation for shell tool including purpose, arguments, response format, and common use cases.

## Acceptance Criteria
- Add `shell` tool documentation section with:
  - Purpose: Execute shell commands for file operations, process management, etc.
  - Arguments: `command` (required), `cwd` (optional)
  - Response format: `{ stdout, stderr, exitCode, command, cwd }`
  - Common use cases:
    - Read file: `cat path/to/file.txt`
    - Write file: `echo "content" > path/to/file.txt` or heredoc syntax
    - List files: `ls -la`, `ls -la directory/`
    - Check processes: `ps aux`, `pgrep process_name`
    - Search files: `grep "pattern" file.txt`, `find . -name "*.txt"`
  - Security note: All file operations restricted to sandbox directory
- Add examples showing shell tool usage for file operations
- Update "For file operations" section to use shell tool

## Implementation Notes
- Follow format of http_get tool documentation
- Include clear examples for common operations
- Document response structure clearly
- Explain when to use shell tool vs other tools
- Add security warnings about sandbox restrictions
- Include heredoc syntax example for multi-line writes
- Document error handling (exitCode, stderr)
