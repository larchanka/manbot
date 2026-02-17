# Task: P4-06 Cron Manager

## Description
Add a service for managing scheduled background tasks, such as periodic maintenance, database optimization, or recurring AI actions.

## Requirements
- Create `src/services/cron-manager.ts`.
- Use `node-cron` for scheduling.
- Implement a dynamic schedule registry stored in SQLite (Structured Memory).
- Enable the Orchestrator to trigger generic platform tasks on a schedule.

## Definition of Done
- Tasks are executed at the specified intervals.
- Success and failure of cron jobs are logged via the Logger Service.
