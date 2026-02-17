# P11-07: Add Planner Example for Reminders

**File**: `src/agents/prompts/planner.ts`  
**Dependencies**: P11-06  
**Phase**: 3 - Planner Enhancement

## Description
Add few-shot example showing how to plan a reminder request.

## Acceptance Criteria
- Example shows user request: "Remind me tomorrow at 3pm to call John"
- Plan includes two nodes: parse time expression, schedule reminder
- Dependencies are correctly specified
- Example follows the existing format

## Example Structure
```json
{
  "taskId": "task-reminder-1",
  "complexity": "small",
  "reflectionMode": "OFF",
  "nodes": [
    {
      "id": "parse-time",
      "type": "generate_text",
      "service": "model-router",
      "input": { "modelClass": "small", "prompt": "Convert 'tomorrow at 3pm' to cron expression..." }
    },
    {
      "id": "schedule",
      "type": "schedule_reminder",
      "service": "cron-manager",
      "input": { "dependsOn": ["parse-time"], "reminderMessage": "call John" }
    }
  ],
  "edges": [{ "from": "parse-time", "to": "schedule" }]
}
```
