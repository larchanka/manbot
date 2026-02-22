# 📋 Tasks — Architecture Overhaul (AO)

All tasks are prefixed `AO-` (Architecture Overhaul). They are ordered by implementation dependency.

---

## Phase 1 — Infrastructure & Supervision

### AO-01 Standardize BaseProcess Lifecycle
**File**: `src/shared/base-process.ts`
Add health checks, heartbeats, and standardized status reporting.
→ [AO-01_BASE_PROCESS_LIFECYCLE.md](./TASKS/AO-01_BASE_PROCESS_LIFECYCLE.md)

### AO-02 Implement Process Supervisor
**File**: `src/core/orchestrator.ts`
Implement monitoring and auto-restart logic for child processes.
→ [AO-02_PROCESS_SUPERVISOR.md](./TASKS/AO-02_PROCESS_SUPERVISOR.md)

### AO-03 CLI Interactive Mode
**File**: `src/shared/base-process.ts`
Support `--interactive` mode to allow manual stdin/stdout testing of any service.
→ [AO-03_CLI_INTERACTIVE_MODE.md](./TASKS/AO-03_CLI_INTERACTIVE_MODE.md)

---

## Phase 2 — Message Bus & Router

### AO-04 Standalone Router Service
**File**: `src/core/router-service.ts`
Create a lightweight dedicated process for message routing.
→ [AO-04_ROUTER_SERVICE.md](./TASKS/AO-04_ROUTER_SERVICE.md)

### AO-05 Integrate Router in Orchestrator
**File**: `src/core/orchestrator.ts`
Refactor Orchestrator to use the Router for IPC distribution.
→ [AO-05_INTEGRATE_ROUTER.md](./TASKS/AO-05_INTEGRATE_ROUTER.md)

---

## Phase 3 — Cron-Driven AI Queries

### AO-08 SQLite Schema Update for Cron
**File**: `src/services/cron-manager.ts`
Add `ai_query` task type support to the database and types.
→ [AO-08_CRON_SCHEMA_UPDATE.md](./TASKS/AO-08_CRON_SCHEMA_UPDATE.md)

### AO-09 CronManager AI Query Support
**File**: `src/services/cron-manager.ts`
Implement `event.cron.ai_query` emission when scheduled query fires.
→ [AO-09_CRON_AI_QUERY.md](./TASKS/AO-09_CRON_AI_QUERY.md)

### AO-10 Orchestrator Synthetic Task Pipeline
**File**: `src/core/orchestrator.ts`
Implement `handleCronAiQuery` to trigger full AI task pipeline from cron events.
→ [AO-10_SYNTHETIC_TASK_PIPELINE.md](./TASKS/AO-10_SYNTHETIC_TASK_PIPELINE.md)

---

## Phase 4 — Monitoring & UI

### AO-06 Dashboard Process Health Monitoring
**File**: `src/services/dashboard-service.ts`
Extend UI to show status, restarts, and metrics for all child processes.
→ [AO-06_DASHBOARD_HEALTH.md](./TASKS/AO-06_DASHBOARD_HEALTH.md)

### AO-07 Real-time IPC Log Viewer
**File**: `src/services/dashboard-service.ts`
Add a live log streaming interface to view cross-process communication.
→ [AO-07_IPC_LOG_VIEWER.md](./TASKS/AO-07_IPC_LOG_VIEWER.md)

### AO-11 Cron Job Management UI
**File**: `src/services/dashboard-service.ts`
Add UI section to list, add, and manage scheduled AI queries.
→ [AO-11_CRON_MGMT_UI.md](./TASKS/AO-11_CRON_MGMT_UI.md)

---

## Phase 5 — Verification

### AO-12 Test: Supervisor Auto-Restart
**File**: `src/tests/supervisor.test.ts`
Verify that killing a process triggers an automatic restart by the supervisor.
→ [AO-12_TEST_AUTO_RESTART.md](./TASKS/AO-12_TEST_AUTO_RESTART.md)

### AO-13 Test: Cron-Driven AI Task
**File**: `src/tests/cron-ai.test.ts`
Verify the full flow from cron trigger to task completion and Telegram notification.
→ [AO-13_TEST_CRON_AI_FLOW.md](./TASKS/AO-13_TEST_CRON_AI_FLOW.md)

### AO-14 E2E Verification
**File**: Manual
Final validation of all "Advanced Architecture" features.
→ [AO-14_E2E_VERIFICATION.md](./TASKS/AO-14_E2E_VERIFICATION.md)
