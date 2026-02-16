# CAPABILITY GRAPH JSON FORMAT

## Execution Plan Structure

```
{
  "taskId": "uuid",
  "complexity": "medium",
  "reflectionMode": "NORMAL",
  "nodes": [
    {
      "id": "node1",
      "type": "semantic_search",
      "service": "rag-service",
      "input": {
        "query": "scalable API architecture"
      }
    },
    {
      "id": "node2",
      "type": "generate_text",
      "service": "model-router",
      "input": {
        "modelClass": "medium",
        "promptTemplate": "architecture_template",
        "dependsOn": ["node1"]
      }
    },
    {
      "id": "node3",
      "type": "reflect",
      "service": "critic-agent",
      "input": {
        "dependsOn": ["node2"]
      }
    }
  ],
  "edges": [
    { "from": "node1", "to": "node2" },
    { "from": "node2", "to": "node3" }
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
