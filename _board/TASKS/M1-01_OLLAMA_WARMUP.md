# M1-01: Enhance LemonadeAdapter with Warmup Support

**File**: `src/services/lemonade-adapter.ts`  
**Dependencies**: None  
**Phase**: M1 - Core Infrastructure

## Description
Add a `warmup` method to `LemonadeAdapter` that sends a minimal prompt to ensure the model is loaded into VRAM.

## Acceptance Criteria
- `warmup(model: string, keepAlive: string | number): Promise<void>` implemented.
- Uses `/api/chat` with `stream: false`.
- `chat` and `generate` methods updated to accept `keep_alive` in options.
- Error handling for warmup failures.

## Implementation Notes
- Minimal prompt can be something like `{ role: "user", content: "hello" }`.
- Ensure the `keep_alive` parameter is correctly passed in the request body.
- Warmup results (text) can be ignored, but the call ensures the model is loaded.
