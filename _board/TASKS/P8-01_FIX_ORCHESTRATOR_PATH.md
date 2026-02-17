# Task: P8-01 Fix Orchestrator path calculation bug

## Description
Fix incorrect path calculation in orchestrator.ts that causes "Cannot find module" errors when spawning child processes. The ROOT path calculation goes up one level too many, causing it to look in the wrong directory.

## Requirements
- Fix the `ROOT` path calculation in `src/core/orchestrator.ts` to correctly resolve to the project root directory.
- Ensure all process scripts can be found at their expected locations in `dist/`.
- Verify the orchestrator can successfully spawn all child processes.

## Definition of Done
- Orchestrator correctly resolves paths to `dist/` services and agents.
- Running `npm run dev` (or orchestrator) successfully spawns all processes without path errors.
- All process scripts are found at their expected locations.
