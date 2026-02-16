# Task: P4-02 Connect Telegram to Orchestrator

## Description
Integrate the Telegram Adapter with the Core Orchestrator to enable the standard task creation and execution flow triggered by Telegram messages.

## Requirements
- Define `/start`, `/task`, and help commands in the Telegram Adapter.
- Map Telegram `message.text` to the user goal in Task Memory.
- Ensure authentication (e.g., allow-list of Telegram user IDs).
- Stream task progress updates back to the Telegram chat.

## Definition of Done
- A user can start a task via Telegram and see the execution progress.
- Initial and final outputs are correctly displayed in the Telegram chat.
