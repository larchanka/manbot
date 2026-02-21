# FP-10: Orchestrator — file.ingest Handler and Context Building

**File**: `src/core/orchestrator.ts`
**Dependencies**: FP-08, FP-09
**Phase**: 4 — Telegram Integration

## Description
Add a `file.ingest` branch to `handleCoreMessage()` in the Orchestrator. This handler receives downloaded files from the Telegram adapter, dispatches each to `file-processor` in parallel, collects results, handles failures gracefully with user warnings, and builds the `enrichedGoal` string that gets passed into `runTaskPipeline`.

## Acceptance Criteria
- New branch in `handleCoreMessage`: `type === 'file.ingest' && fromProcess === 'telegram-adapter'`
- Send user a silent progress notification: `"⏳ Processing N file(s)..."`
- Process all files in parallel using `Promise.allSettled()` (not `Promise.all`) so one failure doesn't block others
- For each `ProcessedFile` result, apply context injection strategy:
  - `type: 'text'` (short) → append to `inlineContext` as `--- file: {name} ---\n{content}\n---`
  - `type: 'text_long'` → trigger long-text pipeline (see FP-11), append RAG note to `inlineContext`
  - `type: 'image_ocr'` → append OCR/description result inline
  - `type: 'audio_transcript'` → use as primary `goal` (overrides caption if no caption given)
  - `type: 'ignored'` → add to `warnings` list
- For each failed process call (rejected promise): add to `warnings` list with file name and error message
- Send all warnings to user as a single silent message before proceeding (if any)
- Build `enrichedGoal`:
  - If inline context exists: prepend context block above the caption/instruction
  - If audio transcript exists and no caption: transcript IS the goal
  - If audio transcript exists AND caption: goal = `"{caption}\n\n[Audio transcript: {transcript}]"`
- Call `runTaskPipeline(chatId, userId, enrichedGoal, conversationId)`
- If ALL files failed or were ignored AND no caption given: notify user and return without running pipeline

## Implementation Notes
- `Promise.allSettled` returns `{status: 'fulfilled'|'rejected', value|reason}` — handle both
- Warning messages should be sent silently (no sound) using the `silent: true` flag
- `enrichedGoal` max length should be checked — if > 32000 chars, truncate inline context with a note
- The `conversationId` from the `file.ingest` payload must be forwarded to `runTaskPipeline`
