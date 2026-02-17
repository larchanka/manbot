# P11-08: Add Schedule Reminder Handler to Executor

**File**: `src/agents/executor-agent.ts`  
**Dependencies**: P11-01, P11-06  
**Phase**: 4 - Executor Enhancement

## Description
Add handler for `schedule_reminder` node type in the executor.

## Acceptance Criteria
- Executor recognizes `schedule_reminder` node type
- Calls `time-parser` to convert natural language to cron expression
- Sends `cron.schedule.add` message to `cron-manager` with reminder metadata
- Stores schedule ID in node output
- Handles errors from time parser and cron manager

## Implementation Notes
- Add new case in `executeNode` method for `schedule_reminder` type
- Extract `cronExpr`, `chatId`, `reminderMessage`, `userId` from node input
- If `cronExpr` is not provided, use `time-parser` to generate it from natural language
- Send IPC message to `cron-manager` with type `cron.schedule.add`
- Store the returned schedule ID in the node's output
- Handle errors gracefully and include error details in node output
