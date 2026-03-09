# Task: [P10-06] Model Selection Verification

Status: Todo
Priority: Medium
Source: _board/AUDIT.md

## Description
Conduct a verification run to ensure that the complexity mapping works as expected after the changes in P10-04 and P10-05.

## Steps
- [ ] Set `plannerComplexity` to `large` in `config.json`.
- [ ] Run a task that requires multiple steps (e.g., "Write a complex research paper about black holes").
- [ ] Check terminal logs for IPC messages to `model-router`.
- [ ] Verify that the `model` parameter in Lemonade requests is `qwen2.5:7b` (mapped to `large`).

## Success Criteria
- Planning uses the configured complexity.
- Execution nodes without explicit classes use the task's global complexity.
