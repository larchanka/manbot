# Task: [P10-05] Configurable Planner Complexity

Status: Todo
Priority: Medium
Source: _board/AUDIT.md

## Description
The initial planning phase in the Orchestrator is currently hardcoded to "medium" complexity. This task makes it configurable via `config.json`.

## Subtasks
- [ ] **Config Schema**: Update `ModelRouterConfig` in `src/shared/config.ts` to include `plannerComplexity: string`.
- [ ] **Config Default**: Update `DEFAULT_CONFIG` in `src/shared/config.ts` to set `plannerComplexity` to "medium".
- [ ] **Config File**: Update `config.json` to include `"plannerComplexity": "medium"` in the `modelRouter` section.
- [ ] **Orchestrator**: Update `Orchestrator.runTaskPipeline` to use `getConfig().modelRouter.plannerComplexity` for the `plan.create` request.

## Verification
- Change `plannerComplexity` in `config.json` to `small` and verify it's used in planning logs.
