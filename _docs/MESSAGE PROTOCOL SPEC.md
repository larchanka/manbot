# MESSAGE PROTOCOL SPEC (Full Internal Bus Specification)

## Transport Layer

All inter-process communication happens via:

- `stdin` / `stdout`
- Line-delimited JSON (JSONL)
- One JSON object per line
- UTF-8 encoding
- No multiline JSON payloads

Each message must be atomic and self-contained.

---

## Envelope Specification

All messages must conform to the following schema:

```
interface Envelope<T = any> {
  id: string;              // UUID v4
  correlationId?: string;  // Optional, for chained calls
  timestamp: number;       // Unix timestamp (ms)
  from: string;            // Sender process name
  to: string;              // Target process name
  type: string;            // Message type
  version: "1.0";
  payload: T;
}
```

---

## Message Categories

### Request

```
{
  "id": "uuid",
  "from": "core",
  "to": "planner",
  "type": "plan.create",
  "version": "1.0",
  "timestamp": 1704067200000,
  "payload": {}
}
```

### Response

```
{
  "id": "same-as-request",
  "from": "planner",
  "to": "core",
  "type": "response",
  "version": "1.0",
  "timestamp": 1704067200000,
  "payload": {
    "status": "success",
    "result": {}
  }
}
```

### Error

```
{
  "id": "same-as-request",
  "from": "executor",
  "to": "core",
  "type": "error",
  "version": "1.0",
  "timestamp": 1704067200000,
  "payload": {
    "code": "NODE_TIMEOUT",
    "message": "Tool execution exceeded 10s",
    "details": {}
  }
}
```

### Event (Fire-and-forget)

```
{
  "id": "uuid",
  "from": "executor",
  "to": "logger",
  "type": "event.task.node.completed",
  "version": "1.0",
  "timestamp": 1704067200000,
  "payload": {}
}
```

---

## Standard Message Types

### Planning
- `plan.create`
- `plan.validate`

### Execution
- `plan.execute`
- `node.execute`
- `node.result`

### Task Memory
- `task.create`
- `task.update`
- `task.get`
- `task.getByConversationId`
- `task.appendReflection`
- `task.complete`
- `task.fail`

### Chat / Session
- `chat.new` (event: session reset; payload: chatId, conversationId)

### Memory
- `memory.semantic.search`
- `memory.semantic.insert`
- `memory.structured.query`
- `memory.structured.insert`

### Model
- `model.generate`
- `model.embed`

### Reflection
- `reflection.evaluate`

### Tools
- `tool.execute`

### Logging
- `event.*`

---

## Reliability Rules

- Every request must receive a response or error.
- Core Orchestrator handles timeouts.
- Retries are managed only by Core.
- Stateless services preferred (except memory services).
- All services must emit lifecycle events.
