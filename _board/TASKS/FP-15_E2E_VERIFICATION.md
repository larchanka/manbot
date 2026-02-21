# FP-15: End-to-End Verification

**Files**: Manual testing (no new code files)
**Dependencies**: FP-01 through FP-14
**Phase**: 6 — Documentation

## Description
Manual end-to-end verification of the complete file processing pipeline across all supported file types. Tests are performed via the Telegram bot interface with the system running via `npm run dev:orchestrator`.

## Acceptance Criteria

### Text File
- [ ] Send a short `.txt` file to bot → content is used as context, meaningful response returned
- [ ] Send a large `.txt` file (> 8000 chars) → bot confirms indexing, subsequent semantic search query retrieves content

### Image File
- [ ] Send a photo of printed text (e.g., business card, receipt) → OCR text correctly extracted and returned
- [ ] Send a photo with no text (e.g., landscape) → meaningful image description returned
- [ ] Send a `.png` screenshot of code → code text correctly extracted

### Audio File
- [ ] Record and send a Telegram voice message → transcript returned, agent acts on the spoken instruction
- [ ] Send a short `.mp3` audio file → transcript returned

### Mixed / Edge Cases
- [ ] Send 2 files simultaneously → both processed, warnings for any failures, pipeline runs
- [ ] Send unsupported format (`.zip`) → user notified `"⚠️ unsupported format"`, nothing else happens
- [ ] Send file exceeding 50MB → user notified of size limit immediately, no download attempted
- [ ] Send file + caption → caption is used as the goal, file is used as context

### Failure Recovery
- [ ] Temporarily disable Ollama → image file sends user an error warning, pipeline continues if other files succeeded
- [ ] Send corrupt audio → transcription error is reported silently, pipeline continues

## Implementation Notes
- Run the full system: `npm run build && npm run start:orchestrator`
- Whisper model download happens on first audio test — allow 2-3 minutes
- Use Telegram's "attach file" button to test documents and photos
- Log output should show: `file.ingest` received, `file.process` dispatched, `ProcessedFile` returned
