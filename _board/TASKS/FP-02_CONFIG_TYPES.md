# FP-02: Add Config Types and Defaults for File Processing

**File**: `src/shared/config.ts`, `config.json`, `config.json.example`
**Dependencies**: None
**Phase**: 1 — Foundation

## Description
Extend the config system with two new sections: `whisper` (model name, language, model directory) and `fileProcessor` (upload dir, max file size, inline character limit, OCR model, OCR enabled flag). Add TypeScript interfaces, merge defaults, and update the environment variable override map.

## Acceptance Criteria
- Add `WhisperConfig` interface:
  - `modelName: string` (default: `"base.en"`)
  - `language: string` (default: `"auto"`)
  - `modelDir: string` (default: `"data/whisper-models"`)
- Add `FileProcessorConfig` interface:
  - `uploadDir: string` (default: `"data/uploads"`)
  - `maxFileSizeBytes: number` (default: `52428800` — 50 MB)
  - `textMaxInlineChars: number` (default: `8000`)
  - `ocrModel: string` (default: `"glm-ocr:q8_0"`)
  - `ocrEnabled: boolean` (default: `true`)
- Both interfaces added to `AppConfig`
- `DEFAULT_CONFIG` updated with new sections
- `mergeEnv()` updated with corresponding env var overrides
- `config.json` and `config.json.example` updated with new sections and defaults

## Implementation Notes
- Env vars: `WHISPER_MODEL_NAME`, `WHISPER_LANGUAGE`, `WHISPER_MODEL_DIR`
- Env vars: `FILE_PROCESSOR_UPLOAD_DIR`, `FILE_PROCESSOR_MAX_FILE_SIZE_BYTES`, `FILE_PROCESSOR_TEXT_MAX_INLINE_CHARS`, `FILE_PROCESSOR_OCR_MODEL`, `FILE_PROCESSOR_OCR_ENABLED`
- Follow existing `deepMerge` pattern — no changes to merge logic needed
