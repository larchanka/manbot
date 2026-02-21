# My Project Board

## To Do



## In Progress

### FP-15 End-to-End Verification
  - tags: [in-progress, qa, e2e]
  - defaultExpanded: true
    ```md
    Manual verification of all file types, edge cases, and failure scenarios via Telegram.
    Source: FP-15_E2E_VERIFICATION.md
    ```



## Done

### FP-14 Update Documentation
  - tags: [done, docs]
  - defaultExpanded: false
    ```md
    Updated COMPONENTS.md, TECH.md, MESSAGE PROTOCOL SPEC.md, and README.md.
    Source: FP-14_UPDATE_DOCS.md
    ```

### FP-13 Upload Directory Init and Cleanup
  - tags: [done, orchestrator, infra]
  - defaultExpanded: false
    ```md
    initUploadDirectory() creates upload dir and purges orphaned files (>1h) on startup.
    Source: FP-13_UPLOAD_DIR_CLEANUP.md
    ```

### FP-12 Update Planner Prompt for File Context
  - tags: [done, planner, prompt]
  - defaultExpanded: false
    ```md
    Added <file_context_awareness> block to PLANNER_SYSTEM_PROMPT.
    Documents text/image/audio/indexed file fences and guidance.
    Source: FP-12_PLANNER_PROMPT_FILE_CONTEXT.md
    ```

### FP-11 Long Text Chunking and RAG Indexing
  - tags: [done, orchestrator, rag]
  - defaultExpanded: false
    ```md
    indexLongText(): 2k-char chunks, 3-at-a-time summarisation, RAG insert with metadata.
    Source: FP-11_LONG_TEXT_RAG_INDEXING.md
    ```

### FP-10 Orchestrator — file.ingest Handler
  - tags: [done, orchestrator, core]
  - defaultExpanded: false
    ```md
    handleFileIngest(): parallel processing, enrichedGoal builder, 32k char cap, user warnings.
    Source: FP-10_ORCHESTRATOR_FILE_INGEST.md
    ```

### FP-09 Telegram Adapter — File Detection and Download
  - tags: [done, telegram, adapter]
  - defaultExpanded: false
    ```md
    Detects photo/document/voice/audio, size-guards, downloads, classifies, emits file.ingest.
    Source: FP-09_TELEGRAM_FILE_DOWNLOAD.md
    ```

### FP-08 Register File Processor in Orchestrator
  - tags: [done, orchestrator, infra]
  - defaultExpanded: false
    ```md
    Added 'file-processor' to PROCESS_SCRIPTS; spawned at startup alongside other services.
    Source: FP-08_REGISTER_FILE_PROCESSOR.md
    ```

### FP-07 Build the File Processor Service
  - tags: [done, service, core]
  - defaultExpanded: false
    ```md
    file-processor.ts BaseProcess: routes text/image/audio/unknown, deletes files, emits audit events.
    Source: FP-07_FILE_PROCESSOR_SERVICE.md
    ```


### FP-06 Implement Whisper Transcription Utility
  - tags: [done, util, audio]
  - defaultExpanded: false
    ```md
    Created src/utils/whisper-transcriber.ts. transcribeAudio() with 5-min timeout,
    auto-download, first-run UX. Build clean, 156 tests pass.
    Source: FP-06_WHISPER_TRANSCRIBER.md
    ```

### FP-05 Implement Audio Conversion Utility
  - tags: [done, util, audio]
  - defaultExpanded: false
    ```md
    Created src/utils/audio-converter.ts. convertToWav() with ffmpeg-static,
    60s timeout, stderr capture. Build clean, 156 tests pass.
    Source: FP-05_AUDIO_CONVERTER.md
    ```

### FP-04 Extend OllamaAdapter with Vision Support
  - tags: [done, service, ollama]
  - defaultExpanded: false
    ```md
    Added chatWithImage() with base64 image injection into Ollama multimodal messages.
    Reuses fetchWithRetry. Build clean, 156 tests pass.
    Source: FP-04_OLLAMA_VISION.md
    ```

### FP-03 Define File Processing Protocol Types
  - tags: [done, infra, protocol]
  - defaultExpanded: false
    ```md
    Created src/shared/file-protocol.ts with all shared types and classifyMimeType() helper.
    Updated MESSAGE PROTOCOL SPEC.md. Build and tests pass.
    Source: FP-03_PROTOCOL_TYPES.md
    ```

### FP-02 Add Config Types and Defaults
  - tags: [done, infra, config]
  - defaultExpanded: false
    ```md
    Added WhisperConfig and FileProcessorConfig interfaces, defaults, env var overrides.
    Updated config.json.example. All 156 tests pass.
    Source: FP-02_CONFIG_TYPES.md
    ```

### FP-01 Add npm Dependencies
  - tags: [done, infra, deps]
  - defaultExpanded: false
    ```md
    Installed nodejs-whisper ^0.2.9, ffmpeg-static ^5.3.0, @types/ffmpeg-static ^5.1.0.
    Both confirmed ESM-compatible. Build passes.
    Source: FP-01_ADD_DEPENDENCIES.md
    ```

### DB-07 Orchestrator Integration & Notion UI
  - tags: [done, ui, orchestrator]
  - defaultExpanded: false
    ```md
    Converted the dashboard to a TypeScript service, integrated it into the Orchestrator, added IPC logging, and implemented a Notion-like UI with light/dark theme support.

    Source: src/services/dashboard-service.ts
    ```
