# SK-03: Update Planner Prompts for Skills

**File**: `src/agents/prompts/planner.ts`
**Dependencies**: SK-02
**Phase**: SK - Dynamic Skills System

## Description
Modify the planner system prompt to support dynamic skills and the `skill` node type.

## Acceptance Criteria
- `PlannerPromptOptions` updated to include optional skills array.
- `buildPlannerPrompt` injects "AVAILABLE SKILLS" section if skills are provided.
- System prompt includes instructions for creating `type: "skill"` nodes.
- Example skill node provided in the prompt.
