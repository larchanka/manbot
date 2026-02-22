# AO-12 Test: Supervisor Auto-Restart

## Context
Automated verification of the Supervisor's ability to maintain system uptime.

## Proposed Changes
- [ ] Create `src/tests/supervisor.test.ts`.
- [ ] Test case: Spawn child, sigkill child, wait for supervisor to restart it.
- [ ] Test case: Verify backoff strategy if child keeps crashing.

## Verification
- Run `npm test src/tests/supervisor.test.ts`.
