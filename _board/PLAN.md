# Architecture Overhaul: Autonomous AI & Robust Supervision

This plan describes the transition to an "Advanced" architecture where human and scheduled inputs are unified, and the system becomes more resilient through active process supervision.

## Phase 1: Infrastructure & Supervisor (AO-01 to AO-03)
We will standardize the lifecycle of all independent processes and implement a Supervisor in the Orchestrator to monitor and auto-restart crashed components.

## Phase 2: Autonomous Cron Queries (AO-04 to AO-06)
We will turn existing cron-based notifications into full AI tasks.
- **Data Reuse**: The existing `reminderMessage` field in the `cron_schedules` table will store the AI query.
- **Workflow**: When a cron job fires, it will emit a `synthetic_goal` event.
- **Statefulness**: Each run is assigned a unique `UUID` (taskId) to reuse existing storage/memory structures.

## Phase 3: Concurrency & Lifecycle (AO-07 to AO-09)
Establish a robust execution environment.
- **Configurable Concurrency**: A new setting in `config.json` to limit parallel tasks (1-N, with 0 as infinite).
- **History Anchoring**: Ensure cron-triggered tasks have consistent conversation history.

## Phase 4: Monitoring & DashBoard (AO-10 to AO-12)
Upgrade the dashboard to provide real-time process health status, live IPC log viewing, and a dedicated UI for managing the new autonomous AI queries.

## Phase 5: Verification (AO-13 to AO-15)
Final validation of autonomous flows and supervisor behavior.
