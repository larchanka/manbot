# 🧬 ManBot (AI-Agent): Folder Structure and TypeScript Architecture

## Folder and File Structure

```
AI-Agent/
├── config.json.example          # Example config (copy to config.json)
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── README.md
├── AI-Agent.md                 # This file
├── _board/
│   ├── _BOARD.md               # Task board (To Do / In Progress / Done)
│   ├── INSTRUCTIONS.md         # Workflow for task execution
│   └── TASKS/                  # Task specs (P1-01, P2-01, …)
├── _docs/
│   ├── ARCHITECTURE.md         # Architectural patterns
│   ├── CAPABILITY GRAPH.md     # DAG format and node types
│   ├── COMPONENTS.md           # Process-oriented components
│   ├── MESSAGE PROTOCOL SPEC.md
│   ├── PROJECT.md
│   ├── TASK MEMORY SQLITE SCHEMA.md
│   └── TECH.md                 # Stack and dependencies
├── src/
│   ├── index.ts                # Platform entry (placeholder)
│   ├── __tests__/
│   │   └── archiving.test.ts   # Integration test: conversation archiving flow
│   ├── core/
│   │   └── orchestrator.ts     # Core Orchestrator: spawns processes, routes messages, task pipeline
│   ├── agents/
│   │   ├── planner-agent.ts    # Plan creation (goal → DAG) via Ollama
│   │   ├── executor-agent.ts  # DAG traversal, node dispatch, Task Memory, revision loop
│   │   ├── critic-agent.ts    # Reflection: PASS/REVISE on draft output
│   │   └── prompts/
│   │       ├── planner.ts     # Planner system prompt and builder
│   │       ├── critic.ts      # Critic system prompt and builder
│   │       └── summarizer.ts  # Summarizer prompt for memory extraction (archiving)
│   ├── adapters/
│   │   └── telegram-adapter.ts # Telegram bot → protocol; task.create, telegram.send/progress
│   ├── services/
│   │   ├── ollama-adapter.ts   # Ollama API: generate, chat, embed
│   │   ├── model-router.ts     # Complexity → Ollama model name
│   │   ├── generator-service.ts # node.execute generate_text (model-router process)
│   │   ├── task-memory.ts      # SQLite: tasks, nodes, edges, reflections
│   │   ├── logger-service.ts   # event.* → pino file log
│   │   ├── rag-service.ts     # Embeddings + SQLite; sqlite-vss KNN when available, else dot-product; memory.semantic.*, node.execute semantic_search
│   │   ├── tool-host.ts        # shell, http_get (Playwright), http_search; sandbox; tool.execute / node.execute tool
│   │   └── cron-manager.ts    # node-cron + SQLite schedules; event.cron.* to Logger
│   └── shared/
│       ├── config.ts           # Central config: config.json + env overrides
│       ├── protocol.ts         # Zod schemas: Envelope, Response, Error, Event
│       ├── base-process.ts     # BaseProcess: stdin JSONL → handleEnvelope; send(envelope)
│       ├── graph-utils.ts      # DAG validation, getDependencyMap, getReadyNodes
│       └── __tests__/
│           └── graph-utils.test.ts
├── src/services/__tests__/
│   ├── task-memory.test.ts
│   └── rag-service.test.ts
```

(Test and build output dirs such as `dist/`, `node_modules/`, `logs/`, `data/` are omitted.)

---

## TypeScript App Architecture

### Process model

- **One process per agent/service.** Each runs as a separate Node.js process.
- **IPC**: Line-delimited JSON (JSONL) on stdin/stdout. Every message is a single JSON object (envelope) with `id`, `from`, `to`, `type`, `version`, `payload`.
- **Core Orchestrator** spawns child processes and routes messages: reads from each child’s stdout, and forwards by `to` to the corresponding process’s stdin. Messages with `to: "core"` are handled by the Orchestrator (e.g. Telegram `task.create` → plan → task memory → execute → reply).

### Message protocol

- **Envelope** (Zod in `protocol.ts`): `id`, `timestamp`, `from`, `to`, `type`, `version`, `payload`.
- **Request/response**: Request has a unique `id`; response/error uses `correlationId: request.id`.
- **Types**: `plan.create`, `plan.execute`, `task.create`, `task.update`, `task.get`, `task.getByConversationId`, `task.appendReflection`, `task.complete`, `task.fail`, `chat.new`, `node.execute`, `reflection.evaluate`, `telegram.send`, `telegram.progress`, `memory.semantic.insert`, `memory.semantic.search`, `tool.execute`, `cron.schedule.*`, `event.*`.

### Shared layer

