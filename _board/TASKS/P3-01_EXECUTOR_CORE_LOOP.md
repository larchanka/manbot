# Task: P3-01 Implement Executor Agent core loop

## Description
Build the core engine that traverses the capability graph (DAG) and orchestrates the execution of individual nodes in the correct order based on their dependencies.

## Requirements
- Create `src/agents/executor-agent.ts`.
- Implement a topological sort or a depth-first/breadth-first traversal that respects dependencies.
- Implement the main execution loop:
  - Identify ready nodes (all dependencies satisfied).
  - Dispatch nodes to their respective services/agents.
  - Wait for results.
  - Mark nodes as completed and record results in Task Memory.
- Handle node failures and propagate status to the task level.

## Definition of Done
- Executor correctly identifies the execution order for a multi-node DAG.
- Nodes are executed sequentially or in parallel as appropriate for their dependencies.
- Final task result is aggregated from node outputs.
