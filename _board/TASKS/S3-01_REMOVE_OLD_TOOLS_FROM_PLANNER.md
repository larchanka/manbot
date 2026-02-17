# S3-01: Update Planner Prompt - Remove Old Tools

**File**: `src/agents/prompts/planner.ts`  
**Dependencies**: S1-03  
**Phase**: 3 - Update Planner and Documentation

## Description
Remove read_file and write_file from planner prompt tool list and update references.

## Acceptance Criteria
- Remove `read_file` and `write_file` from available tools list
- Update tool list to show: `shell`, `http_get`, `http_search`
- Update "DO NOT invent tool names" warning to reflect new tool list
- Remove examples that use read_file/write_file

## Implementation Notes
- Find tool list section (around line 62-64)
- Remove read_file and write_file from list
- Update tool count if mentioned
- Remove any examples using old tools
- Update any conditional logic that checks for these tools
- Ensure consistency across all tool references
