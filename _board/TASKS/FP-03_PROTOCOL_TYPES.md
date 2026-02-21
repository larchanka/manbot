# FP-03: Define File Processing Protocol Types

**File**: `src/shared/protocol.ts` (or new `src/shared/file-protocol.ts`)
**Dependencies**: FP-02
**Phase**: 1 — Foundation

## Description
Define all TypeScript interfaces and Zod schemas for the new file processing envelope types so they are shared across the Telegram adapter, Orchestrator, and file-processor service. Also update `_docs/MESSAGE PROTOCOL SPEC.md` with the new message type catalogue.

## Acceptance Criteria
- Define `FileDescriptor` interface:
  ```ts
  { fileId, fileName, mimeType, sizeBytes, localPath, category: 'text'|'image'|'audio'|'unknown' }
  ```
- Define `FileIngestPayload` interface:
  ```ts
  { chatId, userId, conversationId, messageId, files: FileDescriptor[], caption?: string }
  ```
- Define `FileProcessRequest` interface:
  ```ts
  { fileId, localPath, fileName, mimeType, category, processingHint?: string }
  ```
- Define `ProcessedFile` interface:
  ```ts
  { fileId, fileName, type: 'text'|'image_ocr'|'audio_transcript'|'text_indexed'|'ignored', content: string, metadata: Record<string, unknown> }
  ```
- `_docs/MESSAGE PROTOCOL SPEC.md` updated with `file.ingest`, `file.process`, `event.file.processed` entries

## Implementation Notes
- Types can live in `src/shared/protocol.ts` alongside existing types or in a dedicated `src/shared/file-protocol.ts`
- No Zod runtime validation required for internal TS types — just the interfaces are sufficient
- `category` classification rules (by MIME prefix) should be documented in this file as a comment
