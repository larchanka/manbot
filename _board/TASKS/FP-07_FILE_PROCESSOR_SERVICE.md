# FP-07: Build the File Processor Service

**File**: `src/services/file-processor.ts`
**Dependencies**: FP-03, FP-04, FP-05, FP-06
**Phase**: 3 — File Processor Process

## Description
Create the `file-processor` as an independent `BaseProcess` subprocess. It listens for `file.process` envelopes, routes the file to the appropriate handler (text reader, image OCR, audio transcription), and responds with a `ProcessedFile` result. After processing, it deletes the original file from disk.

## Acceptance Criteria
- Extends `BaseProcess` with `processName: "file-processor"`
- Handles `file.process` envelope with `FileProcessRequest` payload
- Routing logic:
  - `category: 'text'` → read file with `fs/promises.readFile` (UTF-8)
    - If content.length <= `textMaxInlineChars`: respond with `type: 'text'`, full content
    - If content.length > `textMaxInlineChars`: respond with `type: 'text_long'`, full content (chunking/summarizing is Orchestrator's responsibility — see FP-10)
  - `category: 'image'` and `ocrEnabled: true` → call `OllamaAdapter.chatWithImage()` with OCR prompt; respond with `type: 'image_ocr'`
  - `category: 'audio'` → call `convertToWav()` then `transcribeAudio()`; respond with `type: 'audio_transcript'`
  - `category: 'unknown'` → respond with `type: 'ignored'`, empty content
- After any processing attempt (success or failure), **delete the original file** from disk
- If audio: also delete the intermediate `.wav` file
- On processing error: respond with a standard `error` envelope (do NOT crash the process)
- Emit `event.file.processed` fire-and-forget to `logger` after each file

## Implementation Notes
- OCR prompt: `"Examine this image carefully. If it contains readable text, extract ALL text verbatim. If it contains no significant text, describe the image in detail. Return ONLY the extracted text or description — no preamble."`
- Use `fs/promises.unlink()` for file deletion; wrap in try/catch (file may already be gone)
- The service is stateless — no database, no in-memory state between requests
- Register in `main()` function at the bottom, calling `agent.start()` — follow planner-agent.ts pattern
