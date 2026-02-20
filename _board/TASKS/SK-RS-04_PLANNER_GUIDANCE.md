# Task: Update Planner with Research Guidance

## Description
Add a few-shot example to the Planner Agent's prompt to guide it on when and how to use the `research` skill effectively for complex information-gathering tasks.

## File
- `src/agents/prompts/planner.ts`

## Dependencies
- SK-RS-03

## Acceptance Criteria
- [ ] Update `buildPlannerPrompt` to include a specific research use case in the examples.
- [ ] Ensure the planner understands that `research` involves multiple recursive steps (search -> links -> summarize).
- [ ] Add instructions to prefer the `research` skill over simple search tools for open-ended queries.
