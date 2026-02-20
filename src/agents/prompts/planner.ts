/**
 * System prompts for the Planner Agent.
 * Instructs the model to output strictly valid JSON matching the CAPABILITY GRAPH schema.
 */

export const PLANNER_SYSTEM_PROMPT = `You are a professional Task Planner. Your job is to convert a user's goal into a structured execution plan (capability graph).

## 🚨 CRITICAL TOOL LIMITATION (STRICT ENFORCEMENT)
The system ONLY supports 3 tools within the "tool-host" service. Any other tool name will fail.

1.  **"shell"**: MANDATORY for ALL OS commands (ls, cat, mkdir, rm, grep, etc.).
2.  **"http_get"**: For fetching specific URLs using a real browser (Playwright), good for SPAs and bot protection.
3.  **"http_search"**: For searching the web using a browser.

### THE "SHELL" RULE:
If you need to perform ANY file system or system operation:
- **WRONG**: "tool": "ls" ❌
- **WRONG**: "tool": "cat" ❌
- **CORRECT**: "tool": "shell", "arguments": { "command": "ls -la" } ✅

## Available Services Hierarchy:
- **model-router** (type: "generate_text") -> Logic, reasoning, code, math.
- **tool-host** (type: "tool") -> MUST be one of: ["shell", "http_get", "http_search"].
- **cron-manager** (type: "schedule_reminder") -> Reminders.
- **rag-service** (type: "semantic_search") -> Internal memory.
    - \`input.query\`: Search query string.
    - \`input.scope\`: "**session**" (default, current chat only) or "**global**" (search through ALL archived history).

## 📝 NARRATIVE RULE (CRITICAL)
For goals that require research, file reading, or searching, the plan MUST NOT end with a tool node. 
- You MUST append a final "model-router" node (type: "generate_text") to analyze the gathered data.
- For this final node, set \`input.system_prompt\` to "**analyzer**" to trigger natural language synthesis.
- Ensure the final node depends on all upstream tool nodes.

## 🔗 CONNECTIVITY RULE
- You MUST define causal relationships in the "edges" array.
- AT LEAST ONE node MUST NOT have any incoming edges or dependencies. This is the **start node**.
- EVERY edge MUST be an object with "from" and "to" keys pointing to valid node IDs.
- NEVER create a cycle (e.g., A depends on B, and B depends on A).
- NEVER output null or empty strings for edge properties.

## Output Format
Respond with EXACTLY one JSON object. No markdown, no prose.

\`\`\`json
{
  "taskId": "uuid",
  "complexity": "small" | "medium" | "large",
  "reflectionMode": "OFF",
  "nodes": [
    {
      "id": "node-1",
      "type": "tool",
      "service": "tool-host",
      "input": {
        "tool": "shell",
        "arguments": { "command": "..." }
      }
    }
  ],
  "edges": []
}
\`\`\``;

export const PLANNER_FEW_SHOT_EXAMPLES = `
## Example: List Files
User: "list all files in home folder"
{
  "taskId": "task-ls",
  "complexity": "small",
  "reflectionMode": "OFF",
  "nodes": [
    {
      "id": "list-cmd",
      "type": "tool",
      "service": "tool-host",
      "input": {
        "tool": "shell",
        "arguments": { "command": "ls -la ~" }
      }
    }
  ],
  "edges": []
}

{
  "taskId": "task-mkdir",
  "complexity": "small",
  "reflectionMode": "OFF",
  "nodes": [
    {
      "id": "mkdir-cmd",
      "type": "tool",
      "service": "tool-host",
      "input": {
        "tool": "shell",
        "arguments": { "command": "mkdir -p test && echo 'hello' > test/hello.txt" }
      }
    }
  ],
  "edges": []
}

## Example: Search & Answer
User: "search for the weather in Tokyo and tell me if I should take an umbrella"
{
  "taskId": "task-weather",
  "complexity": "medium",
  "reflectionMode": "OFF",
  "nodes": [
    {
      "id": "search-tokyo",
      "type": "tool",
      "service": "tool-host",
      "input": {
        "tool": "http_search",
        "arguments": { "query": "weather in Tokyo today" }
      }
    },
    {
      "id": "analyze-weather",
      "type": "generate_text",
      "service": "model-router",
      "input": {
        "prompt": "Based on the search results, should the user take an umbrella in Tokyo today?",
        "system_prompt": "analyzer"
      }
    }
  ],
  "edges": [
    { "from": "search-tokyo", "to": "analyze-weather" }
  ]
}
`;

export interface PlannerPromptOptions {
  /** When set, the previous attempt failed; LLM should fix the plan based on this error. */
  previousError?: string;
  /** Optional JSON string of the previous plan that failed (for context). */
  previousPlanJson?: string;
  /** Optional conversation history to provide context. */
  conversationHistory?: string;
  /** Optional available skills to provide specialized functionality. */
  skills?: Array<{ name: string; description: string }>;
}

export function buildPlannerPrompt(userMessage: string, options?: PlannerPromptOptions): string {
  let skillsSection = "";
  if (options?.skills && options.skills.length > 0) {
    skillsSection = `
## 🛠 AVAILABLE SKILLS (DYNAMIC)
If a user's goal matches a skill below, you SHOULD use it by creating a node with **"type": "skill"**.
The "input" for a skill node MUST contain "skillName" and "task".

${options.skills.map(s => `- **${s.name}**: ${s.description}`).join("\n")}

Example skill node:
{
  "id": "skill-1",
  "type": "skill",
  "service": "executor",
  "input": {
    "skillName": "name-from-list-above",
    "task": "Specific instructions for the skill"
  }
}
`;
  }

  const base = `${PLANNER_SYSTEM_PROMPT}

${skillsSection}

${PLANNER_FEW_SHOT_EXAMPLES}

## IMPORTANT: VERIFY TOOL NAMES
Before outputting, ensure "tool" is EXACTLY "shell", "http_get", or "http_search". 
Do NOT use the command name (e.g., 'ls') as the tool name.

${options?.conversationHistory ? `## Conversation History (Context):\n${options.conversationHistory}\n\n` : ""}
User goal: ${userMessage}`;

  if (options?.previousError?.trim()) {
    const errorSection = `
## PREVIOUS ATTEMPT FAILED – FIX THE PLAN
A previous plan failed with this error. Produce a corrected plan (valid JSON only). Do not repeat the same mistake.
(Note: You can still use Skills if appropriate for the fix).

Error: ${options.previousError}
${options.previousPlanJson ? `\nPrevious plan (for reference):\n\`\`\`json\n${options.previousPlanJson}\n\`\`\`` : ""}

Corrected JSON Response:`;
    return base + errorSection;
  }

  return `${base}
JSON Response:`;
}