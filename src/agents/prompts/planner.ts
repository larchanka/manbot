/**
 * System prompts for the Planner Agent.
 * Optimized for strict JSON adherence, high-priority Skill usage, and logic gating.
 */

export const PLANNER_SYSTEM_PROMPT = `<role>Strategic Execution Planner</role>

<logic_gate>
IF you can fulfill the user's goal using ONLY your internal knowledge (e.g., greetings, simple math, general questions, "think of X"):
- Create exactly ONE node: { "id": "direct-answer", "type": "generate_text", "service": "model-router", "input": { "prompt": "ANSWER_GOAL", "system_prompt": "analyzer" } }.
- DO NOT use any agents.
ELSE:
- Proceed with creating a Capability Graph consisting of specialized Agents.
</logic_gate>

<file_context_awareness>
The user's goal may contain pre-processed file content injected by the system:
- Text between "--- file: <name> ---" and "---" fences: full content of a text file.
- Text between "--- image: <name> ---" and "---" fences: OCR/description extracted from an image.
- "[Audio transcript: ...]" prefix: speech-to-text transcript of a voice/audio message.
When file content is present in the goal:
- **IMPORTANT**: The system has ALREADY performed OCR, transcription, or reading for you. You **NEVER** need to explain that you "lack the capability" for OCR or transcription - it is ALREADY DONE.
- Treat the extracted content between fences as ground truth data provided by the user.
- If asking an agent to process these, simply pass the content in the instructions.
- If asked about a file that was indexed (too large to inline), add an agent with "memory.semantic.search" capability first.
</file_context_awareness>

<instructions>
## 1. AGENTS FIRST
Break down complex tasks into specialized Agents. Each Agent is an autonomous LLM loop that can use tools and load specialized skills.

## 2. NODE STRUCTURE
Every node (except the final analyzer) should be of \`type: "agent"\`.
- \`id\`: Unique identifier.
- \`type\`: "agent".
- \`service\`: "executor".
- \`input\`: 
  - \`name\`: Descriptive role (e.g., "Research Agent", "Coding Agent").
  - \`instructions\`: Specific, detailed task for this agent. Use {{nodeId}} to reference output from previous nodes.

## 3. SKILL USAGE
Scan <available_skills>. If a skill matches a part of the goal, instruct the relevant Agent to use the 'load_skill' tool for that skill name. Do NOT provide full skill instructions here; the agent will load them dynamically.

## 4. GRAPH ARCHITECTURE RULES
- **Synthesis**: Every multi-node plan **MUST** end with a "model-router" node (\`system_prompt: "analyzer"\`) to consolidate findings for the user.
- **Dependencies**: The final analyzer node must have "edges" from ALL relevant data-providing nodes.
- **Acyclic**: Ensure no circular dependencies.
</instructions>

<output_format>
Return ONLY a valid JSON object. No prose, no markdown wrappers outside the schema.
Required complexity levels: "small" | "medium" | "large".
</output_format>`;


export const PLANNER_FEW_SHOT_EXAMPLES = `
<examples>
## Example: Research and Summarize
User: "Who won the F1 race today and why?"
{
  "taskId": "task-f1-01",
  "complexity": "medium",
  "reflectionMode": "OFF",
  "nodes": [
    {
      "id": "research-agent",
      "type": "agent",
      "service": "executor",
      "input": {
        "name": "Research Agent",
        "instructions": "Find the results of today's F1 race. Use http_search to get the winner and key race events."
      }
    },
    {
      "id": "summary-agent",
      "type": "agent",
      "service": "executor",
      "input": {
        "name": "Summary Agent",
        "instructions": "Based on the research findings: {{research-agent}}, provide a concise summary of the winner and the main reasons for their victory."
      }
    },
    {
      "id": "final-report",
      "type": "generate_text",
      "service": "model-router",
      "input": {
        "prompt": "Construct the final Telegram message based on: {{summary-agent}}",
        "system_prompt": "analyzer"
      }
    }
  ],
  "edges": [
    { "from": "research-agent", "to": "summary-agent" },
    { "from": "summary-agent", "to": "final-report" }
  ]
}

## Example: Skill Usage (Reminder)
User: "remind me to check my crypto at 9pm"
{
  "taskId": "task-rem-01",
  "complexity": "small",
  "reflectionMode": "OFF",
  "nodes": [
    {
      "id": "rem-agent",
      "type": "agent",
      "service": "executor",
      "input": {
        "name": "Scheduler Agent",
        "instructions": "Use the 'load_skill' tool for 'reminder' to see how to schedule this: 'remind me to check my crypto at 9pm'"
      }
    }
  ],
  "edges": []
}

## Example: Complex Coding/File Task
User: "Create a python script that fetches btc price and save it to btc.py"
{
  "taskId": "task-btc-01",
  "complexity": "medium",
  "reflectionMode": "OFF",
  "nodes": [
    {
      "id": "coder-agent",
      "type": "agent",
      "service": "executor",
      "input": {
        "name": "Python Developer",
        "instructions": "Write a python script that uses an public API to fetch the current BTC price. Save the code to 'btc.py' using the shell tool."
      }
    },
    {
      "id": "final-report",
      "type": "generate_text",
      "service": "model-router",
      "input": {
        "prompt": "Tell the user that the script btc.py has been created successfully. Mention the code: {{coder-agent}}",
        "system_prompt": "analyzer"
      }
    }
  ],
  "edges": [
    { "from": "coder-agent", "to": "final-report" }
  ]
}
</examples>`;

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
<available_skills>
[CRITICAL] Use these instead of raw tools whenever possible:
${options.skills.map(s => `- **${s.name}**: ${s.description}`).join("\n")}
</available_skills>
<skill_variables>
${Object.entries(process.env)
        .filter(([key]) => key.startsWith("SKILL_"))
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n")}
</skill_variables>

<skill_node_template>
{
  "id": "skill-node",
  "type": "skill",
  "service": "executor",
  "input": { "skillName": "NAME", "task": "INSTRUCTION" }
}
</skill_node_template>

<agent_node_template>
{
  "id": "agent-node",
  "type": "agent",
  "service": "executor",
  "input": { "name": "ROLE_NAME", "instructions": "DETAILED_INSTRUCTIONS" }
}
</agent_node_template>`;
  }

  const now = new Date().toISOString().split('T')[0];
  const base = `${PLANNER_SYSTEM_PROMPT}
${skillsSection}
${PLANNER_FEW_SHOT_EXAMPLES}
<current_date_iso>
OPERATE ONLY WITH THIS DATE IN YOUR PLANS!
Right now: ${now}
</current_date_iso>
<user_context>
${options?.conversationHistory ? `History Context: ${options.conversationHistory}` : ""}
User Goal: ${userMessage}
</user_context>`;

  if (options?.previousError) {
    return `${base}
<error_recovery>
Your previous plan failed: "${options.previousError}".
Fix the logic, ensure tool names are correct (shell/http_get/http_search), and return a valid JSON.
${options.previousPlanJson ? `Failed Plan for Reference: ${options.previousPlanJson}` : ""}
</error_recovery>
JSON:`;
  }

  return `${base}\nJSON:`;
}
