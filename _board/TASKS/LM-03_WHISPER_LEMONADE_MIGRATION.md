# LM-03: Migrate WhisperTranscriber to Lemonade API

## Description
Replace local `nodejs-whisper` dependency with Lemonade's transcription API for reliable audio processing.

## Status
- [x] Update `whisper-transcriber.ts` to use `LemonadeAdapter.transcribe`.
- [x] Integrate `Whisper-Tiny` model.
- [x] Unit tests for `WhisperTranscriber` with Lemonade mock.
- [x] Remove unused `nodejs-whisper` folder and related logic.

## Context
Improves audio transcription speed and reliability using a specialized local server endpoint.
