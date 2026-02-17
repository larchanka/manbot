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
- RAG: SQLite-backed document store; **sqlite-vss** for scalable KNN vector search when available (macOS x64/arm64, Linux x64); fallback to in-DB dot-product on other platforms. Configurable `rag.embeddingDimensions` (default 768).

---

## Databases

- SQLite (better-sqlite3)
  - Task memory (with `conversation_id` for session grouping)
  - RAG documents (`rag.dbPath`)
  - Structured memory (cron, etc.)

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

