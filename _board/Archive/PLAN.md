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

## Verification Plan

### Automated Tests
- Unit tests for protocol serialization/deserialization.
- Integration tests for Task Memory persistence.
- Mock agent communication tests.

### Manual Verification
- Verify sub-process spawning and communication via logs.
- Test end-to-end task execution from a mock trigger to final output.
