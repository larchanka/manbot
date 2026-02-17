# P11-12: Manual End-to-End Testing

**Dependencies**: All previous P11 tasks  
**Phase**: 6 - Testing & Documentation

## Description
Perform manual testing of the complete reminder flow.

## Acceptance Criteria
- One-time reminder works: "Remind me in 2 minutes to check the oven"
- Recurring reminder works: "Remind me every day at 9am to take vitamins"
- `/reminders` command lists active reminders
- `/cancel_reminder` command removes reminders
- Reminders are delivered to the correct chat
- Error messages are clear and helpful

## Test Scenarios

### Scenario 1: One-time Reminder
1. Start orchestrator: `npm run dev:orchestrator`
2. Send via Telegram: "Remind me in 2 minutes to check the oven"
3. Verify confirmation message
4. Wait 2 minutes
5. Verify reminder is delivered: "🔔 Reminder: check the oven"

### Scenario 2: Recurring Reminder
1. Send: "Remind me every day at 9am to take vitamins"
2. Verify confirmation
3. Check database: `sqlite3 data/cron.sqlite "SELECT * FROM cron_schedules;"`
4. Verify cron expression is correct (e.g., `0 9 * * *`)

### Scenario 3: List and Cancel
1. Send: `/reminders`
2. Verify list shows active reminders
3. Copy an ID from the list
4. Send: `/cancel_reminder <id>`
5. Verify confirmation
6. Send: `/reminders` again
7. Verify reminder is removed
