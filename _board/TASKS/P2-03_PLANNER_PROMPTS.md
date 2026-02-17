# Task: P2-03 Create System Prompts for Planner

## Description
Craft the foundational system prompts that guide the Planner Agent in converting a user message into a structured capability graph (DAG).

## Requirements
- Create `src/agents/prompts/planner.ts`.
- The prompt must instruct the model to output a strictly valid JSON matching the CAPABILITY GRAPH schema.
- Define instructions for decomposing tasks into modular steps.
- Include "few-shot" examples in the prompt for common scenarios (search then summarize, multi-step calculation, etc.).

## Definition of Done
- System prompt is documented and available for the Planner Agent.
- Prompt includes clear constraints on the JSON schema and DAG acyclicity.
