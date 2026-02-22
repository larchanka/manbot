# 📋 Tasks — Architecture Overhaul (AO)

All tasks are prefixed `AO-` (Architecture Overhaul).

---

## Phase 1 — Infrastructure & Supervision

### AO-01 Standardize BaseProcess Lifecycle
Add heartbeats and health reporting to the common process base class.
→ [AO-01_BASE_PROCESS_LIFECYCLE.md](./TASKS/AO-01_BASE_PROCESS_LIFECYCLE.md)

### AO-02 Implement Process Supervisor
Add auto-restart and crash tracking to Orchestrator.
→ [AO-02_PROCESS_SUPERVISOR.md](./TASKS/AO-02_PROCESS_SUPERVISOR.md)

### AO-03 CLI Interactive Mode
Enable direct stdin testing for all services.
→ [AO-03_CLI_INTERACTIVE_MODE.md](./TASKS/AO-03_CLI_INTERACTIVE_MODE.md)

---

## Phase 2 — Autonomous AI Queries

### AO-04 CronManager AI Query Support
Trigger `event.cron.ai_query` using the `reminderMessage` as the query text.
→ [AO-04_CRON_AI_QUERY.md](./TASKS/AO-04_CRON_AI_QUERY.md)

### AO-05 Synthetic Goal Ingestion (Stateful)
Implement Orchestrator handler for cron events. Assign unique `taskId` for each run.
→ [AO-05_SYNTHETIC_GOAL_INGESTION.md](./TASKS/AO-05_SYNTHETIC_GOAL_INGESTION.md)

### AO-06 History Anchoring for Synthetic Tasks
Ensure cron-triggered tasks have access to relevant historical context.
→ [AO-06_HISTORY_ANCHORING.md](./TASKS/AO-06_HISTORY_ANCHORING.md)

---

## Phase 3 — Concurrency & Performance

### AO-07 Configurable Concurrency Management
Implement a task queue and concurrency pool in Orchestrator.
→ [AO-07_CONCURRENCY_MANAGEMENT.md](./TASKS/AO-07_CONCURRENCY_MANAGEMENT.md)

### AO-08 Dashboard Health View
Show real-time status of all child processes in the dashboard.
→ [AO-08_DASHBOARD_HEALTH.md](./TASKS/AO-08_DASHBOARD_HEALTH.md)

---

## Phase 4 — Monitoring & UI

### AO-09 Live IPC Log Streamer
Implement live internal bus traffic monitoring.
→ [AO-09_IPC_LOG_STREAMER.md](./TASKS/AO-09_IPC_LOG_STREAMER.md)

### AO-10 Cron management UI
Manage AI query cron jobs from the UI.
→ [AO-10_CRON_MGMT_UI.md](./TASKS/AO-10_CRON_MGMT_UI.md)

---

## Phase 5 — Verification

### AO-11 Test: Auto-Restart logic
Automated tests for process recovery.
→ [AO-11_TEST_AUTO_RESTART.md](./TASKS/AO-11_TEST_AUTO_RESTART.md)

### AO-12 Test: Cron-to-AI E2E
Integration test for autonomous query execution.
→ [AO-12_TEST_CRON_AI_FLOW.md](./TASKS/AO-12_TEST_CRON_AI_FLOW.md)

### AO-13 Final Verification Walkthrough
Manual E2E check of all features.
→ [AO-13_E2E_VERIFICATION.md](./TASKS/AO-13_E2E_VERIFICATION.md)
