# P11-06: Update Planner Prompt with Reminder Capability

**File**: `src/agents/prompts/planner.ts`  
**Dependencies**: None  
**Phase**: 3 - Planner Enhancement

## Description
Add `cron-manager` service and `schedule_reminder` capability to planner prompt.

## Acceptance Criteria
- Documents `cron-manager` service in "Available Services and Capabilities" section
- Adds `schedule_reminder` capability type with input schema
- Includes example showing reminder request → plan with time parsing + scheduling nodes
- Prompt instructs planner to recognize reminder keywords ("remind me", "reminder", etc.)

## Implementation Notes
- Add new section for `cron-manager` service after `tool-host` section
- Document the `schedule_reminder` capability type
- Specify input schema: `{ cronExpr: string, chatId: number, reminderMessage: string, userId?: number }`
- Add guidance on when to use this capability (when user requests reminders)
