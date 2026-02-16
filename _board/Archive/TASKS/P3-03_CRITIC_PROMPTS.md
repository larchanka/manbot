# Task: P3-03 Create System Prompts for Critic

## Description
Develop the system prompts for the Critic Agent, focusing on its role as a quality control layer that evaluates the Executor's draft results for accuracy, logic, and safety.

## Requirements
- Create `src/agents/prompts/critic.ts`.
- Instruct the Critic to analyze the "Draft Output" against the original "User Goal".
- Define a structured response format:
  - `decision`: PASS or REVISE.
  - `feedback`: Detailed explanation of issues.
  - `score`: 1-10 rating.
- Include criteria for detecting hallucinations, formatting errors, or incomplete answers.

## Definition of Done
- Critic system prompt is defined and testable.
- Prompt reliably guides the model to produce the `PASS/REVISE` structured output.
