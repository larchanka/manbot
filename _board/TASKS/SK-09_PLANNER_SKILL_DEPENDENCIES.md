# SK-09: Planner Dependency Rule for Skills

**File**: `src/agents/prompts/planner.ts`
**Dependencies**: SK-08
**Phase**: SK - Dynamic Skills System

## Description
Instruct the planner to provide tool outputs to skills that need them, preventing hallucinations.

## Acceptance Criteria
- Added instructions to `PLANNER_SYSTEM_PROMPT` about skill dependencies.
- Updated `buildPlannerPrompt` to emphasize that skills don't have direct tool access; they need "data nodes" as dependencies.
