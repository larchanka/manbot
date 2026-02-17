# P11-11: Update Help Command

**File**: `src/adapters/telegram-adapter.ts`  
**Dependencies**: P11-09, P11-10  
**Phase**: 5 - Telegram Commands

## Description
Update `/help` command to document reminder functionality.

## Acceptance Criteria
- Help text includes reminder examples
- Documents `/reminders` and `/cancel_reminder` commands
- Provides example reminder requests

## Help Text Addition
```
📅 Reminders:
- Ask me to remind you: "Remind me in 5 minutes to check the oven"
- Recurring reminders: "Remind me every day at 9am to take vitamins"
- List reminders: /reminders
- Cancel a reminder: /cancel_reminder <id>
```
