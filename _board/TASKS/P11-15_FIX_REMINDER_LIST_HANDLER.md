# P11-15: Fix Reminder List Handler in Orchestrator

**File**: `src/core/orchestrator.ts`  
**Dependencies**: P11-09  
**Phase**: 5 - Bug Fix

## Description
Fix the orchestrator to properly handle `reminder.list` messages from telegram-adapter.

## Problem
The `handleListReminders` and `handleCancelReminder` methods exist but are never called because `handleCoreMessage` doesn't have handlers for `reminder.list` and `reminder.cancel` message types.

## Acceptance Criteria
- `handleCoreMessage` checks for `reminder.list` type from telegram-adapter
- `handleCoreMessage` checks for `reminder.cancel` type from telegram-adapter
- Both handlers properly invoke the respective methods
- Error handling is in place for both handlers

## Implementation Notes
- Add `reminder.list` handler in `handleCoreMessage` before `task.create` handler
- Add `reminder.cancel` handler in `handleCoreMessage` before `task.create` handler
- Both should check `fromProcess === "telegram-adapter"`
- Extract `chatId` and `reminderId` (for cancel) from payload
- Call the respective handler methods with proper error handling
