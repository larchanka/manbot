# Architecture Overhaul: Process Isolation & Cron-Driven AI

This plan describes the transition to an "Advanced" architecture where all components are managed by a dedicated Supervisor, communication is routed via a formalized Message Bus, and Cron jobs can trigger full AI task pipelines.

## Goals
- **Fault Tolerance**: Standardize process lifecycle and implement auto-restart.
- **Observability**: formalized IPC routing and real-time dashboard monitoring.
- **Autonomous Action**: Enable scheduled AI queries (Synthetic User Input).

## Phase 1: Infrastructure & Supervision (AO-01 to AO-03)
We will enhance `BaseProcess` to support heartbeats and health reporting, then implement a Supervisor role in the Orchestrator to monitor and restart crashed child processes.

## Phase 2: Router & Message Bus (AO-04 to AO-05)
Introduce a dedicated `Router` process to handle message distribution, decoupling the Orchestrator's supervision logic from its routing logic.

## Phase 3: Advanced Cron AI Queries (AO-08 to AO-10)
Extend the Cron system to support `ai_query` tasks that feed directly into the Planner, allowing the agent to perform scheduled research or maintenance autonomously.

## Phase 4: Monitoring & Control (AO-06, AO-07, AO-11)
Upgrade the Dashboard to provide a "Mission Control" experience, including process metrics, real-time IPC logs, and cron management.

## Phase 5: Verification (AO-12 to AO-14)
Comprehensive testing of the new supervisor patterns and the end-to-end cron-to-ai flow.
