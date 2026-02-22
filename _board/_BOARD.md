# My Project Board

## To Do

### AO-01 Standardize BaseProcess Lifecycle
  - tags: [todo, infra, core]
  - defaultExpanded: true
    ```md
    Add health checks, heartbeats, and standardized status reporting to BaseProcess.
    Source: _board/TASKS/AO-01_BASE_PROCESS_LIFECYCLE.md
    ```

### AO-02 Implement Process Supervisor
  - tags: [todo, orchestrator, core]
  - defaultExpanded: false
    ```md
    Implement monitoring and auto-restart logic for child processes in Orchestrator.
    Source: _board/TASKS/AO-02_PROCESS_SUPERVISOR.md
    ```

### AO-03 CLI Interactive Mode
  - tags: [todo, shared, devtools]
  - defaultExpanded: false
    ```md
    Support --interactive flag for manual service testing via stdin.
    Source: _board/TASKS/AO-03_CLI_INTERACTIVE_MODE.md
    ```

### AO-04 Standalone Router Service
  - tags: [todo, service, bus]
  - defaultExpanded: false
    ```md
    Create a lightweight dedicated process for message routing.
    Source: _board/TASKS/AO-04_ROUTER_SERVICE.md
    ```

### AO-05 Integrate Router in Orchestrator
  - tags: [todo, orchestrator, bus]
  - defaultExpanded: false
    ```md
    Refactor Orchestrator to use the Router for IPC distribution.
    Source: _board/TASKS/AO-05_INTEGRATE_ROUTER.md
    ```

### AO-06 Dashboard Process Health Monitoring
  - tags: [todo, dashboard, admin]
  - defaultExpanded: false
    ```md
    Extend UI to show status, restarts, and metrics for all child processes.
    Source: _board/TASKS/AO-06_DASHBOARD_HEALTH.md
    ```

### AO-07 Real-time IPC Log Viewer
  - tags: [todo, dashboard, debug]
  - defaultExpanded: false
    ```md
    Add a live log streaming interface to dashboard for IPC debugging.
    Source: _board/TASKS/AO-07_IPC_LOG_VIEWER.md
    ```

### AO-08 SQLite Schema Update for Cron
  - tags: [todo, services, database]
  - defaultExpanded: false
    ```md
    Add ai_query task type support to the cron database.
    Source: _board/TASKS/AO-08_CRON_SCHEMA_UPDATE.md
    ```

### AO-09 CronManager AI Query Support
  - tags: [todo, services, cron]
  - defaultExpanded: false
    ```md
    Implement event.cron.ai_query emission for scheduled AI tasks.
    Source: _board/TASKS/AO-09_CRON_AI_QUERY.md
    ```

### AO-10 Orchestrator Synthetic Task Pipeline
  - tags: [todo, orchestrator, ai]
  - defaultExpanded: false
    ```md
    Connect cron AI events to the full agent task pipeline.
    Source: _board/TASKS/AO-10_SYNTHETIC_TASK_PIPELINE.md
    ```

### AO-11 Cron Job Management UI
  - tags: [todo, dashboard, cron]
  - defaultExpanded: false
    ```md
    Add UI section to manage scheduled AI queries.
    Source: _board/TASKS/AO-11_CRON_MGMT_UI.md
    ```

### AO-12 Test: Supervisor Auto-Restart
  - tags: [todo, testing, qa]
  - defaultExpanded: false
    ```md
    Automated verification of process restart capability.
    Source: _board/TASKS/AO-12_TEST_AUTO_RESTART.md
    ```

### AO-13 Test: Cron-Driven AI Task
  - tags: [todo, testing, integration]
  - defaultExpanded: false
    ```md
    Verify full flow from cron trigger to autonomous AI execution.
    Source: _board/TASKS/AO-13_TEST_CRON_AI_FLOW.md
    ```

### AO-14 E2E Verification
  - tags: [todo, testing, e2e]
  - defaultExpanded: false
    ```md
    Final manual verification of the new architecture and features.
    Source: _board/TASKS/AO-14_E2E_VERIFICATION.md
    ```

## In Progress

## Done
*(Previous tasks moved to archive or deleted as per request)*
