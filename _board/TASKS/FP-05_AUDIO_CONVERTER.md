# FP-05: Implement Audio Conversion Utility (ffmpeg-static)

**File**: `src/services/file-processor.ts` (internal helper) or `src/utils/audio-converter.ts`
**Dependencies**: FP-01, FP-02
**Phase**: 2 — Core Services

## Description
Create a utility function `convertToWav(inputPath: string, outputPath: string): Promise<void>` that wraps `ffmpeg-static` to convert any audio format (ogg, mp3, m4a, mp4 audio) to 16kHz mono PCM WAV — the format required by Whisper. Telegram voice messages arrive as `.ogg` (Opus codec) so this conversion is always necessary before transcription.

## Acceptance Criteria
- Function `convertToWav(inputPath, outputPath)` returns a Promise
- Uses `ffmpeg-static` binary path (imported as `import ffmpegPath from 'ffmpeg-static'`)
- Spawns ffmpeg as a child process with args: `-i {input} -ar 16000 -ac 1 -f wav {output}`
- Resolves when ffmpeg exits with code 0
- Rejects with a descriptive error if ffmpeg exits with non-zero code or times out
- A 60-second timeout is enforced (most audio clips from Telegram are short)
- Stdout/stderr from ffmpeg are captured and included in the error message on failure

## Implementation Notes
- Use `spawn` from `node:child_process` (not `exec`) to avoid shell injection
- `ffmpeg-static` returns `null` if no binary is available for the platform — guard against this and throw a clear error
- Output file extension must be `.wav` — caller is responsible for choosing the path
- Delete the output `.wav` file is the caller's responsibility (file-processor handles cleanup)
