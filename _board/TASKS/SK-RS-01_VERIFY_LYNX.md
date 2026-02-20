# Task: Verify Lynx Dependency in Orchestrator

## Description
Implement a check at startup in the Orchestrator to ensure `lynx` is installed on the system. This prevents runtime errors when the `research` skill is invoked.

## File
- `src/core/orchestrator.ts`

## Dependencies
- None

## Acceptance Criteria
- [ ] Add `verifySystemDependencies()` method to `Orchestrator` class.
- [ ] Execute `lynx --version` or `command -v lynx` during startup.
- [ ] Log a high-visibility warning `[Core] ⚠️ Warning: 'lynx' not found. Research skill will be non-functional.` if missing.
- [ ] Ensure the application continues to start regardless of the check result.
