# AO-01 Standardize BaseProcess Lifecycle

## Context
Independent processes need a standardized way to report health to the supervisor.

## Proposed Changes
- [ ] Implement `status` enum: `starting`, `ready`, `degraded`, `stopping`.
- [ ] Add `heartbeat()` method in `BaseProcess` that emits `event.system.heartbeat` periodically.
- [ ] Add basic resource reporting (memory usage) in the heartbeat.

## Verification
- Run a service and observe heartbeat events on the IPC bus.
