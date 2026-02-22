# AO-05 Integrate Router in Orchestrator

## Context
Move routing logic out of `orchestrator.ts` and into the new Router service.

## Proposed Changes
- [ ] Refactor `Orchestrator.handleLine` to delegate to Router where appropriate.
- [ ] Ensure all services are connected to the central Router bus.

## Verification
- Full system smoke test: original Telegram task pipeline should still work.
