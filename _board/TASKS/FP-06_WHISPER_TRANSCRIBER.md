# FP-06: Implement Whisper Transcription Utility

**File**: `src/utils/whisper-transcriber.ts`
**Dependencies**: FP-01, FP-02, FP-05
**Phase**: 2 — Core Services

## Description
Create a utility function `transcribeAudio(wavPath: string): Promise<string>` that uses `nodejs-whisper` to transcribe a pre-converted `.wav` file. Handles model download check, first-run delay, and graceful error messaging when the model is not yet ready.

## Acceptance Criteria
- Function accepts a `.wav` file path and returns the transcript string
- Uses `nodejs-whisper` with model name and language from `getConfig().whisper`
- Model directory pointed to `getConfig().whisper.modelDir`
- If model is not downloaded yet (first run), returns a descriptive user-facing error:
  `"Audio transcription model is downloading. Please try again in a moment."`
- If transcription succeeds, returns the raw text transcript (trimmed)
- Rejects with a clear error if the wav file does not exist
- A 5-minute timeout is enforced (long recordings)

## Implementation Notes
- `nodejs-whisper` API: `nodewhisper(filePath, { modelName, whisperOptions: { language } })`
- Check the `nodejs-whisper` docs for the correct import path with ESM
- Model files live in `getConfig().whisper.modelDir` — pass this to the whisper options
- The function should **not** handle audio conversion — it expects a `.wav` as input (FP-05 handles that)
- Log transcription duration for observability (start/end timestamps)
