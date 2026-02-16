# Task: P1-05 Implement Task Memory Service

## Description
Establish the persistence layer for task lifecycle and execution states using SQLite. This service will manage all data related to task DAGs and node results.

## Requirements
- Create `src/services/task-memory.ts`.
- Use `better-sqlite3` for performance and simplicity.
- Implement the following tables: `tasks`, `task_nodes`, `task_edges`, `task_node_results`, `task_reflections`, `task_events`.
- Provide methods to:
  - Create a new task and its DAG.
  - Update node status (pending -> running -> completed/failed).
  - Store node results and reflections.
  - Retrieve task history and current state.

## Definition of Done
- SQLite database file is created.
- All specified tables exist.
- Service correctly handles creating a task and updating its status via the messaging protocol.
