# SK-05: Support Skill Nodes in ExecutorAgent

**File**: `src/agents/executor-agent.ts`
**Dependencies**: SK-02
**Phase**: SK - Dynamic Skills System

## Description
Update the executor to recognize and process the new `skill` node type.

## Acceptance Criteria
- `SkillManager` initialized in `ExecutorAgent`.
- `TYPE_TO_SERVICE` maps `skill` to `model-router`.
- `dispatchNode` handles `type: skill` by loading the prompt via `SkillManager`.
- Skill task and prompt are correctly mapped to model-router input.
