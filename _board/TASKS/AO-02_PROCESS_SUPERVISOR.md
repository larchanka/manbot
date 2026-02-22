# AO-02 Implement Process Supervisor

## Context
The Orchestrator currently spawns processes but doesn't actively manage their lifecycle or recover from crashes.

## Proposed Changes
- [ ] Implement a `Supervisor` module within the Orchestrator.
- [ ] Track child process uptime and exit codes.
- [ ] Implement auto-restart logic (with backoff).
- [ ] Emit `event.system.process_restart` for observability.

## Verification
- Kill a child process (e.g., `model-router`) and verify it restarts automatically.
- Check logs for restart events.
