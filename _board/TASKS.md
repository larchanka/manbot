# Task Backlog: AI Agent Platform

## Phase 1: Foundation
- [ ] **P1-01**: Initialize project `package.json`, `tsconfig.json`, and directory structure.
- [ ] **P1-02**: Define shared Zod schemas for the Message Protocol Envelope.
- [ ] **P1-03**: Create base `Process` class/helper for standardized stdin/stdout communication.
- [ ] **P1-04**: Implement `Logger Service` with `pino` and file rotation.
- [ ] **P1-05**: Implement `Task Memory Service` with SQLite schema:
    - [ ] Create `tasks` table for life-cycle tracking.
    - [ ] Create `task_nodes` and `task_edges` for DAG persistence.
    - [ ] Create `task_node_results` for intermediate storage.
    - [ ] Create `task_reflections` for Critic history.
    - [ ] Create `task_events` for audit trail.
- [ ] **P1-06**: Write integration tests for Task Memory Service state transitions.

## Phase 2: Intelligence Layer
- [ ] **P2-01**: Implement `Ollama Adapter` using `fetch` or SDK with streaming support.
- [ ] **P2-02**: Implement `Model Router` with configurable model-to-capacity mapping.
- [ ] **P2-03**: Create System Prompts for `Planner Agent` (Focus: Intent -> DAG).
- [ ] **P2-04**: Implement `Planner Agent` process using the Ollama Adapter.
- [ ] **P2-05**: Develop logic to validate DAG cycles and node dependencies in Planner.

## Phase 3: Runtime & Execution
- [ ] **P3-01**: Implement `Executor Agent` core loop (DFS/BFS traversal of the graph).
- [ ] **P3-02**: Implement parallel node execution logic in Executor.
- [ ] **P3-03**: Create System Prompts for `Critic Agent` (Focus: Draft -> Score/Revise).
- [ ] **P3-04**: Implement `Critic Agent` process.
- [ ] **P3-05**: Implement dynamic "Revise" node insertion in Executor based on Critic feedback.
- [ ] **P3-06**: Build `Core Orchestrator` to supervise agents and manage `stdin`/`stdout` pipes.

## Phase 4: Interface & Extensions
- [ ] **P4-01**: Implement `Telegram Adapter` using `node-telegram-bot-api`.
- [ ] **P4-02**: Connect Telegram commands to Orchestrator task creation.
- [ ] **P4-03**: Implement `RAG Service` with FAISS (Node bindings or Python bridge).
- [ ] **P4-04**: Implement semantic search node for the capability graph.
- [ ] **P4-05**: Build `Tool Host` with basic file-system tools.
- [ ] **P4-06**: Implement `Cron Manager` for background maintenance and scheduled tasks.

## Phase 6: Conversation Management
- [x] **P6-01**: Update `RAGService` to use `SQLite` for persistent embedding storage.
- [x] **P6-02**: Update `TaskMemory` schema to include `conversation_id` in `tasks` table.
- [x] **P6-03**: Update `Telegram Adapter` to handle `/new` command and track session IDs.
- [x] **P6-04**: Add summarizer prompt and `summarize` node (GeneratorService) for memory extraction from chat history.
- [x] **P6-05**: Implement `chat.new` orchestration flow in `Orchestrator`: fetch tasks, summarize, store in RAG, notify Telegram.
- [x] **P6-06**: Write integration tests for the full archiving cycle (`src/__tests__/archiving.test.ts`).

## Phase 7: RAG Scalability
- [x] **P7-01**: RAG vector search with sqlite-vss: KNN via vss0 virtual table; fallback to dot-product when extension unavailable; config `rag.embeddingDimensions` (default 768).

## Phase 9: Logging & Observability
- [ ] **P9-01**: Implement colorized console logging for IPC traffic in Orchestrator using `@larchanka/colors-js`.

