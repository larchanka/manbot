# P11-04: Add Cron Manager Integration Tests

**File**: `src/services/__tests__/cron-manager.test.ts`  
**Dependencies**: P11-03  
**Phase**: 1 - Core Infrastructure

## Description
Create integration tests for cron manager reminder functionality.

## Acceptance Criteria
- Tests adding a reminder schedule via IPC
- Tests that `event.cron.completed` is emitted with correct reminder payload
- Tests listing schedules
- Tests removing schedules
- All tests pass with `npm test`

## Test Cases
1. **Add schedule**: Send `cron.schedule.add` message, verify response contains schedule ID
2. **Event emission**: Trigger a cron job, verify `event.cron.completed` is emitted with correct payload
3. **List schedules**: Send `cron.schedule.list`, verify response contains all schedules
4. **Remove schedule**: Send `cron.schedule.remove`, verify schedule is deleted
