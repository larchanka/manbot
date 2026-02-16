# Task: P4-01 Telegram Adapter

## Description
Develop a standalone service to interface the AI Agent platform with Telegram, allowing users to interact with the system via a bot.

## Requirements
- Create `src/adapters/telegram-adapter.ts`.
- Use `node-telegram-bot-api`.
- Normalize incoming messages into the system's Message Protocol.
- Send messages to the Core Orchestrator for processing.
- Receive responses from the Orchestrator and send them back to the user on Telegram.

## Definition of Done
- Telegram bot correctly receives and forwards messages to the system.
- System responses are reliably delivered to the user's Telegram chat.
