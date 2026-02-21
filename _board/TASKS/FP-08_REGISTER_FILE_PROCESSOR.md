# FP-08: Register File Processor in Orchestrator

**File**: `src/core/orchestrator.ts`
**Dependencies**: FP-07
**Phase**: 3 — File Processor Process

## Description
Register `file-processor` as a spawned child process in the Orchestrator so it participates in the IPC bus. Add the script path to `PROCESS_SCRIPTS`, ensure it is spawned at startup, and verify its stdout/stderr are wired correctly to the central message router.

## Acceptance Criteria
- Add `"file-processor": join(DIST, "services", "file-processor.js")` to `PROCESS_SCRIPTS`
- Process is spawned in `start()` alongside all other services
- Stderr from `file-processor` is captured and logged via `ConsoleLogger.processStderr`
- Exit/crash events are logged via `ConsoleLogger.processEvent`
- No changes to message routing logic required — `sendAndWait` already handles any registered process by name

## Implementation Notes
- Follow the exact same pattern used for `"rag-service"`, `"tool-host"`, etc.
- No special handling needed — routing is generic in `handleLine()`
- Verify the compiled output path matches: `dist/services/file-processor.js`
