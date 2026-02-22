# AO-03 CLI Interactive Mode

## Context
Debugging IPC is hard. Services should be testable via direct stdin.

## Proposed Changes
- [ ] Detect `--interactive` flag in `main()` of services.
- [ ] When in interactive mode, use a simpler `readline` interface for manual input.
- [ ] Pretty-print outgoing envelopes to stderr for human readability.

## Verification
- Run `node dist/services/rag-service.js --interactive` and manually type a JSON envelope.
- Verify response is printed correctly.
