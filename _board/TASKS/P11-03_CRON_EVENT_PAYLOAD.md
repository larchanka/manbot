# P11-03: Update Cron Manager Event Payload

**File**: `src/services/cron-manager.ts`  
**Dependencies**: None  
**Phase**: 1 - Core Infrastructure

## Description
Modify `CronManager.runJob()` to emit structured reminder data in `event.cron.completed`.

## Acceptance Criteria
- `event.cron.completed` payload includes `chatId`, `reminderMessage`, `userId`
- Payload is extracted from the stored `payload` column in the database
- Existing functionality is not broken

## Implementation Notes
- Parse the JSON payload from the database row
- Extract reminder-specific fields: `chatId`, `reminderMessage`, `userId`
- Include these fields in the `event.cron.completed` event payload
- Ensure backward compatibility for non-reminder cron jobs
