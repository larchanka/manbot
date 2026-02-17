# AI-Agent

A multi-process AI platform with type-safe IPC and capability-graph execution. Users interact via Telegram; the system plans tasks as DAGs, executes nodes (LLM, RAG, tools), and optionally revises output with a Critic agent.

## Features

- **Multi-agent pipeline**: Planner → Task Memory → Executor → Critic (optional revision loop)
- **Capability graph (DAG)**: Nodes for `generate_text`, `semantic_search`, `reflect`, `tool`; parallel execution where dependencies allow
- **Type-safe IPC**: JSONL over stdin/stdout with Zod-validated envelopes
- **Services**: Task Memory (SQLite, with `conversation_id` for session grouping), Logger, RAG (embeddings + SQLite; vector search via **sqlite-vss** when available, fallback to in-DB dot-product), Tool Host (read_file, write_file, http_get), Cron Manager
- **Telegram adapter**: Commands `/start`, `/task`, `/new`, `/help`; session tracking and conversation archiving; optional allow-list of user IDs
- **Conversation archiving**: `/new` resets the session, summarizes the previous conversation via a dedicated summarizer prompt, and stores the summary in RAG for later retrieval

## Requirements

- **Node.js** >= 20
- **Ollama** running locally (for LLM and embeddings)
- **Telegram Bot Token** (from [@BotFather](https://t.me/BotFather)) if using the Telegram adapter

### Ollama models (recommended)

- Small: `llama3:8b`
- Medium: `mistral`
- Large: `mixtral`
- Embeddings: `nomic-embed-text` (for RAG)

Install and run Ollama, then pull the models you need:

```bash
ollama pull nomic-embed-text
ollama pull mistral
```

## Configuration

1. Copy the example config and edit:

   ```bash
   cp config.json.example config.json
   ```

2. Edit `config.json` with your settings. Important keys:
   - **telegram.botToken** — Telegram bot API token (required for Telegram adapter)
   - **telegram.allowedUserIds** — Comma-separated Telegram user IDs; leave empty to allow all
   - **ollama.baseUrl** — Ollama API URL (default `http://127.0.0.1:11434`)
   - **rag.embedModel** — Embedding model for RAG (default `nomic-embed-text`)
   - **rag.dbPath** — SQLite path for RAG document storage (default `data/rag.sqlite`)
   - **rag.embeddingDimensions** — Vector dimension for sqlite-vss (default 768 for nomic-embed-text)
   - **modelRouter** — Ollama model names for small/medium/large
   - **toolHost.sandboxDir** — Directory allowed for file tools (default: cwd)

Environment variables override `config.json`. Supported env vars:

- `CONFIG_PATH` — Path to config file (default: `./config.json`)
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_USER_IDS`
- `OLLAMA_BASE_URL`, `OLLAMA_TIMEOUT_MS`, `OLLAMA_RETRIES`
- `TASK_MEMORY_DB`, `CRON_DB`, `LOG_DIR`, `LOG_FILE`
- `RAG_EMBED_MODEL`, `RAG_DB`, `RAG_EMBEDDING_DIMENSIONS`, `TOOL_SANDBOX_DIR`
- `MODEL_ROUTER_SMALL`, `MODEL_ROUTER_MEDIUM`, `MODEL_ROUTER_LARGE`

`config.json` is gitignored; do not commit secrets.

## Install

```bash
npm install
npm run build
```

## Run

### Full pipeline (Orchestrator + all agents and services)

Runs all processes under the Core Orchestrator; Telegram adapter receives messages and tasks flow through Planner → Task Memory → Executor → Telegram.

```bash
npm run start:orchestrator
```

For development (TypeScript without pre-build):

```bash
npm run dev:orchestrator
```

Ensure `config.json` has a valid **telegram.botToken** and Ollama is running.

### Standalone services (for testing or custom setups)

- **Telegram adapter only**: `npm run start:telegram` or `npm run dev:telegram`
- **Generator (model-router)**: `npm run start:generator`

Other services (task-memory, logger, planner, executor, critic-agent, rag-service, tool-host, cron-manager) are normally started by the Orchestrator; run them manually only if you are wiring your own pipeline.

## Tests

```bash
npm test
```

The suite includes unit tests for Task Memory, RAG Store, and graph utils, plus an integration test for the conversation archiving flow (`src/__tests__/archiving.test.ts`).

## Project layout

- **src/core/** — Core Orchestrator (process spawning, message routing, task pipeline)
- **src/agents/** — Planner, Executor, Critic; **prompts/** for system prompts (planner, critic, summarizer)
- **src/adapters/** — Telegram adapter
- **src/services/** — Task Memory, Logger, Ollama adapter, Model Router, Generator (generate_text + summarize), RAG (SQLite), Tool Host, Cron Manager
- **src/shared/** — Protocol (Zod schemas), BaseProcess, graph-utils, config
- **_docs/** — Architecture and protocol specs
- **_board/** — Task board and task specs

See **AI-Agent.md** for full folder/file structure and architecture.
