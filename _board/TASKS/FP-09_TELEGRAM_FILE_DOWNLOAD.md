# FP-09: Telegram Adapter — File Detection and Download

**File**: `src/adapters/telegram-adapter.ts`
**Dependencies**: FP-02, FP-03
**Phase**: 4 — Telegram Integration

## Description
Extend the Telegram adapter's `bot.on('message')` handler to detect file attachments (document, photo, voice, audio), download them to the configured upload directory, classify them by MIME type, and emit a `file.ingest` envelope to `core`. Text-only messages continue through the existing `task.create` path unchanged.

## Acceptance Criteria
- Detect attachments in this priority order: `msg.voice` → `msg.audio` → `msg.photo` → `msg.document`
- `msg.video` and `msg.video_note`: send user message `"⚠️ Video files are not supported yet."` and return
- For supported attachments:
  1. Check file size against `getConfig().fileProcessor.maxFileSizeBytes`; if exceeded: notify user `"⚠️ File too large (max 50 MB). Skipping."` and return
  2. Call `bot.getFile(fileId)` to get the download path
  3. Download file to `{uploadDir}/{conversationId}/{fileId}-{originalName}`; create directory if needed
  4. Classify `category` based on MIME type:
     - `text/*`, `application/json`, `application/pdf`, `application/xml` → `'text'`
     - `image/*` → `'image'`
     - `audio/*`, `video/ogg` → `'audio'` (Telegram voice = `video/ogg` on some clients)
     - anything else → `'unknown'`
  5. Emit `file.ingest` envelope to `core` with `FileIngestPayload`
- `msg.caption` is included in the payload as `caption`
- Messages with BOTH text and no attachment continue through existing `task.create` path

## Implementation Notes
- `bot.downloadFile(filePath, destDir)` returns the full local path
- Use `fs/promises.mkdir({ recursive: true })` to create upload subdirectories
- `msg.photo` is an array — take `msg.photo[msg.photo.length - 1]` (highest resolution)
- `msg.voice` has `mime_type: 'audio/ogg'` and `file_size`
- `getTelegramFileInfo()` helper function recommended to keep handler readable
- Do NOT await the download before returning from the handler — use `(async () => { ... })().catch(...)` pattern to avoid blocking the bot event loop
