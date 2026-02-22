# AO-08 Dashboard Health View

## Context
Real-time visibility into the health of the process-isolated architecture.

## Proposed Changes
- [ ] Add a "Processes" section to the ManBot Dashboard.
- [ ] Subscribe to `event.system.heartbeat` and `event.system.process_restart` events.
- [ ] Display status pills, uptime, and restart frequency.

## Verification
- Dashboard visual check: verify all services appear and update their status.
