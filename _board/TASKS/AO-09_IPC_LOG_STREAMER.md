# AO-09 Live IPC Log Streamer

## Context
Improve debuggability of the process-isolated architecture.

## Proposed Changes
- [ ] Implement a polling or WebSocket endpoint in `dashboard-service.ts` to expose the IPC log buffer.
- [ ] Add a "Log Stream" UI component to the dashboard.
- [ ] Support color-coded message types and process filtering.

## Verification
- Dashboard check: verify messages appear in the stream when Telegram tasks are running.
