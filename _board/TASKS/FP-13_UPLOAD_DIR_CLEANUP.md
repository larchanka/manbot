# FP-13: Upload Directory Initialization and Cleanup

**File**: `src/core/orchestrator.ts` (startup) and `src/services/file-processor.ts`
**Dependencies**: FP-02, FP-07
**Phase**: 5 — Planner Integration

## Description
Ensure the uploads directory exists at startup and implement automatic cleanup: the `file-processor` deletes each file immediately after processing, and the Orchestrator cleans up any orphaned files in `uploads/` that are older than 1 hour on startup (stale files from crashed sessions).

## Acceptance Criteria
- On Orchestrator `start()`: call `fs.mkdir(getConfig().fileProcessor.uploadDir, { recursive: true })` to ensure directory exists
- On Orchestrator `start()`: scan `uploadDir` for any files older than 1 hour and delete them (orphan cleanup)
- In `file-processor`: after every `file.process` request (success or error), call `fs.unlink(localPath)` wrapped in try/catch
- If audio: also `fs.unlink(wavPath)` after transcription
- Neither cleanup operation should throw or crash the process — all errors are silently logged

## Implementation Notes
- Orphan cleanup uses `fs.readdir` + `fs.stat` — check `mtime` against `Date.now() - 3600000`
- This prevents `data/uploads/` from growing unboundedly if the process crashed mid-download
- Cleanup runs once at startup, non-blocking (don't await in `start()`, use `.catch()`)
- Log the number of orphaned files deleted at `ConsoleLogger.info` level
