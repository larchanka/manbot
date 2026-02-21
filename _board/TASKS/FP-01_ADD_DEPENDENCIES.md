# FP-01: Add npm Dependencies for File Processing

**File**: `package.json`
**Dependencies**: None
**Phase**: 1 — Foundation

## Description
Install the two new runtime packages required by the file processing pipeline: `nodejs-whisper` for audio speech-to-text transcription, and `ffmpeg-static` for bundled audio format conversion (ogg/mp3 → wav). No system-level `ffmpeg` is present on the host, so the static binary is mandatory.

## Acceptance Criteria
- Add `nodejs-whisper` to `dependencies`
- Add `ffmpeg-static` to `dependencies`
- Add `@types/ffmpeg-static` (if available) to `devDependencies`
- Run `npm install` successfully with no peer-dependency conflicts
- All packages are compatible with Node.js >= 20 and ESM (`"type": "module"`)

## Implementation Notes
- Verify `nodejs-whisper` works with ESM imports (may need `.js` extension or a wrapper)
- `ffmpeg-static` exports the path to the ffmpeg binary: `import ffmpegPath from 'ffmpeg-static'`
- Check that `nodejs-whisper` model download logic is documented so FP-08 can reference it
