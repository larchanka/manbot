# Task: P10-02 Silent system messages in Telegram

## Description
The user wants to send certain system messages (like "task created") to Telegram but without sound (using `disable_notification: true`), rather than not sending them at all. This provides feedback without being intrusive.

## Requirements
- Update `telegram-adapter.ts` to handle the `silent` flag by passing `disable_notification: true` to Telegram API instead of skipping the message.
- Restore intermediate system messages (e.g., "Task created", "Planning...") in `orchestrator.ts` or `telegram-adapter.ts` but mark them as `silent: true`.
- Ensure only the final result is sent with sound (normal message).

## Definition of Done
- "Task created" and other system messages are delivered to Telegram without sound.
- Final task results are still delivered with sound (standard behavior).
- IPC between Core and Telegram Adapter correctly carries the `silent` flag.
