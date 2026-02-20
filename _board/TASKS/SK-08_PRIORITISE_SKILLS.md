# SK-08: Prioritize Skill Usage in Planner

**File**: `src/agents/prompts/planner.ts`
**Dependencies**: SK-03
**Phase**: SK - Dynamic Skills System

## Description
Update the planner prompts to ensure that skills are given higher priority than raw tool usage.

## Acceptance Criteria
- Added `## 💎 SKILLS PRECEDENCE (HIGHEST PRIORITY)` section to `PLANNER_SYSTEM_PROMPT`.
- Updated `buildPlannerPrompt` to label the skills section as `HIGHEST PRIORITY` and added a `STRICT RULE` instruction.
- Verified that instructions tell the model to check skills BEFORE raw tools.
