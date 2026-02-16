# Task: P2-05 Validate DAG logic

## Description
Implement algorithmic checks to ensure that the plan produced by the Planner Agent is a valid Directed Acyclic Graph (DAG) before it reaches the Executor.

## Requirements
- Implement a `validateGraph(dag)` utility in `src/shared/graph-utils.ts`.
- Check for circular dependencies (cycles).
- Verify that every `dependsOn` reference in a node corresponds to a valid node ID in the same graph.
- Ensure there is at least one "start" node (node with no dependencies).

## Definition of Done
- `validateGraph` function correctly identifies cyclic graphs.
- `validateGraph` correctly identifies orphaned dependency references.
- Planner Agent uses this tool to self-validate before emitting a response.
