# SK-04: Integrate SkillManager into PlannerAgent

**File**: `src/agents/planner-agent.ts`
**Dependencies**: SK-03
**Phase**: SK - Dynamic Skills System

## Description
Wire the SkillManager into the PlannerAgent so it loads skills on every request.

## Acceptance Criteria
- `SkillManager` initialized in `PlannerAgent` constructor.
- `handleEnvelope` calls `listSkills()` and passes them to `buildPlannerPrompt`.
- Skills are successfully injected into the LLM prompt.
