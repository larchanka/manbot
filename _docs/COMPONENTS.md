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
- FAISS vector index
- Embedding storage
- Semantic retrieval

---

### Task Memory Service (SQLite)
Stores:
- Task definitions
- Execution state
- Intermediate results
- Reflections
- Status flags

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
4. Core → Task Memory (create)
5. Executor → Services
6. Critic → Evaluate
7. Executor (if revision)
8. Memory Update
9. Logger events
10. Response to Telegram

