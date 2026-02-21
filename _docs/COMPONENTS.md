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

### File Processor
- `src/services/file-processor.ts` — independent `BaseProcess` subprocess
- Receives `file.process` envelopes from Core Orchestrator
- Routes by file category:
  - **text** → reads file content; inlines if short, returns `text_long` if long (orchestrator handles RAG)
  - **image** → OCR/description via `OllamaAdapter.chatWithImage()` with configured vision model (`glm-ocr:q8_0`)
  - **audio** → `convertToWav()` (ffmpeg-static) → `transcribeAudio()` (Whisper local inference)
  - **unknown** → returns `ignored` with reason
- Deletes every uploaded file from disk after processing (succeed or fail)
- Emits `event.file.processed` audit event for logging

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

### File Upload Flow

1. User sends file(s) to Telegram (photo, document, voice, audio)
2. Telegram Adapter: detect attachment type, guard against max size, download to `data/uploads/<conversationId>/`
3. Telegram Adapter → Core: `file.ingest` envelope (FileIngestPayload)
4. Core Orchestrator: notify user "Processing N file(s)..."
5. Core → File Processor: `file.process` per file (parallel, Promise.allSettled)
6. File Processor: routes by category, calls Ollama/Whisper/readFile, deletes original, responds
7. Core: collects results, builds `enrichedGoal` (inline context + transcript + caption)
   - Long text files (> textMaxInlineChars) → indexLongText() → model-router chunk summaries → rag-service
8. Core → Planner → Executor: runs normal task pipeline with `enrichedGoal`
9. Response sent to Telegram
