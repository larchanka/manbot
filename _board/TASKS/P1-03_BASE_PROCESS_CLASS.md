# Task: P1-03 Create base Process class

## Description
Implement a base class or helper to standardize the way individual processes handle stdin/stdout communication, message parsing, and error handling.

## Requirements
- Create `src/shared/base-process.ts`.
- Implement logic to listen to `process.stdin` and emit parsed messages.
- Implement logic to write JSONL-formatted messages to `process.stdout`.
- Add basic error handling for malformed JSON.
- Integrate Zod validation for incoming/outgoing envelopes.

## Definition of Done
- `BaseProcess` class is implemented.
- A simple test script extending `BaseProcess` can receive and respond to a JSON message via pipes.
