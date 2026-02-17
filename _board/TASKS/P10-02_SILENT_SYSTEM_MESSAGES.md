# Task: P10-02 Silent system messages in Telegram

## Description
The user wants to silence certain system messages in the Telegram adapter, such as "task created" notifications and other administrative status updates that might clutter the conversation.

## Requirements
- Identify all intermediate system messages sent to Telegram (e.g., in `orchestrator.ts` and `telegram-adapter.ts`).
- Add a configuration option or parameter to `sendToTelegram` to make certain messages "silent" or optional.
- Ensure only essential final results or critical errors are sent to the user by default.
- (Optional) Implement a "verbose" mode that can be toggled via a command if the user wants to see progress.

## Definition of Done
- "Task created" and other non-essential system messages are no longer sent to the user in Telegram.
- The core conversation flow feels cleaner and less cluttered by technical status updates.
- Critical errors and final task results are still delivered correctly.
