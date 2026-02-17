# P11-13: Update README

**File**: `README.md`  
**Dependencies**: P11-12  
**Phase**: 6 - Testing & Documentation

## Description
Document the reminder feature in the README.

## Acceptance Criteria
- Adds "Reminder System" section to Features
- Documents supported time expressions
- Documents `/reminders` and `/cancel_reminder` commands
- Includes examples of reminder requests

## README Additions

### Features Section
Add to the features list:
- **Reminder System**: Schedule one-time or recurring reminders via natural language; cron-based scheduling with Telegram delivery

### New Section: Reminder System
```markdown
## Reminder System

The bot supports scheduling reminders using natural language:

### One-time Reminders
- "Remind me in 5 minutes to check the oven"
- "Remind me tomorrow at 3pm to call John"
- "Remind me next Monday at 9am about the meeting"

### Recurring Reminders
- "Remind me every day at 9am to take vitamins"
- "Remind me every Monday at 10am about the team meeting"
- "Remind me every week to review the budget"

### Managing Reminders
- List active reminders: `/reminders`
- Cancel a reminder: `/cancel_reminder <id>`
```
