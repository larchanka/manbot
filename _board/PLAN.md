# 🗂️ File Processing Pipeline — Implementation Plan

## Overview
Add file processing capabilities to ManBot. Users can send text documents, photos, and audio messages via Telegram. The system processes each file type independently: text is read and injected into context (or indexed into RAG if large), images are OCR'd or described using Ollama vision (`glm-ocr:q8_0`), and audio is transcribed using Whisper (`nodejs-whisper` + `ffmpeg-static`). All processing happens in a new independent `file-processor` process, consistent with the existing process-isolation architecture.

---

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Audio format conversion | `ffmpeg-static` (npm) | No system ffmpeg installed; bundled binary is self-contained |
| Audio transcription | `nodejs-whisper` (base.en) | ~200MB, runs locally, no cloud dependency |
| Image model | `glm-ocr:q8_0` via Ollama | Already connected to local Ollama; on-demand |
| Image behaviour | Auto OCR + describe | Model decides: text → extract verbatim, no text → describe |
| Long text handling | Chunk → Summarize → RAG | Preserves content accessible via semantic search |
| Large file failures | Warn user, continue | Partial failures don't block the task pipeline |
| File cleanup | Delete after processing | Stateless processor; no persistent upload storage |

---

## Phases

### Phase 1 — Foundation (Tasks FP-01 to FP-03)
Set up infrastructure: new npm packages, config types, TypeScript interfaces.
No runtime changes — pure setup.

### Phase 2 — Core Services (Tasks FP-04 to FP-06)
Build the three low-level utilities:
- `OllamaAdapter.chatWithImage()` for vision
- `convertToWav()` for audio conversion
- `transcribeAudio()` for Whisper transcription

Each utility is independently testable and has no dependency on the new process.

### Phase 3 — File Processor Process (Tasks FP-07 to FP-08)
Build the `file-processor` service as a new `BaseProcess` subprocess and register it in the Orchestrator. At this point the service exists and responds to `file.process` envelopes.

### Phase 4 — Telegram Integration (Tasks FP-09 to FP-11)
Wire the Telegram side: file detection, download, `file.ingest` emission, and the Orchestrator handler that calls `file-processor`, collects results, handles warnings, and builds the enriched goal. Long-text RAG indexing pipeline implemented here.

### Phase 5 — Planner Integration + Cleanup (Tasks FP-12 to FP-13)
Update the planner prompt to handle enriched goals and indexed file references. Set up upload directory lifecycle (init + orphan cleanup).

### Phase 6 — Documentation and Verification (Tasks FP-14 to FP-15)
Update all docs to reflect the new subsystem, then perform end-to-end manual verification across all file types and edge cases.

---

## Data Flow

```
User sends file on Telegram
  ↓
[telegram-adapter]
  Detect attachment → download → classify → emit file.ingest
  ↓
[core / Orchestrator]
  file.ingest handler
  ↓ (parallel)
  ┌─ text  → [file-processor] → inline or text_long
  │    └─ text_long → chunk → summarize (model-router) → insert (rag-service)
  ├─ image → [file-processor] → OllamaAdapter.chatWithImage → OCR/description
  └─ audio → [file-processor] → convertToWav → transcribeAudio → transcript
  ↓
  Build enrichedGoal
  ↓
  runTaskPipeline → Planner → Executor → ...
  ↓
[telegram-adapter] → User
```

---

## New Files
- `src/services/file-processor.ts` — new independent service process
- `src/utils/audio-converter.ts` — ffmpeg-static conversion utility
- `src/utils/whisper-transcriber.ts` — nodejs-whisper transcription utility

## Modified Files
- `src/services/ollama-adapter.ts` — add `chatWithImage()`
- `src/adapters/telegram-adapter.ts` — file detection, download, `file.ingest`
- `src/core/orchestrator.ts` — register file-processor, add `file.ingest` handler, long-text pipeline
- `src/agents/prompts/planner.ts` — file context instructions + examples
- `src/shared/config.ts` — `WhisperConfig`, `FileProcessorConfig`
- `config.json`, `config.json.example` — new config sections
- `_docs/COMPONENTS.md`, `_docs/TECH.md`, `_docs/MESSAGE PROTOCOL SPEC.md`, `README.md`

---

## New npm Dependencies
| Package | Type | Purpose |
|---|---|---|
| `nodejs-whisper` | runtime | Speech-to-text transcription |
| `ffmpeg-static` | runtime | Audio format conversion (ogg → wav) |

---

## Risk Notes
- **Whisper model download**: ~200MB on first audio request. User will see a delay and a descriptive error on first attempt. Subsequent uses are fast.
- **OCR model availability**: `glm-ocr:q8_0` must be pulled in Ollama before use (`ollama pull glm-ocr:q8_0`). If missing, image processing returns an Ollama error — the Orchestrator warns the user and skips.
- **Context length**: Inline file content is capped to prevent planner prompt overflow. Long files go through RAG instead.
