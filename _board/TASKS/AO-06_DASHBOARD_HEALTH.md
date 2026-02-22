# AO-06 Dashboard Process Health Monitoring

## Context
The dashboard should show the status of all child processes managed by the supervisor.

## Proposed Changes
- [ ] Add "Process Status" table to dashboard.
- [ ] Display: Process Name, Status (Running/Restarting), Restarts Count, Uptime.
- [ ] Use `heartbeat` events to update status in real-time.

## Verification
- Open dashboard and verify process list matches actual running system.
