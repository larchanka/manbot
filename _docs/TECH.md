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

- Lemonade Server (OpenAI-compatible API)
- Models (Local):
  - Small: qwen2.5:0.5b
  - Medium: qwen2.5:1.5b
  - Large: qwen2.5:7b

---

## Embeddings

- Lemonade embedding models
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

## File Processing

- **Lemonade /transcriptions** — local Whisper-Tiny speech-to-text inference
- **ffmpeg-static** (`^5.3.0`) — bundled ffmpeg binary for audio format conversion (any → 16 kHz mono WAV)
- **LemonadeAdapter.chatWithImage()** — multimodal image OCR/description via `qwen3-vl` model

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

