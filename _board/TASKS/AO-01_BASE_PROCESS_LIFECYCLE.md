# AO-01 Standardize BaseProcess Lifecycle

## Context
Every child process should follow a strict lifecycle protocol to ensure the Supervisor can monitor health.

## Proposed Changes
- [ ] Implement `status` enum in `BaseProcess`.
- [ ] Add `heartbeat` mechanism (emit `event.system.heartbeat` periodically).
- [ ] Add `getMetrics()` method to report memory/resource usage.
- [ ] Ensure all existing services benefit from these changes.

## Verification
- Unit tests for lifecycle transitions.
- Verify heartbeat events in logs.