- **config.ts**: Loads `config.json` (path from `CONFIG_PATH` or default), merges with env, exports `getConfig()`. Used by all services/adapters for Ollama URL, Telegram token/allow-list, DB paths (task memory, RAG, cron, logger), RAG embed model and `rag.dbPath`, tool sandbox, model router names.
- **protocol.ts**: Envelope and response/error/event schemas; `parseEnvelope`, `parseResponse`, etc.
- **base-process.ts**: `BaseProcess` extends EventEmitter; readline on stdin, `handleEnvelope(line)` → emit `"message"`; `send(envelope)` writes JSONL to stdout. Subclasses override `handleEnvelope` and call `send` for responses.
- **graph-utils.ts**: `CapabilityGraph`, `CapabilityNode`, `validateGraph`, `getDependencyMap`, `getReadyNodes` for DAG execution order.

### Agent layer

- **Planner**: Listens for `plan.create`; uses Ollama + Model Router to produce a DAG; validates with `validateGraph`; responds with plan.
- **Executor**: Listens for `plan.execute`; computes ready nodes (parallel batch, concurrency limit); dispatches `node.execute` to `node.service` (model-router, rag-service, critic-agent, tool-host); waits for response by `correlationId`; updates Task Memory; after DAG, optional reflection loop (Critic → REVISE → re-run generation, max 3); aggregates result and completes task.
- **Critic**: Listens for `reflection.evaluate`; uses Ollama with Critic prompt; returns structured `{ decision: PASS|REVISE, feedback, score }`.

### Service layer

- **Ollama Adapter**: HTTP to Ollama `baseUrl` (from config); `generate`, `chat`, `embed`; timeout and retries.
- **Model Router**: Maps small/medium/large to Ollama model names (from config).
- **Generator Service**: Handles `node.execute` with `type: "generate_text"` or `type: "summarize"`; for `summarize`, uses summarizer system prompt and `input.chatHistory`; builds prompt from context (goal, deps, optional critic feedback); calls Ollama; responds with `{ text, ... }`.
- **Task Memory**: SQLite store; `conversation_id` on tasks; handles `task.create`, `task.update`, `task.get`, `task.getByConversationId`, `task.appendReflection`, `task.complete`, `task.fail`.
- **Logger**: Subscribes to `event.*`; writes structured log (pino) to `logDir/logFile` from config.
- **RAG Service**: Ollama embed; SQLite-backed document store; **sqlite-vss** for KNN vector search when extension loads (macOS/Linux x64), else in-DB dot-product; configurable `rag.embeddingDimensions` (768); `memory.semantic.insert`, `memory.semantic.search`; search is session-scoped by default to prevent cross-chat leakage; `node.execute` for `semantic_search` returns snippets for downstream nodes.
- **Tool Host**: Registry of tools (shell, http_get, http_search); sandbox dir from config; `tool.execute` and `node.execute` for type `tool`; shell tool executes commands with sandbox restrictions; browsing supports persistent context (cookies) via `userDataDir`.
- **Cron Manager**: SQLite schedule table; node-cron; `cron.schedule.add/list/remove`; emits `event.cron.started/completed/failed` to Logger.

### Adapters

- **Telegram Adapter**: Telegram bot (token from config); allow-list from config; normalizes messages to protocol; sends `task.create` to core (with `conversationId` from session map); sends `chat.new` on `/new`; handles `telegram.send`, `telegram.progress`, and response payloads with `chatId`/`text`; commands `/start`, `/task`, `/new`, `/help`.

### Core

- **Orchestrator**: Spawns all processes (task-memory, logger, planner, executor, critic-agent, telegram-adapter, model-router, rag-service, tool-host, cron-manager); multiplexes stdout → route by `to`; resolves pending requests by `correlationId`; implements task pipeline for `task.create` from Telegram: fetches session history (short-term memory) → plan.create → task.create (with conversationId) → plan.execute → telegram.send with result; on `chat.new`: runArchivingPipeline (getTasksByConversationId → format history → summarize → memory.semantic.insert → telegram.send "Archived").

### Data flow (high level)

1. User sends message in Telegram.
2. Telegram Adapter → Core: `task.create` (goal, chatId, userId).
3. Core → Planner: `plan.create` (goal); Planner → Core: plan (DAG).
4. Core → Task Memory: `task.create` (taskId, goal, nodes, edges).
5. Core → Executor: `plan.execute` (taskId, plan, goal).
6. Executor runs DAG: `node.execute` to model-router, rag-service, critic-agent, tool-host; Task Memory updates; optional Critic revision loop.
7. Executor → Core: response with aggregated result.
8. Core → Telegram Adapter: `telegram.send` (chatId, text).
9. User sees reply in Telegram.

**Archiving (on `/new`)**: Telegram sends `chat.new` (chatId, old conversationId). Core fetches tasks by conversationId, formats history, calls model-router `summarize`, inserts summary into RAG, sends "Archived" to user.

All configurable behavior (Ollama URL, Telegram token/allow-list, DB paths, logger paths, RAG model, sandbox, cron DB, model names) is driven by **config.json** and environment overrides via **config.ts**.
