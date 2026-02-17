# Reminder System Tasks

## Phase 1: Core Infrastructure

### Task 1.1: Create Time Parser Service
**File**: `src/services/time-parser.ts`
**Dependencies**: None
**Description**: Create a service that converts natural language time expressions into cron expressions using the LLM.
**Acceptance Criteria**:
- Exports `parseTimeExpression(input: string): Promise<{ cronExpr: string, isRecurring: boolean, description: string }>`
- Uses `model-router` to parse natural language
- Returns valid cron expressions compatible with `node-cron`
- Handles both one-time and recurring reminders
- Throws descriptive errors for invalid inputs

### Task 1.2: Add Time Parser Tests
**File**: `src/services/__tests__/time-parser.test.ts`
**Dependencies**: Task 1.1
**Description**: Create unit tests for the time parser service.
**Acceptance Criteria**:
- Tests parsing "in X minutes/hours/days"
- Tests parsing "tomorrow/next week at HH:MM"
- Tests parsing "every day/week/Monday at HH:MM"
- Tests error handling for invalid expressions
- All tests pass with `npm test`

### Task 1.3: Update Cron Manager Event Payload
**File**: `src/services/cron-manager.ts`
**Dependencies**: None
**Description**: Modify `CronManager.runJob()` to emit structured reminder data in `event.cron.completed`.
**Acceptance Criteria**:
- `event.cron.completed` payload includes `chatId`, `reminderMessage`, `userId`
- Payload is extracted from the stored `payload` column in the database
- Existing functionality is not broken

### Task 1.4: Add Cron Manager Integration Tests
**File**: `src/services/__tests__/cron-manager.test.ts`
**Dependencies**: Task 1.3
**Description**: Create integration tests for cron manager reminder functionality.
**Acceptance Criteria**:
- Tests adding a reminder schedule via IPC
- Tests that `event.cron.completed` is emitted with correct reminder payload
- Tests listing schedules
- Tests removing schedules
- All tests pass with `npm test`

---

## Phase 2: Orchestrator Integration

### Task 2.1: Handle Cron Events in Orchestrator
**File**: `src/core/orchestrator.ts`
**Dependencies**: Task 1.3
**Description**: Add handler for `event.cron.completed` to route reminders to Telegram.
**Acceptance Criteria**:
- `handleCoreMessage` handles `event.cron.completed` events
- Extracts `chatId` and `reminderMessage` from payload
- Calls `sendToTelegram` with formatted reminder message
- Logs errors if chatId or message is missing

---

## Phase 3: Planner Enhancement

### Task 3.1: Update Planner Prompt with Reminder Capability
**File**: `src/agents/prompts/planner.ts`
**Dependencies**: None
**Description**: Add `cron-manager` service and `schedule_reminder` capability to planner prompt.
**Acceptance Criteria**:
- Documents `cron-manager` service in "Available Services and Capabilities" section
- Adds `schedule_reminder` capability type with input schema
- Includes example showing reminder request → plan with time parsing + scheduling nodes
- Prompt instructs planner to recognize reminder keywords ("remind me", "reminder", etc.)

### Task 3.2: Add Planner Example for Reminders
**File**: `src/agents/prompts/planner.ts`
**Dependencies**: Task 3.1
**Description**: Add few-shot example showing how to plan a reminder request.
**Acceptance Criteria**:
- Example shows user request: "Remind me tomorrow at 3pm to call John"
- Plan includes two nodes: parse time expression, schedule reminder
- Dependencies are correctly specified
- Example follows the existing format

---

## Phase 4: Executor Enhancement

### Task 4.1: Add Schedule Reminder Handler to Executor
**File**: `src/agents/executor-agent.ts`
**Dependencies**: Task 1.1, Task 3.1
**Description**: Add handler for `schedule_reminder` node type in the executor.
**Acceptance Criteria**:
- Executor recognizes `schedule_reminder` node type
- Calls `time-parser` to convert natural language to cron expression
- Sends `cron.schedule.add` message to `cron-manager` with reminder metadata
- Stores schedule ID in node output
- Handles errors from time parser and cron manager

---

## Phase 5: Telegram Commands

### Task 5.1: Add List Reminders Command
**File**: `src/adapters/telegram-adapter.ts`
**Dependencies**: Task 1.3
**Description**: Add `/reminders` command to list active reminders for the user.
**Acceptance Criteria**:
- `/reminders` command sends `cron.schedule.list` to `cron-manager` via orchestrator
- Filters results to show only user's reminders (by chatId)
- Formats and displays reminder list with ID, time, and message
- Shows "No active reminders" if list is empty

### Task 5.2: Add Cancel Reminder Command
**File**: `src/adapters/telegram-adapter.ts`
**Dependencies**: Task 5.1
**Description**: Add `/cancel_reminder` command to remove a specific reminder.
**Acceptance Criteria**:
- `/cancel_reminder <id>` command sends `cron.schedule.remove` to `cron-manager`
- Validates that the reminder belongs to the requesting user
- Sends confirmation message on success
- Sends error message if ID is invalid or reminder not found

### Task 5.3: Update Help Command
**File**: `src/adapters/telegram-adapter.ts`
**Dependencies**: Task 5.1, Task 5.2
**Description**: Update `/help` command to document reminder functionality.
**Acceptance Criteria**:
- Help text includes reminder examples
- Documents `/reminders` and `/cancel_reminder` commands
- Provides example reminder requests

---

## Phase 6: Testing & Documentation

### Task 6.1: Manual End-to-End Testing
**Dependencies**: All previous tasks
**Description**: Perform manual testing of the complete reminder flow.
**Acceptance Criteria**:
- One-time reminder works: "Remind me in 2 minutes to check the oven"
- Recurring reminder works: "Remind me every day at 9am to take vitamins"
- `/reminders` command lists active reminders
- `/cancel_reminder` command removes reminders
- Reminders are delivered to the correct chat
- Error messages are clear and helpful

### Task 6.2: Update README
**File**: `README.md`
**Dependencies**: Task 6.1
**Description**: Document the reminder feature in the README.
**Acceptance Criteria**:
- Adds "Reminder System" section to Features
- Documents supported time expressions
- Documents `/reminders` and `/cancel_reminder` commands
- Includes examples of reminder requests
