# Task: P3-06 Build Core Orchestrator

## Description
Develop the central supervisor process that manages the lifecycle of all agents and services, mediates communication, and handles system-wide errors.

## Requirements
- Create `src/core/orchestrator.ts`.
- Implement process spawning and pipe management for all sub-processes (Planner, Executor, Critic, Services).
- Orchestrate the high-level task flow:
  - Telegram Input -> Planner -> Task Memory -> Executor -> Telegram Output.
- Implement heartbeats or health checks for sub-processes.
- Handle process crashes and restarts gracefully.

## Definition of Done
- `Core Orchestrator` can start and communicate with all agents.
- Orchestrator correctly routes a message through the entire agent pipeline.
- All communication is logged via the Logger Service.
