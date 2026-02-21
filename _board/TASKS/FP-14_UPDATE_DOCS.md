# FP-14: Update Documentation

**Files**: `_docs/COMPONENTS.md`, `_docs/TECH.md`, `_docs/MESSAGE PROTOCOL SPEC.md`, `README.md`
**Dependencies**: FP-07, FP-09, FP-10
**Phase**: 6 — Documentation

## Description
Update all architecture and technical documentation to reflect the new file processing subsystem. This includes the component list, technology stack, message protocol catalogue, and the project README.

## Acceptance Criteria
- `_docs/COMPONENTS.md`:
  - Add `File Processor` section under "Service Processes"
  - Document its role: receives `file.process`, routes by category, responds with `ProcessedFile`
  - Update Telegram Adapter section to mention file detection and `file.ingest`
  - Update Integration Flow to show the file path (steps before `plan.create`)
- `_docs/TECH.md`:
  - Add `nodejs-whisper` under a new "Speech-to-Text" section
  - Add `ffmpeg-static` under "Audio Processing"
- `_docs/MESSAGE PROTOCOL SPEC.md`:
  - Add new message types under a "File Processing" category:
    - `file.ingest` (telegram-adapter → core)
    - `file.process` (core → file-processor)
    - `event.file.processed` (file-processor → logger)
- `README.md`:
  - Add a "Supported File Types" section explaining what happens to each type
  - Mention Whisper model download on first use (~200MB)

## Implementation Notes
- Keep documentation concise and consistent with the existing style (short bullet lists, no prose blocks)
- The README section should be user-facing — explain capabilities, not internal implementation
