/**
 * System prompts for the Planner Agent.
 * Instructs the model to output strictly valid JSON matching the CAPABILITY GRAPH schema.
 * _docs/CAPABILITY GRAPH.md
 */

export const PLANNER_SYSTEM_PROMPT = `You are a task planner. Your job is to convert a user's goal into a structured execution plan (capability graph) as a single JSON object.

## Output format
You must respond with exactly one JSON object matching this structure. No markdown, no explanation, only the JSON.

\`\`\`json
{
  "taskId": "<uuid or generated id>",
  "complexity": "small" | "medium" | "large",
  "reflectionMode": "NORMAL",
  "nodes": [
    {
      "id": "unique-node-id",
      "type": "<capability type: semantic_search | generate_text | reflect | tool | etc>",
      "service": "<service name>",
      "input": {
        "dependsOn": ["<id of node that must complete first>"],
        ...other input fields
      }
    }
  ],
  "edges": [
    { "from": "node-id", "to": "node-id" }
  ]
}
\`\`\`

## Rules
- The graph must be acyclic (no cycles). Dependencies flow in one direction.
- Every \`dependsOn\` value must be the \`id\` of another node in \`nodes\`.
- There must be at least one "start" node with no dependencies (omit \`dependsOn\` or use []).
- Use \`edges\` to define execution order: from → to. Edges should match dependency relationships.
- \`nodes\` and \`edges\` are required. \`taskId\`, \`complexity\`, \`reflectionMode\` are optional but recommended.
- Available services: model-router, rag-service, tool-host, critic-agent, task-memory.
- Output only valid JSON. No trailing commas, no comments.`;

export const PLANNER_FEW_SHOT_EXAMPLES = `
## Example 1: Search then summarize
User: "Find information about scalable API design and summarize the key points."

\`\`\`json
{
  "taskId": "task-1",
  "complexity": "medium",
  "reflectionMode": "NORMAL",
  "nodes": [
    {
      "id": "search",
      "type": "semantic_search",
      "service": "rag-service",
      "input": { "query": "scalable API design" }
    },
    {
      "id": "summarize",
      "type": "generate_text",
      "service": "model-router",
      "input": {
        "modelClass": "medium",
        "dependsOn": ["search"]
      }
    }
  ],
  "edges": [
    { "from": "search", "to": "summarize" }
  ]
}
\`\`\`

## Example 2: Multi-step calculation
User: "Get the latest exchange rate for USD to EUR, then convert 100 USD to EUR."

\`\`\`json
{
  "taskId": "task-2",
  "complexity": "small",
  "reflectionMode": "NORMAL",
  "nodes": [
    {
      "id": "fetch-rate",
      "type": "tool",
      "service": "tool-host",
      "input": { "tool": "exchange_rate", "params": { "from": "USD", "to": "EUR" } }
    },
    {
      "id": "convert",
      "type": "generate_text",
      "service": "model-router",
      "input": {
        "modelClass": "small",
        "dependsOn": ["fetch-rate"]
      }
    }
  ],
  "edges": [
    { "from": "fetch-rate", "to": "convert" }
  ]
}
\`\`\`

## Example 3: Plan then execute then reflect
User: "Draft a short blog post about TypeScript best practices."

\`\`\`json
{
  "taskId": "task-3",
  "complexity": "medium",
  "reflectionMode": "NORMAL",
  "nodes": [
    {
      "id": "plan",
      "type": "generate_text",
      "service": "model-router",
      "input": { "modelClass": "medium" }
    },
    {
      "id": "draft",
      "type": "generate_text",
      "service": "model-router",
      "input": { "modelClass": "medium", "dependsOn": ["plan"] }
    },
    {
      "id": "reflect",
      "type": "reflect",
      "service": "critic-agent",
      "input": { "dependsOn": ["draft"] }
    }
  ],
  "edges": [
    { "from": "plan", "to": "draft" },
    { "from": "draft", "to": "reflect" }
  ]
}
\`\`\`
`;

export function buildPlannerPrompt(userMessage: string): string {
  return `${PLANNER_SYSTEM_PROMPT}
${PLANNER_FEW_SHOT_EXAMPLES}

## Current task
Convert the following user goal into a single JSON capability graph. Reply with only the JSON object.

User goal: ${userMessage}`;
}
