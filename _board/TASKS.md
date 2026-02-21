# 📋 Tasks — File Processing Pipeline

All tasks are prefixed `FP-` (File Processing). They are ordered by implementation dependency.

---

## Phase 1 — Foundation

### FP-01 Add npm Dependencies
**File**: `package.json`
**Deps**: None
Install `nodejs-whisper` and `ffmpeg-static` runtime packages.
→ [FP-01_ADD_DEPENDENCIES.md](./TASKS/FP-01_ADD_DEPENDENCIES.md)

---

### FP-02 Add Config Types and Defaults
**File**: `src/shared/config.ts`, `config.json`
**Deps**: None
Add `WhisperConfig` and `FileProcessorConfig` interfaces, defaults, and env var overrides.
→ [FP-02_CONFIG_TYPES.md](./TASKS/FP-02_CONFIG_TYPES.md)

---

### FP-03 Define File Processing Protocol Types
**File**: `src/shared/protocol.ts`
**Deps**: FP-02
Define `FileDescriptor`, `FileIngestPayload`, `FileProcessRequest`, `ProcessedFile` interfaces.
→ [FP-03_PROTOCOL_TYPES.md](./TASKS/FP-03_PROTOCOL_TYPES.md)

---

## Phase 2 — Core Services

### FP-04 Extend OllamaAdapter with Vision Support
**File**: `src/services/ollama-adapter.ts`
**Deps**: FP-02, FP-03
Add `chatWithImage(messages, model, imagePath)` method using Ollama multimodal API.
→ [FP-04_OLLAMA_VISION.md](./TASKS/FP-04_OLLAMA_VISION.md)

---

### FP-05 Implement Audio Conversion Utility
**File**: `src/utils/audio-converter.ts`
**Deps**: FP-01, FP-02
`convertToWav(inputPath, outputPath)` — wraps `ffmpeg-static` to produce 16kHz mono WAV.
→ [FP-05_AUDIO_CONVERTER.md](./TASKS/FP-05_AUDIO_CONVERTER.md)

---

### FP-06 Implement Whisper Transcription Utility
**File**: `src/utils/whisper-transcriber.ts`
**Deps**: FP-01, FP-02, FP-05
`transcribeAudio(wavPath)` — calls `nodejs-whisper` with configured model and language.
→ [FP-06_WHISPER_TRANSCRIBER.md](./TASKS/FP-06_WHISPER_TRANSCRIBER.md)

---

## Phase 3 — File Processor Process

### FP-07 Build the File Processor Service
**File**: `src/services/file-processor.ts`
**Deps**: FP-03, FP-04, FP-05, FP-06
New `BaseProcess` subprocess. Routes files by category: text read, image OCR, audio transcription, unknown ignored. Deletes files after processing.
→ [FP-07_FILE_PROCESSOR_SERVICE.md](./TASKS/FP-07_FILE_PROCESSOR_SERVICE.md)

---

### FP-08 Register File Processor in Orchestrator
**File**: `src/core/orchestrator.ts`
**Deps**: FP-07
Add `file-processor` to `PROCESS_SCRIPTS` and spawn it at startup.
→ [FP-08_REGISTER_FILE_PROCESSOR.md](./TASKS/FP-08_REGISTER_FILE_PROCESSOR.md)

---

## Phase 4 — Telegram Integration

### FP-09 Telegram Adapter — File Detection and Download
**File**: `src/adapters/telegram-adapter.ts`
**Deps**: FP-02, FP-03
Detect photo/document/voice/audio, download to sandbox, classify MIME type, emit `file.ingest`.
→ [FP-09_TELEGRAM_FILE_DOWNLOAD.md](./TASKS/FP-09_TELEGRAM_FILE_DOWNLOAD.md)

---

### FP-10 Orchestrator — file.ingest Handler and Context Building
**File**: `src/core/orchestrator.ts`
**Deps**: FP-08, FP-09
Handle `file.ingest`: dispatch to file-processor in parallel, collect results, warn on failures, build enrichedGoal, call `runTaskPipeline`.
→ [FP-10_ORCHESTRATOR_FILE_INGEST.md](./TASKS/FP-10_ORCHESTRATOR_FILE_INGEST.md)

---

### FP-11 Long Text Chunking, Summarization, and RAG Indexing
**File**: `src/core/orchestrator.ts`
**Deps**: FP-10, rag-service
Chunk long text → summarize each chunk via model-router → insert summaries into rag-service with file metadata.
→ [FP-11_LONG_TEXT_RAG_INDEXING.md](./TASKS/FP-11_LONG_TEXT_RAG_INDEXING.md)

---

## Phase 5 — Planner Integration and Cleanup

### FP-12 Update Planner Prompt for File Context Awareness
**File**: `src/agents/prompts/planner.ts`
**Deps**: FP-10
Add `<file_context_instructions>` section and two new few-shot examples (inline context, indexed file).
→ [FP-12_PLANNER_PROMPT_FILE_CONTEXT.md](./TASKS/FP-12_PLANNER_PROMPT_FILE_CONTEXT.md)

---

### FP-13 Upload Directory Initialization and Cleanup
**File**: `src/core/orchestrator.ts`
**Deps**: FP-02, FP-07
Create upload dir at startup; clear orphaned files (older than 1h) at startup.
→ [FP-13_UPLOAD_DIR_CLEANUP.md](./TASKS/FP-13_UPLOAD_DIR_CLEANUP.md)

---

## Phase 6 — Documentation and Verification

### FP-14 Update Documentation
**Files**: `_docs/COMPONENTS.md`, `_docs/TECH.md`, `_docs/MESSAGE PROTOCOL SPEC.md`, `README.md`
**Deps**: FP-07, FP-09, FP-10
Document the new subsystem in all architecture and user-facing docs.
→ [FP-14_UPDATE_DOCS.md](./TASKS/FP-14_UPDATE_DOCS.md)

---

### FP-15 End-to-End Verification
**Files**: Manual testing
**Deps**: FP-01 through FP-14
Manual verification of all file types: text (short + long), image (OCR + description), audio (voice + mp3), mixed, and edge/failure cases.
→ [FP-15_E2E_VERIFICATION.md](./TASKS/FP-15_E2E_VERIFICATION.md)
