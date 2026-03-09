# Task: P2-01 Implement Lemonade Adapter

## Description
Build a bridge between the ManBot platform and the local Lemonade instance. This adapter will handle model inference, streaming responses, and token usage reporting in an OpenAI-compatible way.

## Requirements
- Create `src/services/lemonade-adapter.ts`.
- Implement a client using `fetch` or the `openai` JS library (or raw fetch for OpenAI compatibility).
- Support essential methods:
  - `generate(prompt, model)`: returns full response.
  - `chat(messages, model)`: returns full response.
  - `streamChat(messages, model)`: returns an async iterator for streaming.
- Capture and report token usage metrics (prompt_eval_count, eval_count).
- Implement timeout handling and retry logic for network errors.

## Definition of Done
- Adapter correctly retrieves completions from a running Lemonade server.
- Supported methods handle streaming and regular responses accurately.
- Token metrics are extracted from the Lemonade response payload.
