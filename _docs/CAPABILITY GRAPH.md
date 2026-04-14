```json
{
  "taskId": "uuid",
  "complexity": "medium",
  "reflectionMode": "NORMAL",
  "nodes": [
    {
      "id": "research-01",
      "type": "agent",
      "service": "executor",
      "input": {
        "name": "Research Agent",
        "instructions": "Search for the latest F1 results using http_search."
      }
    },
    {
      "id": "summary-01",
      "type": "agent",
      "service": "executor",
      "input": {
        "name": "Summary Agent",
        "instructions": "Summarize the research from {{research-01}} and load the 'email' skill to prepare a draft."
      },
      "dependsOn": ["research-01"]
    },
    {
      "id": "node-final",
      "type": "generate_text",
      "service": "model-router",
      "input": {
        "prompt": "Construct final Telegram response: {{summary-01}}",
        "system_prompt": "analyzer"
      }
    }
  ],
  "edges": [
    { "from": "research-01", "to": "summary-01" },
    { "from": "summary-01", "to": "node-final" }
  ]
}
```

---

## Node Schema

```
interface CapabilityNode {
  id: string;
  type: string;
  service: string;
  input: Record<string, any>;
  dependsOn?: string[];
  timeoutMs?: number;
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
}
```

---

## Node types (model-router / Generator)

- **agent** — Autonomous LLM loop; input: `name`, `instructions`. High-level strategic node that can use tools and dynamically call `load_skill`.
- **generate_text** — Simple LLM generation; input: `prompt`, context from dependencies. Used for final consolidation.
- **summarize** — Memory extraction from chat history; input: `chatHistory`.

## Graph Rules

- Graph must be acyclic.
- Executor validates DAG before execution.
- Node executes only when dependencies are completed.
- Parallel execution allowed for independent nodes.
- Reflection node must be last unless iterative mode enabled.

---

## Reflection Loop Extension (Deep Mode)

```
generate → reflect → revise → reflect
```

Executor may dynamically insert revise nodes if Critic returns `REVISE`.
