# AO-07 Real-time IPC Log Viewer

## Context
Debugging cross-process flows is currently dependent on console logs.

## Proposed Changes
- [ ] Implement a WebSocket-based (or polling) live log viewer in the dashboard.
- [ ] Show envelopes as they pass through the Router.
- [ ] Add filtering by process name and message type.

## Verification
- Send a message in Telegram and watch the log entries appear in the dashboard.
