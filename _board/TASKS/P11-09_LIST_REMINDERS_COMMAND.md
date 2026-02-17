# P11-09: Add List Reminders Command

**File**: `src/adapters/telegram-adapter.ts`  
**Dependencies**: P11-03  
**Phase**: 5 - Telegram Commands

## Description
Add `/reminders` command to list active reminders for the user.

## Acceptance Criteria
- `/reminders` command sends `cron.schedule.list` to `cron-manager` via orchestrator
- Filters results to show only user's reminders (by chatId)
- Formats and displays reminder list with ID, time, and message
- Shows "No active reminders" if list is empty

## Implementation Notes
- Add handler for `/reminders` command in the Telegram adapter
- Send IPC message to `cron-manager` with type `cron.schedule.list`
- Parse the response and filter schedules by chatId
- Format each reminder as: `ID: ${id}\nTime: ${cronExpr}\nMessage: ${reminderMessage}`
- Send formatted list back to the user
