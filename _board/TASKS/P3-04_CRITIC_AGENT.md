# Task: P3-04 Implement Critic Agent process

## Description
Implement the Critic Agent as a standalone process that receives execution results and provides feedback on whether the task is complete and satisfactory.

## Requirements
- Create `src/agents/critic-agent.ts`.
- Extend `BaseProcess`.
- Integration with Ollama Adapter and Model Router.
- Accepts a `reflection.evaluate` request containing the task context and draft result.
- Returns a structured evaluation response.

## Definition of Done
- Critic Agent process is functional and returns valid evaluation responses on stdout.
- The agent correctly implements the `PASS/REVISE` decision logic.
