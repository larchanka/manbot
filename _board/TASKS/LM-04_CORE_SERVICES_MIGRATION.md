# LM-04: Update Core Services for Lemonade

## Description
Convert `GeneratorService`, `RAGService`, and `TimeParserService` from using a legacy adapter to `LemonadeAdapter` for general text and embedding tasks.

## Status
- [x] Update `GeneratorService` to use Lemonade's chat endpoint.
- [x] Update `RAGService` to use Lemonade's embeddings.
- [x] Update `TimeParserService` for natural language time parsing via Lemonade.
- [x] Verify chat completions, tool calls, and embedding flows.

## Context
Ensures all LLM-dependent components are using the new centralized Lemonade adapter.
