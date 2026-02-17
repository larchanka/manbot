# AI Agent Platform Implementation Plan

This plan outlines the step-by-step implementation of the local multi-agent AI runtime platform.

## Architectural Decisions

- **Reflection Strategy**: Support both `NORMAL` (1-pass) and `DEEP` (iterative) modes. The Critic agent returns a `PASS`/`REVISE` decision.
- **Task Isolation**: Every task has its own lifecycle and state stored in SQLite, allowing for replays and resumptions.
- **Model Routing**: The Planner will categorize tasks by complexity (`small`, `medium`, `large`), and the Model Router will select the appropriate Ollama model.
- **Parallel Execution**: The Executor Agent will support concurrent execution of independent DAG nodes to optimize performance.

## Proposed Changes

### Phase 1: Foundation
- **[NEW] Project Initialization**: Set up Node.js, TypeScript, and basic workspace structure.
- **[NEW] Message Protocol & Shared Types**: Define the standard envelope and message types used for IPC.
- **[NEW] Logger Service**: Implement a structured logging service that listens for events from other processes.
- **[NEW] Task Memory Service**: Implement SQLite-based storage for task state, intermediate results, and reflections.

---

### Phase 2: Intelligence Layer
- **[NEW] Ollama Adapter**: Create a bridge to local Ollama instance with streaming and token usage tracking.
- **[NEW] Model Router**: Implement logic to route requests to appropriate models (small, medium, large).
- **[NEW] Planner Agent**: Implement the agent responsible for intent analysis and generating execution DAGs.

---

### Phase 3: Runtime & Execution
- **[NEW] Executor Agent**: Build the engine that traverses the capability graph and executes nodes.
- **[NEW] Critic Agent**: Implement self-reflection and validation logic to check for hallucinations and logic errors.
- **[NEW] Core Orchestrator**: Develop the main process that supervises other agents, manages task lifecycles, and coordinates flows.

---

### Phase 4: Interface & Extensions
- **[NEW] Telegram Adapter**: Connect the orchestrator to a Telegram Bot interface.
- **[NEW] RAG Service**: Implement FAISS-based vector search for long-term semantic memory.
- **[NEW] Tool Host**: Build a sandbox for executing external tools (File, HTTP, etc.).
- **[NEW] Cron Manager**: Add support for scheduled background jobs.

---

### Phase 5: DevOps & CI
- **[NEW] GitHub Actions Workflow**: Set up basic CI pipeline to automate build and testing.
- **[NEW] CI Build & Test Job**: Configure jobs to run `tsc` and `npm test` on every push to `main`.


---

### Phase 6: Conversation Management (implemented)
- **[DONE] RAG Service Persistence**: `RAGService` persists to SQLite (`rag_documents` table, configurable `rag.dbPath`).
- **[DONE] Task Memory Schema**: `conversation_id` added to `tasks` table; `task.getByConversationId` for history.
- **[DONE] Telegram Adapter**: `/new` command; session map `chatId` → `conversationId`; sends `chat.new` to Core with old conversationId.
- **[DONE] Orchestrator Archiving Flow**: On `chat.new`, fetches tasks by conversationId, formats history, runs `summarize` node (model-router), stores summary in RAG, notifies user via Telegram.

## Verification Plan

### Automated Tests
- Integration test for `RAGService` persistence (verify data survives restart). ✓
- Unit test for conversation_id and `getTasksByConversationId`. ✓
- Integration test for archiving flow: task history → mock summary → RAG insert → SQLite record. ✓ (`src/__tests__/archiving.test.ts`)

### Manual Verification
- Send messages to Telegram bot, then send `/new`.
- Verify bot responds that previous conversation is archived.
- Check RAG database or semantic search for stored summary.

---

### Phase 7: RAG Scalability (sqlite-vss) (implemented)
- **[DONE] RAG Vector Search with sqlite-vss**: sqlite-vss extension used for KNN when available; `rag_documents` table unchanged; vss0 virtual table `vss_rag_embedding` for embeddings; fallback to in-DB dot-product when extension unavailable; `rag.embeddingDimensions` (default 768).

---

### Phase 9: Logging & Observability
- **[NEW] Console Logging**: Implement colorized, human-readable console logging for all IPC communication and system events. Use `@larchanka/colors-js` for highlighting.
