# P11-05: Handle Cron Events in Orchestrator

**File**: `src/core/orchestrator.ts`  
**Dependencies**: P11-03  
**Phase**: 2 - Orchestrator Integration

## Description
Add handler for `event.cron.completed` to route reminders to Telegram.

## Acceptance Criteria
- `handleCoreMessage` handles `event.cron.completed` events
- Extracts `chatId` and `reminderMessage` from payload
- Calls `sendToTelegram` with formatted reminder message
- Logs errors if chatId or message is missing

## Implementation Notes
- Add a new condition in `handleCoreMessage` for `event.cron.completed`
- Extract `chatId`, `reminderMessage`, and optionally `userId` from the event payload
- Format the message as: `🔔 Reminder: ${reminderMessage}`
- Use `sendToTelegram(chatId, formattedMessage)` to deliver the reminder
- Log warning if required fields are missing
