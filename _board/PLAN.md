# Reminder System Implementation Plan

## Overview

Implement a reminder system that allows users to request one-time or recurring reminders via Telegram. When a reminder fires, the bot will send a message back to the user. The system will leverage the existing `CronManager` service and integrate with the Planner and Orchestrator.

## User Review Required

> [!IMPORTANT]
> **Natural Language Parsing Approach**
> 
> The current plan uses the LLM (via `model-router`) to parse natural language time expressions (e.g., "remind me in 5 minutes", "every Monday at 9am") into cron expressions. This is flexible but adds latency and LLM dependency.
> 
> **Alternative**: Use a dedicated library like `chrono-node` for more deterministic parsing. Please confirm which approach you prefer.

> [!IMPORTANT]
> **Reminder Message Format**
> 
> When a reminder fires, the bot will send: `🔔 Reminder: <original message>`. Please confirm if you want a different format or additional options (e.g., snooze, dismiss).

## Proposed Changes

### Component 1: Planner Prompt Enhancement

Update the planner prompt to recognize reminder requests and include a new capability type for scheduling reminders.

#### [MODIFY] [planner.ts](file:///Users/mikhaillarchanka/Projects/AI-Agent/src/agents/prompts/planner.ts)

- Add `cron-manager` service documentation to the available services section
- Add new capability type: `schedule_reminder`
- Include example showing how to parse a reminder request into a plan with time parsing + cron scheduling nodes

---

### Component 2: Cron Event Handling

The `CronManager` currently only emits `event.cron.completed` events to the logger. We need to handle these events in the Orchestrator and route them to Telegram.

#### [MODIFY] [orchestrator.ts](file:///Users/mikhaillarchanka/Projects/AI-Agent/src/core/orchestrator.ts)

- Add handler for `event.cron.completed` events in `handleCoreMessage`
- Extract reminder metadata (chatId, message) from the event payload
- Send reminder message to Telegram using `sendToTelegram`

#### [MODIFY] [cron-manager.ts](file:///Users/mikhaillarchanka/Projects/AI-Agent/src/services/cron-manager.ts)

- Update `runJob` to emit `event.cron.completed` with structured payload including `chatId` and `reminderMessage`
- Ensure the payload stored in the database includes all necessary metadata for reminder delivery

---

### Component 3: Executor Integration

The Executor needs to handle the new `schedule_reminder` capability type and communicate with the `CronManager`.

#### [MODIFY] [executor-agent.ts](file:///Users/mikhaillarchanka/Projects/AI-Agent/src/agents/executor-agent.ts)

- Add handler for `schedule_reminder` node type
- Send `cron.schedule.add` message to `cron-manager` with parsed cron expression and reminder metadata
- Handle response and store schedule ID in node output

---

### Component 4: Time Expression Parsing

Create a new service or utility to parse natural language time expressions into cron expressions.

#### [NEW] [time-parser.ts](file:///Users/mikhaillarchanka/Projects/AI-Agent/src/services/time-parser.ts)

- Implement `parseTimeExpression(input: string): { cronExpr: string, isRecurring: boolean }` function
- Use LLM (via `model-router`) to convert natural language to cron expressions
- Include validation and error handling for invalid expressions
- Support both one-time (using specific date/time) and recurring (using cron patterns) reminders

---

### Component 5: Database Schema

The existing `cron_schedules` table should be sufficient, but we may want to add reminder-specific metadata.

#### [MODIFY] [cron-manager.ts](file:///Users/mikhaillarchanka/Projects/AI-Agent/src/services/cron-manager.ts) (Schema)

- Consider adding optional columns: `reminder_chat_id`, `reminder_message`, `reminder_user_id` for better querying
- **Alternative**: Store all reminder metadata in the existing `payload` JSON column (simpler, no migration needed)

**Recommendation**: Use the existing `payload` column to avoid schema changes.

---

### Component 6: Reminder Management Commands

Add Telegram commands to list and cancel reminders.

#### [MODIFY] [telegram-adapter.ts](file:///Users/mikhaillarchanka/Projects/AI-Agent/src/adapters/telegram-adapter.ts)

- Add `/reminders` command to list active reminders for the user
- Add `/cancel_reminder <id>` command to remove a specific reminder
- Send requests to `cron-manager` via the orchestrator

## Verification Plan

### Automated Tests

1. **Unit test for time parser**
   ```bash
   npm test src/services/__tests__/time-parser.test.ts
   ```
   - Test parsing of common expressions: "in 5 minutes", "tomorrow at 3pm", "every Monday at 9am"
   - Test error handling for invalid expressions

2. **Integration test for cron scheduling**
   ```bash
   npm test src/services/__tests__/cron-manager.test.ts
   ```
   - Test adding a schedule via IPC
   - Test that `event.cron.completed` is emitted with correct payload
   - Test listing and removing schedules

### Manual Verification

1. **One-time reminder test**
   - Start the orchestrator: `npm run dev:orchestrator`
   - Send message via Telegram: "Remind me in 2 minutes to check the oven"
   - Verify that the bot responds with confirmation
   - Wait 2 minutes and verify reminder message is received

2. **Recurring reminder test**
   - Send message via Telegram: "Remind me every day at 9am to take vitamins"
   - Verify confirmation message
   - Check database to confirm cron expression is correct: `sqlite3 data/cron.sqlite "SELECT * FROM cron_schedules;"`
   - Verify reminder fires at the scheduled time (may need to adjust time for testing)

3. **List and cancel reminders**
   - Send `/reminders` command
   - Verify list of active reminders is displayed
   - Send `/cancel_reminder <id>` with an ID from the list
   - Verify reminder is removed and confirmation is sent
   - Send `/reminders` again to confirm it's gone
