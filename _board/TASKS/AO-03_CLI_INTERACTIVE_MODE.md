# AO-03 CLI Interactive Mode

## Context
Enable easy manual testing of any service without running the full orchestrator.

## Proposed Changes
- [ ] Add `--interactive` flag support to `BaseProcess`.
- [ ] When active, provide a prompt for manual JSONL input.
- [ ] Enable colorful, human-readable output to stderr for responses.

## Verification
- Run `node dist/services/rag-service.js --interactive` and manually test semantic search.
