# Task: [P10-04] Improved Model Selection Fallback

Status: Todo
Priority: Medium
Source: _board/AUDIT.md

## Description
Update `GeneratorService` and `ExecutorAgent` to ensure that model selection correctly falls back to the plan's global complexity instead of a hardcoded "medium" default.

## Subtasks
- [ ] **Executor**: Update `ExecutorAgent.dispatchNode` to include `_complexity` in the `context` object sent to services. It should pull this from `plan.complexity`.
- [ ] **Generator**: Update `GeneratorService.handleEnvelope` to check for `p.context?._complexity` when `modelClass` is missing from `p.input`.
- [ ] **Cleanup**: Ensure `medium` is only used as a final fallback if both `modelClass` and `_complexity` are missing.

## Verification
- Unit test for `GeneratorService` with mock context containing `_complexity`.
- Logs should show `GeneratorService` selecting the correct model based on context.
