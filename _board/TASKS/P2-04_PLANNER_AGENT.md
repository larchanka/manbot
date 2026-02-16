# Task: P2-04 Implement Planner Agent

## Description
Develop the Planner Agent process which takes user intent and produces a structured execution DAG using the Ollama Adapter.

## Requirements
- Create `src/agents/planner-agent.ts`.
- Extend `BaseProcess`.
- Use the Ollama Adapter and Model Router to send prompts to the selected model.
- Parse the model's JSON output into the `CapabilityGraph` structure.
- Emit `plan.create` response with the generated DAG.

## Definition of Done
- Planner Agent process correctly parses a user message and returns a valid JSON DAG response on stdout.
- The agent successfully uses the designated complexity model.
