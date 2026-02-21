# FP-04: Extend OllamaAdapter with Vision/Image Support

**File**: `src/services/ollama-adapter.ts`
**Dependencies**: FP-02, FP-03
**Phase**: 2 — Core Services

## Description
Add a new `chatWithImage()` method to `OllamaAdapter` that accepts a local image file path, reads and base64-encodes it, and sends it to the Ollama `/api/chat` endpoint using the multimodal `images` field. This is required by the `file-processor` to call `glm-ocr:q8_0` for image OCR.

## Acceptance Criteria
- New method signature:
  ```ts
  async chatWithImage(
    messages: OllamaMessage[],
    model: string,
    imagePath: string
  ): Promise<OllamaResponse>
  ```
- Method reads the file at `imagePath` using `fs/promises.readFile`
- Encodes to base64 string
- Injects `images: [base64string]` into the **last user message** in the messages array before sending
- Uses the same timeout, retry, and error handling as the existing `chat()` method
- Throws a clear error if `imagePath` does not exist or cannot be read

## Implementation Notes
- Ollama vision format: the `images` field is an array of base64 strings, placed in the user message object
- No MIME type needed — Ollama auto-detects from content
- Reuse existing `fetchWithTimeout` / retry logic from `chat()` — don't duplicate
- Add a unit test stub (can be skipped/mocked) confirming the base64 encoding step
