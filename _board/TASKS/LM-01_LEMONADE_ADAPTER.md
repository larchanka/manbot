# LM-01: Implement LemonadeAdapter

## Description
Replace `OllamaAdapter` with `LemonadeAdapter` to support Lemonade Server's OpenAI-compatible API.

## Status
- [x] Create `LemonadeAdapter.ts` with `chat`, `chatWithImage`, `embed`, and `transcribe`.
- [x] Implement server warmup logic.
- [x] Add configuration support in `config.ts`.
- [x] Unit tests for `LemonadeAdapter`.

## Context
Migrating from Ollama to Lemonade for better local multimodal and audio support.
