# P11-10: Add Cancel Reminder Command

**File**: `src/adapters/telegram-adapter.ts`  
**Dependencies**: P11-09  
**Phase**: 5 - Telegram Commands

## Description
Add `/cancel_reminder` command to remove a specific reminder.

## Acceptance Criteria
- `/cancel_reminder <id>` command sends `cron.schedule.remove` to `cron-manager`
- Validates that the reminder belongs to the requesting user
- Sends confirmation message on success
- Sends error message if ID is invalid or reminder not found

## Implementation Notes
- Add handler for `/cancel_reminder` command with ID parameter
- First, list all schedules to verify the reminder belongs to the user
- If valid, send `cron.schedule.remove` message to `cron-manager`
- Send confirmation: "✅ Reminder cancelled successfully"
- Handle errors: "❌ Reminder not found or you don't have permission to cancel it"
