# FP-04: Extend LemonadeAdapter with Vision/Image Support

**File**: `src/services/lemonade-adapter.ts`
**Dependencies**: FP-02, FP-03
**Phase**: 2 — Core Services

## Description
Add a new `chatWithImage()` method to `LemonadeAdapter` that accepts a local image file path, reads and base64-encodes it, and sends it to the Lemonade `/chat/completions` endpoint as an OpenAI-compatible vision request. This is required by the `file-processor` to call `qwen3-vl` for image OCR.

## Acceptance Criteria
- New method signature:
  ```ts
  async chatWithImage(
    messages: ChatMessage[],
    model: string,
    imagePath: string
  ): Promise<ChatResult>
  ```
- Method reads the file at `imagePath` using `fs/promises.readFile`
- Encodes to base64 string
- Injects `images: [base64string]` into the **last user message** in the messages array before sending
- Uses the same timeout, retry, and error handling as the existing `chat()` method
- Throws a clear error if `imagePath` does not exist or cannot be read

## Implementation Notes
- OpenAI vision format: the `images_url` field is part of the message content array.
- MIME type is needed for the data URI.
- Reuse existing `fetchWithTimeout` / retry logic from `chat()` — don't duplicate
- Add a unit test stub (can be skipped/mocked) confirming the base64 encoding step
