# Technology Stack and Dependencies

## Core Runtime

- Node.js (>= 20)
- TypeScript

---

## Process Management

- child_process (native)
- optionally: execa

---

## Communication

- JSON-RPC style internal protocol
- zod (schema validation)

---

## LLM

- Ollama
- Models:
  - Small: llama3:8b
  - Medium: mistral
  - Large: deepseek-coder / mixtral

---

## Embeddings

- Ollama embedding models
- FAISS (via Python service or node binding)

---

## Databases

- SQLite (better-sqlite3)
  - Task memory
  - Structured memory

---

## Telegram

- node-telegram-bot-api

---

## Cron

- node-cron

---

## Logging

- pino (structured logs)
- file-based storage

---

## Validation

- zod

---

## Dev Tools

- tsup or esbuild
- eslint
- prettier
- vitest

---

## Optional Future

- Web dashboard (React + WebSocket)
- Redis (distributed bus)
- NATS
- Docker Compose

