# Plan: Improve Model Selection and Configurable Complexity

Based on the `AUDIT.md`, this plan aims to decouple hardcoded complexity defaults and ensure that nodes without explicit model classes use the global task complexity as a fallback.

## Proposed Changes

### Configuration
#### [MODIFY] [config.js](file:///Users/mikhaillarchanka/Projects/AI-Agent/config.json)
- Add `plannerComplexity: "medium"` to `modelRouter` section.

#### [MODIFY] [config.ts](file:///Users/mikhaillarchanka/Projects/AI-Agent/src/shared/config.ts)
- Update `ModelRouterConfig` interface to include `plannerComplexity`.
- Update `DEFAULT_CONFIG` and `mergeEnv` to handle `plannerComplexity`.

---

### Orchestrator
#### [MODIFY] [orchestrator.ts](file:///Users/mikhaillarchanka/Projects/AI-Agent/src/core/orchestrator.ts)
- In `runTaskPipeline`, use `getConfig().modelRouter.plannerComplexity` instead of hardcoded `"medium"`.

---

### Executor & Generator
#### [MODIFY] [executor-agent.ts](file:///Users/mikhaillarchanka/Projects/AI-Agent/src/agents/executor-agent.ts)
- Update `dispatchNode` to include `_complexity` in the `context` sent to services, using `plan.complexity`.

#### [MODIFY] [generator-service.ts](file:///Users/mikhaillarchanka/Projects/AI-Agent/src/services/generator-service.ts)
- Update fallback for `modelClass` to check `p.context?._complexity` before defaulting to `"medium"`.

---

### Silent Notifications
#### [MODIFY] [telegram-adapter.ts](file:///Users/mikhaillarchanka/Projects/AI-Agent/src/adapters/telegram-adapter.ts)
- Update `pl.silent` handling to use `disable_notification: true` in `bot.sendMessage` instead of skipping the message.
- Restore "Task created" messages but mark them as `silent: true`.

#### [MODIFY] [orchestrator.ts](file:///Users/mikhaillarchanka/Projects/AI-Agent/src/core/orchestrator.ts)
- Add silent "Planning started..." and "Execution started..." messages to `runTaskPipeline` to provide feedback without sound.

## Verification Plan

### Automated Tests
- Run existing tests to ensure no regressions:
  `npm test src/services/__tests__/generator-service.test.ts` (if exists)
  `npm test src/core/__tests__/orchestrator.test.ts` (if exists)

### Manual Verification
1.  Change `plannerComplexity` to `large` in `config.json`.
2.  Run a task and verify (via logs) that the planner is called with `large`.
3.  Verify that nodes in the generated plan without `modelClass` now use `large` (or whatever the task complexity is) instead of falling back to `medium`.
