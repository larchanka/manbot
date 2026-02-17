# P11-14: Fix Cron Expression Extraction in Executor

**File**: `src/agents/executor-agent.ts`, `src/agents/prompts/planner.ts`  
**Dependencies**: P11-08  
**Phase**: 4 - Bug Fix

## Description
Fix the executor to properly extract cron expressions from dependency outputs instead of using placeholder strings.

## Problem
The executor is using the literal placeholder string `"<output from parse-time node>"` as a cron expression, causing validation errors. The executor should:
1. Detect and ignore placeholder values in node input
2. Properly extract the cron expression from the parse-time node's output
3. Handle different output formats (plain text, JSON, object)

## Acceptance Criteria
- Executor ignores placeholder strings like `"<output from parse-time node>"` in cronExpr field
- Executor properly extracts cron expression from dependency node outputs
- Handles plain text cron expressions from generate_text nodes
- Handles JSON-formatted outputs with cronExpr field
- Validates extracted cron expression before using it

## Implementation Notes
- Update `handleScheduleReminder` to detect placeholder strings and treat them as missing
- Improve extraction logic to handle:
  - Plain text cron expression (direct output from generate_text)
  - JSON string with cronExpr field
  - Object with cronExpr property
- Update planner example to omit cronExpr field when it should come from dependency
- Add validation to ensure extracted cronExpr is not empty and doesn't contain placeholders
