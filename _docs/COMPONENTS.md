# Components and Integration

## Process-Oriented Architecture

All major components run as independent Node.js processes.

Communication is performed via:

- stdin / stdout
- JSON-RPC style message envelopes

---

## Core Agents

### 1. Core Orchestrator
Responsibilities:
- Entry point for Telegram
- Task lifecycle management
- Agent coordination
- Process supervision

---

### 2. Planner Agent
Responsibilities:
- Intent analysis
- Capability determination
- Execution graph creation
- Model complexity selection

Input:
- User message
- Conversation memory
- Retrieved context

Output:
- Execution plan (DAG)

---

### 3. Executor Agent
Responsibilities:
- Execute DAG nodes
- Call services
- Aggregate intermediate results
- Update task memory

---

### 4. Critic Agent
Responsibilities:
- Evaluate final draft
- Detect hallucinations
- Validate logic
- Trigger revisions

---

## Service Processes

### Model Router
Routes tasks to:
- Small model
- Medium model
- Large model

---

### Ollama Adapter
Interface to local Ollama instance.

Supports:
- Streaming
- Token reporting
- Timeout handling

---

### RAG Service
- SQLite-backed document store (`rag_documents`: id, content, metadata, embedding BLOB)
- Configurable DB path via `rag.dbPath` and vector dimension via `rag.embeddingDimensions` (default 768)
- **sqlite-vss**: When the extension loads (supported platforms: macOS x64/arm64, Linux x64), uses a vss0 virtual table for fast KNN search; otherwise falls back to in-DB dot-product scoring
- Used for long-term semantic memory and archived conversation summaries

---

### Task Memory Service (SQLite)
Stores:
- Task definitions (with `conversation_id` for session grouping)
- Execution state
- Intermediate results
- Reflections
- Status flags
- Query by `conversation_id` for archiving and history

---

### Structured Memory Service (SQLite)
Stores:
- User profiles
- Cron definitions
- Tool usage
- Model metrics

---

### Tool Host (MCP Compatible)
- Tool execution sandbox
- Timeout enforcement
- Memory isolation
- File / HTTP / custom tools

---

### Logger Service
Stores:
- Model calls
- Task state transitions
- Tool executions
- Reflection cycles
- Errors

---

### Telegram Adapter
- Receives user messages
- Normalizes payload
- Sends to Core
- Session tracking: `chatId` → `conversationId` map
- `/new` command: sends `chat.new` to Core (old conversationId), rotates to new session, notifies user

---

### Summarizer (Generator / model-router)
- Node type `summarize`: extracts persistent memory from chat history
- Dedicated system prompt (identity, preferences, entities, context)
- Used by Orchestrator archiving pipeline

---

### Cron Manager
- Scheduled tasks
- Background jobs
- Maintenance routines

---

## Integration Flow

1. Telegram → Core
2. Core → Planner
3. Planner → Execution Plan
4. Core → Task Memory (create, with `conversationId` from adapter)
5. Executor → Services
6. Critic → Evaluate
7. Executor (if revision)
8. Memory Update
9. Logger events
10. Response to Telegram

### Archiving (on `/new`)

1. Telegram Adapter → Core: `chat.new` (chatId, conversationId = old session)
2. Core: get tasks by `conversationId`, format history, call model-router `summarize`, insert summary into RAG
3. Core → Telegram Adapter: "Archived. Conversation summary has been stored..."

